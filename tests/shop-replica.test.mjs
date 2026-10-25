import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../server/node_modules/@prisma/client');
const bcrypt = require('../server/node_modules/bcryptjs');
const root = path.resolve(import.meta.dirname, '..');
const stamp = Date.now();
const shopName = `nanifrys_test_${stamp}_shop`, cloudName = `nanifrys_test_${stamp}_cloud`;
const secret = randomBytes(48).toString('hex');
const url = name => `mysql://root@127.0.0.1:3306/${name}?connection_limit=3`;
process.env.DATABASE_URL = url(shopName);
process.env.SITE_MODE = 'shop';
process.env.REPLICA_SECRET = secret;
process.env.REPLICA_SHOP_ID = 'test-shop';
process.env.REPLICA_CLOUD_URL = 'https://cloud.test/api';
const admin = new PrismaClient({ datasourceUrl: url('mysql') });
for (const database of [shopName, cloudName]) {
  await admin.$executeRawUnsafe(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const schema = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], {
    cwd: path.join(root, 'server'), env: { ...process.env, DATABASE_URL: url(database) }, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(schema.status, 0, 'isolated schema creation');
}
const cloud = new PrismaClient({ datasourceUrl: url(cloudName) });
const prisma = require('../server/dist/prisma.js').default;
const { initializeReplica, writeState, readState } = require('../server/dist/replica/state.js');
const { snapshot, digest, rowKey } = require('../server/dist/replica/protocol.js');
const { syncOnce, backupNow, systemStatus } = require('../server/dist/replica/worker.js');
const { bootstrapShop } = require('../server/dist/replica/bootstrap.js');
await initializeReplica();
await cloud.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS NaniReplicaState (id VARCHAR(191) PRIMARY KEY, body LONGTEXT NOT NULL) ENGINE=InnoDB');
await writeState('receiver-lock', {}, cloud);
const pin = String(1000 + Math.floor(Math.random() * 9000));
for (const db of [prisma, cloud]) {
  await db.branch.create({ data: { id: 'test-branch', code: 'TEST', name: 'Isolated verification shop' } });
}
const branch = await cloud.branch.findUnique({ where: { id: 'test-branch' } });
await prisma.branch.update({ where: { id: branch.id }, data: branch });
const owner = await prisma.user.create({ data: { id: 'test-owner', name: 'Test Owner', email: 'test@invalid.example', role: 'OWNER', branchId: branch.id, pinCode: await bcrypt.hash(pin, 10), passwordHash: '!disabled!' } });
await cloud.user.create({ data: owner });
const category = await prisma.category.create({ data: { id: 'test-category', code: 'TEST', name: 'Verification menu' } });
await cloud.category.create({ data: category });
const dish = await prisma.menuItem.create({ data: { id: 'test-dish', categoryId: category.id, name: 'TEST ONLY - not a real sale', basePrice: 25 } });
await cloud.menuItem.create({ data: dish });
const stock = await prisma.stockItem.create({ data: { id: 'test-stock', branchId: branch.id, name: 'Verification stock', currentStock: 100 } });
await cloud.stockItem.create({ data: stock });
const recipe = await prisma.menuItemRecipe.create({ data: { id: 'test-recipe', menuItemId: dish.id, stockItemId: stock.id, quantityRequired: 1 } });
await cloud.menuItemRecipe.create({ data: recipe });
const base = await snapshot(prisma);
for (const [model, rows] of Object.entries(base)) for (const row of rows) await writeState(rowKey(model, row.id), { hash: digest(row) });
await writeState('staged-base', { fingerprint: digest(base) });
const common = { ...process.env, NODE_ENV: 'production', JWT_SECRET: randomBytes(48).toString('hex'), BIND_HOST: '127.0.0.1' };
const processes = [];
function start(database, port, mode) {
  const child = spawn(process.execPath, ['dist/index.js'], { cwd: path.join(root, 'server'), env: { ...common, DATABASE_URL: url(database), PORT: String(port), SITE_MODE: mode, REPLICA_CLOUD_READONLY: 'true', REPLICA_CLOUD_URL: '' }, windowsHide: true, stdio: 'ignore' });
  processes.push(child); return child;
}
const actualFetch = globalThis.fetch;
try {
  start(cloudName, 15501, 'cloud'); start(shopName, 15502, 'shop');
  for (const port of [15501, 15502]) {
    let healthy = false;
    for (let n = 0; n < 40; n++) {
      try { healthy = (await actualFetch(`http://127.0.0.1:${port}/api/health`)).ok; if (healthy) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(healthy, 'isolated API startup');
  }
  globalThis.fetch = async (address, options) => actualFetch(String(address).replace('https://cloud.test', 'http://127.0.0.1:15501'), options);
  await prisma.branch.update({ where: { id: branch.id }, data: { name: 'Changed staged base' } });
  await assert.rejects(bootstrapShop(), /staged base has changed/);
  assert.equal(await readState('enrolled'), null, 'changed base cannot silently activate');
  await prisma.branch.update({ where: { id: branch.id }, data: branch });
  await bootstrapShop();
  assert.ok(await readState('enrolled'), 'matching staged data activates without re-inserting records');
  globalThis.fetch = actualFetch;
  const login = await actualFetch('http://127.0.0.1:15502/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinCode: pin }) });
  assert.equal(login.status, 200, 'salted PIN login needs no internet');
  const auth = await login.json();
  const staffPin = pin === '1111' ? '2222' : '1111';
  await prisma.user.create({ data: { id: 'offline-access-test', name: 'Access Test', email: 'access@invalid.example', role: 'CASHIER', branchId: branch.id, pinCode: await bcrypt.hash(staffPin, 10), passwordHash: '!disabled!' } });
  const staffLogin = await actualFetch('http://127.0.0.1:15502/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinCode: staffPin }) });
  assert.equal(staffLogin.status, 200);
  const staffAuth = await staffLogin.json();
  const disable = await actualFetch('http://127.0.0.1:15502/api/auth/users/offline-access-test', { method: 'PATCH', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
  assert.equal(disable.status, 200, 'owner can disable staff locally');
  const revoked = await actualFetch('http://127.0.0.1:15502/api/auth/me', { headers: { Authorization: `Bearer ${staffAuth.token}` } });
  assert.equal(revoked.status, 401, 'disabled staff loses existing access without internet');
  const me = await actualFetch('http://127.0.0.1:15502/api/auth/me', { headers: { Authorization: `Bearer ${auth.token}` } });
  assert.ok(!Object.hasOwn(await me.json(), 'pinCode'), 'no PIN returned');
  const blocked = await actualFetch('http://127.0.0.1:15501/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(blocked.status, 409, 'cloud rejects ordinary writes');
  const sale = await actualFetch('http://127.0.0.1:15502/api/orders', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ branchId: branch.id, orderType: 'TAKEAWAY', customerName: 'ISOLATED OFFLINE VERIFICATION', items: [{ menuItemId: dish.id, itemName: dish.name, quantity: 1, unitPrice: 25 }], payments: [{ amount: 25, paymentMethod: 'CASH' }] }) });
  assert.equal(sale.status, 201, 'sale completes using local SQL alone');
  assert.equal(await prisma.payment.count(), 1);
  assert.equal((await prisma.stockItem.findUnique({ where: { id: stock.id } })).currentStock, 99);
  await prisma.branch.update({ where: { id: branch.id }, data: { name: 'Saved offline' } });
  globalThis.fetch = async () => { throw new Error('simulated internet failure'); };
  await assert.rejects(syncOnce());
  const durable = await readState('pending-batch');
  assert.ok(durable?.id, 'pending batch survives internet failure in SQL');
  const mismatched = await actualFetch('http://127.0.0.1:15501/api/replica/batch', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...durable, id: randomUUID(), schemaFingerprint: 'wrong-schema' }) });
  assert.equal(mismatched.status, 409, 'different application schemas cannot exchange data');
  assert.equal(await cloud.order.count(), 0, 'schema mismatch commits no business records');
  let loseAcknowledgement = true;
  globalThis.fetch = async (address, options) => {
    const response = await actualFetch(String(address).replace('https://cloud.test', 'http://127.0.0.1:15501'), options);
    if (loseAcknowledgement && response.ok) { loseAcknowledgement = false; throw new Error('simulated lost acknowledgement'); }
    return response;
  };
  await assert.rejects(syncOnce());
  assert.equal((await cloud.branch.findUnique({ where: { id: branch.id } })).name, 'Saved offline');
  assert.equal(await cloud.order.count(), 1);
  assert.equal(await cloud.payment.count(), 1);
  assert.equal((await cloud.stockItem.findUnique({ where: { id: stock.id } })).currentStock, 99);
  assert.equal((await readState('pending-batch')).id, durable.id);
  await syncOnce();
  assert.equal(await readState('pending-batch'), null, 'retry exact batch is acknowledged once');
  const receipts = await cloud.$queryRaw`SELECT id FROM NaniReplicaState WHERE id LIKE 'batch:%'`;
  assert.equal(receipts.length, 1);
  const received = await readState('receiver-last', cloud);
  assert.equal(received.id, durable.id, 'hosted status records the committed shop batch');
  assert.equal(await cloud.payment.count(), 1, 'lost acknowledgement retry does not duplicate payment');
  await prisma.branch.update({ where: { id: branch.id }, data: { name: 'Shop edit' } });
  await cloud.branch.update({ where: { id: branch.id }, data: { name: 'Conflicting manual cloud edit' } });
  await assert.rejects(syncOnce(), /SYNC_CONFLICT/);
  assert.equal((await cloud.branch.findUnique({ where: { id: branch.id } })).name, 'Conflicting manual cloud edit');
  assert.ok(await readState('pending-batch'), 'conflicting batch retained');
  const defaults = path.join(root, 'evidence', `backup-test-${stamp}.cnf`);
  await fs.writeFile(defaults, '[client]\nhost=127.0.0.1\nuser=root\n');
  process.env.BACKUP_DIRECTORY = path.join(root, 'evidence', `backup-test-${stamp}`);
  process.env.BACKUP_DEFAULTS_FILE = defaults;
  process.env.MYSQLDUMP_PATH = 'C:/xampp/mysql/bin/mysqldump.exe';
  process.env.LOCAL_DATABASE_NAME = shopName;
  await backupNow();
  assert.equal(systemStatus.backupState, 'saved');
  const latestBackup = await readState('last-backup');
  const report = { passed: true, shopDatabase: shopName, cloudDatabase: cloudName,
    schemaMismatchBlocked: true, stagedBaseMismatchBlocked: true, stagedBasePairingWithoutDuplicates: true, hostedReceiptStatus: true,
    offlineSaltedPinLogin: true, immediateOfflineStaffDeactivation: true, localSalePaymentAndStock: true, cloudWritesBlocked: true, durableInternetFailure: true,
    lostAcknowledgementAndDuplicateRetry: true, conflictsDoNotOverwrite: true,
    backupFile: path.join(process.env.BACKUP_DIRECTORY, latestBackup.file) };
  await fs.writeFile(path.join(root, 'evidence', 'shop-replica-test.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(root, 'evidence', 'shop-preview-private.json'), JSON.stringify({ database: shopName, pin, jwt: common.JWT_SECRET }));
  console.log(JSON.stringify(report));
} finally {
  globalThis.fetch = actualFetch;
  for (const child of processes) child.kill();
  await Promise.all([prisma.$disconnect(), cloud.$disconnect(), admin.$disconnect()]);
}
