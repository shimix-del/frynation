import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './source-loader.mjs';

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k) };
globalThis.window = { location: { hostname: 'nanifrys.com', origin: 'https://nanifrys.com', protocol: 'https:' }, dispatchEvent: () => {} };
Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
const ids = await loadSource('client/src/utils/id.ts');
const { api, ApiError, isLocalMode, getApiBaseUrl, setAnalyticsToken } = await loadSource('client/src/services/api.ts');
await test('frontend and server agree on precisely which menu prices cashiers may select', async () => {
  const client = await loadSource('client/src/utils/menuPricing.ts');
  const server = await loadSource('server/src/services/menuPricing.ts');
  for(const [name,expected] of [['Coca-Cola','soda'],['Fanta Orange','soda'],['Krest','soda'],['Stoney','soda'],['Sprite','soda'],['Spirit','soda'],['Viazi Karai','manual'],['Chips','fixed'],['Water','fixed']]){
    assert.equal(client.menuPricing(name),expected);assert.equal(server.menuPricing(name),expected);
  }
});
await test('analytics unlock token is sent only to reports and cleared when the section locks', async () => {
  const seen=[];
  globalThis.fetch=async (url,options)=>{seen.push(options.headers);return {ok:true,json:async()=>({})};};
  setAnalyticsToken('section-token');await api.getDashboardSummary();await api.getCategories();await api.unlockAnalytics('1199');
  assert.equal(seen[0]['x-analytics-token'],'section-token');assert.equal(seen[1]['x-analytics-token'],undefined);assert.equal(seen[2]['x-analytics-token'],undefined);
  setAnalyticsToken('');await api.getDashboardSummary();assert.equal(seen[3]['x-analytics-token'],undefined);
});

await test('hosted API uses same HTTPS origin', () => assert.equal(getApiBaseUrl(), 'https://nanifrys.com/api'));
await test('HTTP rejection never switches to Local mode or authenticates locally', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'Rejected' }) });
  await assert.rejects(api.login({ email: 'owner@local.invalid', password: 'wrong' }), e => e instanceof ApiError && e.status === 401);
  assert.equal(isLocalMode(), false);
  assert.equal(memory.has('nanifrys_standalone_currentUser'), false);
});
await test('invalid server response and connection failure have distinct statuses', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => { throw Error('HTML'); } });
  await assert.rejects(api.getCategories(), e => e.status === 502);
  globalThis.fetch = async () => { throw Error('Disconnected'); };
  await assert.rejects(api.getCategories(), e => e.status === 0);
});
await test('legacy browser trading is blocked without erasing stored tickets', async () => {
  const saved=JSON.stringify([{id:'legacy-ticket',totalAmount:100}]);
  memory.set('nanifrys_standalone_orders',saved);memory.set('nanifrys_mode','local');
  await assert.rejects(api.createOrder({}),e=>e.status===409);
  assert.equal(memory.get('nanifrys_standalone_orders'),saved);memory.delete('nanifrys_mode');
});
await test('pending sales survive repeated failures and Local mode never acknowledges central synchronization', async () => {
  const syncApi = { getMe: async () => ({ id: 'cashier' }), createOrder: async () => { throw new ApiError('Rejected', 400); } };
  let local = false;
  const { offlineSync } = await loadSource('client/src/services/offlineSync.ts', { './api': { api: syncApi, isLocalMode: () => local }, '../utils/id': ids });
  offlineSync.enqueueOrder({ clientRequestId: crypto.randomUUID(), cashierId: 'cashier', shiftId: 'original-shift' });
  for (let i = 0; i < 6; i++) await offlineSync.syncPendingOrders();
  assert.equal(offlineSync.getQueue().length, 1);
  assert.equal(offlineSync.getQueue()[0].retryCount, 6);
  syncApi.createOrder = async () => ({ order: { id: 'browser-only' } });
  local = true;
  assert.equal((await offlineSync.syncPendingOrders()).synced, 0);
  assert.equal(offlineSync.getQueue().length, 1);
  local = false;
  syncApi.createOrder = async () => ({ order: { id: 'confirmed-central' } });
  assert.equal((await offlineSync.syncPendingOrders()).synced, 1);
  assert.equal(offlineSync.getQueue().length, 0);
});
await test('storage write failure never returns a confirmed queued ticket', async () => {
  const { offlineSync } = await loadSource('client/src/services/offlineSync.ts', { './api': { api, isLocalMode }, '../utils/id': ids });
  const write = localStorage.setItem;
  localStorage.setItem = () => { throw Error('Quota exceeded'); };
  assert.throws(() => offlineSync.enqueueOrder({}), /Quota/);
  localStorage.setItem = write;
});
