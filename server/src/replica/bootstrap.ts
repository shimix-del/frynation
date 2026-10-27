import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { delegate, digest, hydrate, models, rowKey, snapshot, protocolVersion, schemaFingerprint } from './protocol.js';
import { initializeReplica, readState, writeState } from './state.js';

export async function bootstrapShop() {
  if (process.env.SITE_MODE !== 'shop') throw new Error('Bootstrap is for the shop computer only');
  await initializeReplica();
  if (await readState('enrolled')) throw new Error('Already paired; refusing to replace local data');
  let populated = false;
  for (const model of models) if (await delegate(prisma, model).count()) populated = true;
  const staged = await readState('staged-base');
  if (populated && !staged?.fingerprint) throw new Error('Local database is not a verified staged base; reconciliation required');
  const url = process.env.REPLICA_CLOUD_URL || '';
  const key = process.env.REPLICA_SECRET || '';
  if (!url.startsWith('https://') || key.length < 48) throw new Error('Configure private cloud pairing first');
  const response = await fetch(url.replace(/\/$/, '') + '/replica/snapshot', {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60000), redirect: 'error',
  });
  if (!response.ok) throw new Error('Cloud has not been prepared for shop ownership; no data imported');
  const result = await response.json() as any;
  if (result.version !== protocolVersion || result.schemaFingerprint !== schemaFingerprint || result.shopId !== process.env.REPLICA_SHOP_ID || digest(result.rows) !== result.fingerprint) throw new Error('Snapshot schema or identity validation failed');
  if (populated) {
    const local = await prisma.$transaction(tx => snapshot(tx), { timeout: 60000, isolationLevel: 'RepeatableRead' });
    if (digest(local) !== staged.fingerprint || (result.fingerprint !== staged.fingerprint && process.env.REPLICA_REFRESH_STAGED_BASE !== 'true')) {
      throw new Error('The staged base has changed or is older than the cloud. Refresh the base before activation; no records replaced.');
    }
    // A reviewed, unchanged local base can be advanced to the latest cloud data.
    // Never discard a local record that is absent from that fresh snapshot.
    if (models.some(model=>local[model].some(row=>!result.rows[model].some((r:any)=>r.id===row.id)))) throw new Error('Remote removals require reviewed reconciliation; local data retained');
  }
  // Salted PIN hashes allow completely local login without retaining plain PINs.
  const imported = structuredClone(result.rows);
  for (const user of imported.User) if (!/^\$2[aby]\$/.test(user.pinCode)) user.pinCode = await bcrypt.hash(user.pinCode, 12);
  await prisma.$transaction(async tx => {
    for (const model of models) for (const row of imported[model]) {
      if (!populated) await delegate(tx, model).create({ data: hydrate(model, row) });
      else await delegate(tx, model).upsert({ where: { id: row.id }, create: hydrate(model,row), update: hydrate(model,row) });
      // Baseline is the exact cloud row; locally hashed PINs sync as changes.
      const original = result.rows[model].find((r: any) => r.id === row.id);
      await writeState(rowKey(model, row.id), { hash: digest(original),base:original }, tx);
    }
    await writeState('enrolled', { at: new Date().toISOString(), fingerprint: result.fingerprint }, tx);
  }, { timeout: 120000 });
  console.log('Fresh cloud data imported transactionally; local login and automatic sync are ready.');
}
if (require.main === module) bootstrapShop().catch(() => { console.error('Pairing did not complete. Existing local data was preserved; check cloud configuration and private logs.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
