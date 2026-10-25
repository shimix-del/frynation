import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import prisma from '../prisma.js';
import { applyChanges, digest, snapshot, protocolVersion, schemaFingerprint } from './protocol.js';
import { readState, writeState } from './state.js';

const router = Router();
router.use((req, res, next) => {
  const expected = process.env.REPLICA_SECRET || '';
  const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (process.env.SITE_MODE !== 'cloud' || process.env.REPLICA_CLOUD_READONLY !== 'true' || expected.length < 48 ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    res.status(403).json({ error: 'Replica pairing is unavailable' }); return;
  }
  next();
});
router.get('/snapshot', async (_req, res) => {
  try {
    const rows = await prisma.$transaction(tx => snapshot(tx), { timeout: 60000, isolationLevel: 'RepeatableRead' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ version: protocolVersion, schemaFingerprint, shopId: process.env.REPLICA_SHOP_ID, fingerprint: digest(rows), rows });
  } catch { res.status(503).json({ error: 'Snapshot unavailable' }); }
});
router.post('/batch', async (req, res) => {
  const batch = req.body;
  if (batch.shopId !== process.env.REPLICA_SHOP_ID || !/^[a-f0-9-]{36}$/.test(batch.id || '') || batch.version !== protocolVersion) {
    res.status(400).json({ error: 'Invalid replica identity' }); return;
  }
  if (batch.schemaFingerprint !== schemaFingerprint) { res.status(409).json({ error: 'SCHEMA_MISMATCH: update both applications before syncing' }); return; }
  try {
    const fingerprint = digest(batch);
    const result = await prisma.$transaction(async tx => {
      // Serializes multiple retries of the same batch across Passenger workers.
      await tx.$queryRaw`SELECT body FROM NaniReplicaState WHERE id='receiver-lock' FOR UPDATE`;
      const existing = await readState('batch:' + batch.id, tx);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new Error('SYNC_CONFLICT:batch');
        return existing;
      }
      await applyChanges(tx, batch.changes);
      const accepted = { id: batch.id, fingerprint, acceptedAt: new Date().toISOString() };
      await writeState('batch:' + batch.id, accepted, tx);
      await writeState('receiver-last', { ...accepted, shopId: batch.shopId, recordChanges: batch.changes.length }, tx);
      return accepted;
    }, { timeout: 30000, isolationLevel: 'Serializable' });
    res.json(result);
  } catch (error: any) {
    res.status(error.message.startsWith('SYNC_CONFLICT:') ? 409 : 422).json({ error: error.message.startsWith('SYNC_CONFLICT:') ? error.message : 'Batch rejected; no rows committed' });
  }
});
export default router;
