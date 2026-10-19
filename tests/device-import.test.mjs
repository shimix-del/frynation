import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepare } from '../ops/prepare-device-import.mjs';

const directory = await mkdtemp(join(tmpdir(), 'nf-import-test-'));
const fixture = {
  format: 'nanifrys-device-backup-v1', origin: 'https://nanifrys.com', exportedAt: '2026-01-01T00:00:00Z',
  records: {
    nanifrys_standalone_branches: JSON.stringify([{ id: 'b1', name: "Shop ' & café", code: 'TEST' }]),
    nanifrys_standalone_users: JSON.stringify([{ id: 'u1', branchId: 'b1', name: 'Test', email: 'test@example.invalid', role: 'CASHIER', pinCode: 'test-pin' }]),
    nanifrys_standalone_categories: JSON.stringify([{ id: 'c1', name: 'Dishes', code: 'D' }]),
    nanifrys_standalone_menu: JSON.stringify([{ id: 'm1', categoryId: 'c1', name: 'Dish', basePrice: 100 }]),
    nanifrys_standalone_orders: JSON.stringify([{ id: 'o1', orderNumber: 'TEST-1', branchId: 'b1', cashierId: 'u1', subtotal: 100, totalAmount: 100, items: [{ menuItemId: 'm1', itemName: 'Dish', quantity: 1, unitPrice: 100, totalPrice: 100 }], payments: [{ amount: 100, paymentMethod: 'CASH' }] }]),
  },
};
try {
  const first = join(directory, 'first.json');
  const second = join(directory, 'second.json');
  await writeFile(first, JSON.stringify(fixture));
  const once = await prepare([first]);
  const twice = await prepare([first, first]);
  assert.deepEqual(once.report.counts, twice.report.counts, 'repeat device exports produce no duplicate rows');
  assert.equal(once.sql, twice.sql, 'generated nested IDs remain stable');
  assert.equal(once.report.counts.OrderItem, 1);
  assert.equal(once.report.counts.Payment, 1);
  assert.ok(once.sql.includes('START TRANSACTION;') && once.sql.includes('COMMIT;'));
  assert.ok(once.sql.includes('CHECK (`ok` = 1)'));
  assert.ok(!/\b(?:DELETE|TRUNCATE|REPLACE|UPDATE)\b/.test(once.sql), 'migration cannot delete or overwrite existing rows');
  assert.ok(!once.sql.includes("Shop ' & café"), 'string values use UTF-8 hex SQL literals');
  const conflict = structuredClone(fixture);
  const changed = JSON.parse(conflict.records.nanifrys_standalone_orders);
  changed[0].totalAmount = 150;
  conflict.records.nanifrys_standalone_orders = JSON.stringify(changed);
  await writeFile(second, JSON.stringify(conflict));
  await assert.rejects(prepare([first, second]), /Conflicting Order ID/);
  changed[0].cashierId = 'missing-user';
  conflict.records.nanifrys_standalone_orders = JSON.stringify(changed);
  await writeFile(second, JSON.stringify(conflict));
  await assert.rejects(prepare([second]), /Unresolved Order.cashierId/);
  conflict.records.nanifrys_pos_offline_orders = '[{"id":"pending"}]';
  await writeFile(second, JSON.stringify(conflict));
  await assert.rejects(prepare([second]), /Unmapped device store/);
  console.log('PASS: stable import IDs, repeated-export deduplication, conflict rejection, foreign keys, SQL escaping, and unmapped stores.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
