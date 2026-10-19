import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from '../client/node_modules/typescript/lib/typescript.js';

test('production API confirms server responses without writing browser fallback records', async () => {
  const source = await readFile(new URL('../client/src/services/api.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source.replaceAll('import.meta.env', 'globalThis.__apiTestEnv'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const original = Object.fromEntries(['window', 'localStorage', 'fetch', 'navigator', '__apiTestEnv'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const records = new Map([
    ['nanifrys_custom_api_url', 'http://old-server:5000/api'],
    ['nanifrys_standalone_orders', '[{"id":"existing-sale"}]'],
  ]);
  const before = [...records];
  let calls = [];
  try {
    globalThis.__apiTestEnv = { DEV: false, VITE_ENABLE_DEMO_FALLBACK: 'true' };
    globalThis.window = { location: { protocol: 'https:', hostname: 'nanifrys.com' } };
    globalThis.localStorage = {
      getItem: key => records.get(key) ?? null,
      setItem: () => { throw new Error('Production must not write demo records'); },
      removeItem: () => { throw new Error('Production must preserve existing records'); },
    };
    const { api, ApiError, getApiBaseUrl, getServiceOnline } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
    assert.equal(getApiBaseUrl(), '/api', 'stale per-browser overrides cannot reroute production');
    globalThis.__apiTestEnv.VITE_API_BASE_URL = 'https://api.example.test/api/';
    assert.equal(getApiBaseUrl(), 'https://api.example.test/api');
    delete globalThis.__apiTestEnv.VITE_API_BASE_URL;

    globalThis.fetch = async (url, options) => {
      calls.push([url, options.method]);
      return new Response(JSON.stringify([{ id: 'sql-sale' }]), { headers: { 'Content-Type': 'application/json' } });
    };
    assert.deepEqual(await api.getOrders(), [{ id: 'sql-sale' }]);
    assert.equal(getServiceOnline(), true, 'successful SQL API replies establish connectivity');
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    assert.equal(getServiceOnline(), true, 'a browser offline hint cannot contradict a confirmed SQL reply');
    assert.equal(calls[0][0], '/api/orders?');

    let finishRead;
    let readCalls = 0;
    globalThis.fetch = () => {
      readCalls++;
      return new Promise(resolve => { finishRead = resolve; });
    };
    const firstRead = api.getCurrentShift({ branchId: 'test-branch' });
    const secondRead = api.getCurrentShift({ branchId: 'test-branch' });
    assert.equal(readCalls, 1, 'navbar and sales screen share an in-flight shift read');
    finishRead(new Response('{"activeShift":null}', { headers: { 'Content-Type': 'application/json' } }));
    assert.deepEqual(await firstRead, await secondRead);
    const freshRead = api.getCurrentShift({ branchId: 'test-branch' });
    assert.equal(readCalls, 2, 'later reads still query SQL for fresh state');
    finishRead(new Response('{"activeShift":null}', { headers: { 'Content-Type': 'application/json' } }));
    await freshRead;

    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.createOrder({ items: [] }), /Failed to fetch/);
    await assert.rejects(api.login({ pinCode: '0000' }), /Failed to fetch/);
    assert.equal(getServiceOnline(), false, 'network failure clears confirmed connectivity');

    globalThis.fetch = async () => new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(api.createOrder({ items: [] }), /not confirmed/);

    globalThis.fetch = async () => new Response('{"error":"Invalid PIN"}', { status: 401, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(api.login({ pinCode: '0000' }), error => error instanceof ApiError && error.status === 401);

    // A timed-out write is uncertain, never automatically repeated or saved locally.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let expire;
    let writeCalls = 0;
    try {
      globalThis.setTimeout = callback => { expire = callback; return 1; };
      globalThis.clearTimeout = () => {};
      globalThis.fetch = (_url, options) => {
        writeCalls++;
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      };
      const pendingWrite = api.createOrder({ items: [] });
      expire();
      await assert.rejects(pendingWrite, error => error instanceof ApiError && error.status === 503 && /check saved records/.test(error.message));
      assert.equal(writeCalls, 1);
    } finally {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    }
    assert.deepEqual([...records], before, 'existing browser records survive all requests');
  } finally {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
