import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import prisma from '../prisma.js';
import { models, snapshot, digest, rowKey, Change, protocolVersion, schemaFingerprint, applyChanges } from './protocol.js';
import { readState, writeState, deleteState } from './state.js';

export const systemStatus: any = { mode: process.env.SITE_MODE || 'hosted', lastSync: null,
  pendingChanges: null, syncState: 'not-paired', nextAttempt: null, lastBackup: null, backupState: 'not-started' };
let busy = false;
export async function backupNow() {
  const directory = process.env.BACKUP_DIRECTORY;
  const defaults = process.env.BACKUP_DEFAULTS_FILE;
  const executable = process.env.MYSQLDUMP_PATH;
  const database = process.env.LOCAL_DATABASE_NAME;
  if (!directory || !defaults || !executable || !database || !/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Backup configuration incomplete');
  await fs.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const temporary = path.join(directory, `nanifrys-${stamp}.sql.partial`);
  const final = temporary.replace(/\.partial$/, '');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, [`--defaults-extra-file=${defaults}`, '--single-transaction', '--no-tablespaces', '--triggers', '--hex-blob', `--result-file=${temporary}`, database], { windowsHide: true, stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Database backup failed')));
  });
  const contents = await fs.readFile(temporary);
  if (!contents.includes(Buffer.from('CREATE TABLE'))) throw new Error('Backup validation failed');
  await fs.rename(temporary, final);
  await fs.writeFile(final + '.sha256', createHash('sha256').update(contents).digest('hex'));
  const state = { at: new Date().toISOString(), file: path.basename(final), bytes: contents.length };
  await writeState('last-backup', state);
  systemStatus.lastBackup = state.at;
  systemStatus.backupState = 'saved';
}
export async function collectChanges(): Promise<Change[]> {
  return prisma.$transaction(async tx => {
    const rows = await snapshot(tx);
    const records: any[] = await tx.$queryRaw`SELECT id,body FROM NaniReplicaState WHERE id LIKE 'row:%'`;
    const manifest = new Map(records.map(r => [r.id, JSON.parse(r.body)]));
    const present = new Set<string>();
    const changes: Change[] = [];
    for (const model of models) for (const row of rows[model]) {
      const key = rowKey(model, row.id);
      present.add(key);
      const before = manifest.get(key)?.hash || null;
      if (digest(row) !== before) {
        const base=manifest.get(key)?.base||null;
        if(before&&!base)throw new Error('BASELINE_UPGRADE_REQUIRES_REVIEW');
        changes.push({ model, id: row.id, before, base, row });
      }
    }
    for (const key of manifest.keys()) if (!present.has(key)) {
      const [,model,...parts]=key.split(':');
      if (!models.includes(model as any) || ['ActivityLog','StockMovement'].includes(model)) throw new Error('AUDIT_DELETE_REQUIRES_REVIEW');
      changes.push({model,id:parts.join(':'),before:manifest.get(key).hash,base:manifest.get(key).base,row:null});
    }
    if (changes.length > 5000) throw new Error('BACKLOG_REQUIRES_REVIEW');
    return changes;
  }, { timeout: 30000, isolationLevel: 'RepeatableRead' });
}
let currentSync: Promise<void> | null = null;
export function syncOnce(): Promise<void> {
  if(currentSync)return currentSync;
  currentSync=performSync().finally(()=>{currentSync=null;});return currentSync;
}
async function performSync() {
  const enrolled = await readState('enrolled');
  if (!enrolled) { systemStatus.syncState = 'not-paired'; return; }
  const url = process.env.REPLICA_CLOUD_URL;
  const secret = process.env.REPLICA_SECRET;
  if (!url || !url.startsWith('https://') || !secret || secret.length < 48) throw new Error('Pairing configuration incomplete');
  const syncUrl = new URL(url);
  if (syncUrl.username || syncUrl.password) throw new Error('Invalid pairing URL');
  let pending = await readState('pending-batch');
  if (!pending?.id) {
    const changes = await collectChanges();
    systemStatus.pendingChanges = changes.length;
    pending = changes.length ? { version: protocolVersion, schemaFingerprint, id: randomUUID(), shopId: process.env.REPLICA_SHOP_ID, changes } : null;
    // The batch remains in local SQL until its exact acknowledgement is saved.
    if(pending)await writeState('pending-batch', pending);
  }
  systemStatus.pendingChanges = pending?.changes.length || 0;
  systemStatus.syncState = 'syncing';
  if(pending){
  const response = await fetch(url.replace(/\/$/, '') + '/replica/batch', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pending), signal: AbortSignal.timeout(20000), redirect: 'error',
  });
  if (!response.ok) throw new Error(response.status === 409 ? 'SYNC_CONFLICT' : 'CLOUD_UNAVAILABLE');
  const ack = await response.json() as any;
  if (ack.id !== pending.id || ack.fingerprint !== digest(pending)) throw new Error('INVALID_ACKNOWLEDGEMENT');
  await prisma.$transaction(async tx => {
    for (const c of pending.changes) {
      if(c.row===null)await deleteState(rowKey(c.model,c.id),tx);
      else await writeState(rowKey(c.model, c.id), { hash: digest(c.row),base:c.row }, tx);
    }
    await writeState('pending-batch', null, tx);
    await writeState('last-sync', { at: new Date().toISOString(), batchId: pending.id }, tx);
  }, { timeout: 30000 });
  }
  const pull=await fetch(url.replace(/\/$/,'')+'/replica/snapshot',{headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(60000),redirect:'error'});
  if(!pull.ok)throw new Error('CLOUD_UNAVAILABLE');
  const remote=await pull.json() as any;
  if(remote.version!==protocolVersion||remote.schemaFingerprint!==schemaFingerprint||remote.shopId!==process.env.REPLICA_SHOP_ID||digest(remote.rows)!==remote.fingerprint)throw new Error('INVALID_SNAPSHOT');
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT body FROM NaniReplicaState WHERE id='receiver-lock' FOR UPDATE`;
    const records:any[]=await tx.$queryRaw`SELECT id,body FROM NaniReplicaState WHERE id LIKE 'row:%'`;
    const manifest=new Map(records.map(r=>[r.id,JSON.parse(r.body)])),present=new Set<string>(),incoming:Change[]=[];
    for(const model of models)for(const row of remote.rows[model]){
      const key=rowKey(model,row.id);present.add(key);const previous=manifest.get(key);
      if(digest(row)!==previous?.hash)incoming.push({model,id:row.id,before:previous?.hash||null,base:previous?.base||null,row});
    }
    for(const [key,previous]of manifest)if(!present.has(key)){
      const [,model,...parts]=key.split(':');incoming.push({model,id:parts.join(':'),before:previous.hash,base:previous.base,row:null});
    }
    await applyChanges(tx,incoming);
    for(const model of models)for(const row of remote.rows[model])await writeState(rowKey(model,row.id),{hash:digest(row),base:row},tx);
    for(const key of manifest.keys())if(!present.has(key))await deleteState(key,tx);
    await writeState('last-sync',{at:new Date().toISOString(),batchId:pending?.id||null,direction:'two-way'},tx);
  },{timeout:60000,isolationLevel:'Serializable'});
  systemStatus.lastSync = new Date().toISOString();
  systemStatus.pendingChanges = (await collectChanges()).length;
  systemStatus.syncState = systemStatus.pendingChanges ? 'pending' : 'up-to-date';
}
export async function startShopWorker() {
  systemStatus.lastSync = (await readState('last-sync'))?.at || null;
  systemStatus.lastBackup = (await readState('last-backup'))?.at || null;
  systemStatus.backupState = systemStatus.lastBackup ? 'saved' : 'not-started';
  const last = systemStatus.lastSync ? Date.parse(systemStatus.lastSync) : NaN;
  let due = await readState('pending-batch') ? 0 : Number.isFinite(last) ? nextScheduledSync(last) : 0;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (!systemStatus.lastBackup || Date.now() - Date.parse(systemStatus.lastBackup) > 60 * 60 * 1000) {
        try { await backupNow(); } catch { systemStatus.backupState = 'failed'; }
      }
      if (await readState('enrolled')) {
        try { systemStatus.pendingChanges = (await collectChanges()).length; }
        catch { systemStatus.syncState = 'conflict-needs-owner'; return; }
      }
      if (Date.now() >= due) {
        try {
          await syncOnce();
          due = nextScheduledSync(Date.now());
        } catch (error: any) {
          systemStatus.syncState = error.message.includes('SYNC_CONFLICT') ? 'conflict-needs-owner' : 'waiting-for-connection';
          due = Date.now() + 5 * 60 * 1000;
        }
        systemStatus.nextAttempt = new Date(due).toISOString();
      }
    } finally { busy = false; }
  };
  await tick();
  setInterval(() => void tick().catch(() => { systemStatus.syncState = 'needs-attention'; }), 60000).unref();
}

// Six fixed runs a day: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 EAT.
export function nextScheduledSync(now: number): number {
  const offset=3*60*60*1000, interval=4*60*60*1000;
  return (Math.floor((now+offset)/interval)+1)*interval-offset;
}
