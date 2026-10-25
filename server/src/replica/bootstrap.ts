import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { delegate, digest, hydrate, models, rowKey } from './protocol.js';
import { initializeReplica, readState, writeState } from './state.js';

async function bootstrap() {
  if (process.env.SITE_MODE !== 'shop') throw new Error('Bootstrap is for the shop computer only');
  await initializeReplica();
  if (await readState('enrolled')) throw new Error('Already paired; refusing to replace local data');
  for (const model of models) if (await delegate(prisma, model).count()) throw new Error('Local database is not empty; reconciliation required');
  const url = process.env.REPLICA_CLOUD_URL || '';
  const key = process.env.REPLICA_SECRET || '';
  if (!url.startsWith('https://') || key.length < 48) throw new Error('Configure private cloud pairing first');
  const response = await fetch(url.replace(/\/$/, '') + '/replica/snapshot', {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60000), redirect: 'error',
  });
  if (!response.ok) throw new Error('Cloud has not been prepared for shop ownership; no data imported');
  const result = await response.json() as any;
  if (result.version !== 1 || result.shopId !== process.env.REPLICA_SHOP_ID || digest(result.rows) !== result.fingerprint) throw new Error('Snapshot validation failed');
  // Salted PIN hashes allow completely local login without retaining plain PINs.
  const imported = structuredClone(result.rows);
  for (const user of imported.User) if (!/^\$2[aby]\$/.test(user.pinCode)) user.pinCode = await bcrypt.hash(user.pinCode, 12);
  await prisma.$transaction(async tx => {
    for (const model of models) for (const row of imported[model]) {
      await delegate(tx, model).create({ data: hydrate(model, row) });
      // Baseline is the exact cloud row; locally hashed PINs sync as changes.
      const original = result.rows[model].find((r: any) => r.id === row.id);
      await writeState(rowKey(model, row.id), { hash: digest(original) }, tx);
    }
    await writeState('enrolled', { at: new Date().toISOString(), fingerprint: result.fingerprint }, tx);
  }, { timeout: 120000 });
  console.log('Fresh cloud data imported transactionally; local login and automatic sync are ready.');
}
bootstrap().catch(() => { console.error('Pairing did not complete. Existing local data was preserved; check cloud configuration and private logs.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
