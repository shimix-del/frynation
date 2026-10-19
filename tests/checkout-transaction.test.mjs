import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from '../server/node_modules/typescript/lib/typescript.js';

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let failAt = null;
let state;
let transactions;
globalThis.__checkoutDb = {
  async $transaction(work) {
    transactions++;
    const staged = structuredClone(state);
    const tx = {
      staged,
      shift: {
        findFirst: async () => ({ id: 'test-shift' }),
        update: async ({ data }) => { staged.cash += data.totalCashSales.increment; },
      },
      order: {
        create: async ({ data }) => {
          const order = { ...data, id: 'test-order', items: data.items.create };
          staged.orders.push(order);
          return order;
        },
        findUnique: async () => ({ ...staged.orders[0], payments: staged.payments }),
      },
      payment: {
        create: async ({ data }) => {
          if (failAt === 'payment') throw new Error('Injected payment failure');
          staged.payments.push(data);
        },
      },
    };
    globalThis.__checkoutTx = tx;
    const result = await work(tx);
    state = staged;
    return result;
  },
};
const express = moduleUrl(`export const Router = () => ({ get(){}, patch(){}, delete(){}, post(path,...handlers){ globalThis.__checkoutHandler = handlers.at(-1); } });`);
const database = moduleUrl('export default globalThis.__checkoutDb;');
const authentication = moduleUrl('export const authenticateToken = () => {};');
globalThis.__deductCheckoutStock = async (_branch, _items, tx) => {
  assert.equal(tx, globalThis.__checkoutTx, 'stock changes use the same transaction as the order');
  tx.staged.stock--;
  if (failAt === 'stock') throw new Error('Injected stock failure');
  return { warnings: [] };
};
const stock = moduleUrl('export const deductStockForOrder = (...args) => globalThis.__deductCheckoutStock(...args); export const restoreStockForOrder = () => {};');
const source = await readFile(new URL('../server/src/routes/orders.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const transformed = outputText.replaceAll("'express'", JSON.stringify(express)).replaceAll("'../prisma.js'", JSON.stringify(database)).replaceAll("'../middleware/auth.js'", JSON.stringify(authentication)).replaceAll("'../services/stockDeductionService.js'", JSON.stringify(stock));
const originalError = console.error;
try {
  await import(moduleUrl(transformed));
  for (const failure of [null, 'payment', 'stock']) {
    failAt = failure;
    state = { orders: [], payments: [], stock: 10, cash: 0 };
    transactions = 0;
    const req = { user: { id: 'test-cashier', branchId: 'test-branch' }, body: { items: [{ menuItemId: 'test-dish', itemName: 'Test dish', quantity: 1, unitPrice: 100 }], payments: [{ amount: 100, paymentMethod: 'CASH' }] } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    console.error = () => {};
    await globalThis.__checkoutHandler(req, res);
    console.error = originalError;
    assert.equal(transactions, 1);
    if (failure) {
      assert.equal(res.statusCode, 500);
      assert.deepEqual(state, { orders: [], payments: [], stock: 10, cash: 0 }, `${failure} failure rolls back the entire checkout`);
    } else {
      assert.equal(res.statusCode, 201);
      assert.equal(state.orders.length, 1);
      assert.equal(state.payments.length, 1);
      assert.equal(state.stock, 9);
      assert.equal(state.cash, 100);
      assert.equal(res.body.order.payments.length, 1);
    }
  }
  const stockSource = await readFile(new URL('../server/src/services/stockDeductionService.ts', import.meta.url), 'utf8');
  const stockModule = ts.transpileModule(stockSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replaceAll("'../prisma.js'", JSON.stringify(moduleUrl('export default {};')));
  const { deductStockForOrder } = await import(moduleUrl(stockModule));
  let quantity = 10;
  let decrements = 0;
  const stockRow = { id: 'stock-test', name: 'Test dish', branchId: 'test-branch', currentStock: 10, unit: 'piece', minStockAlert: 0 };
  const transaction = {
    menuItemRecipe: { findMany: async () => [] },
    stockItem: {
      // Deliberately stale simultaneous reads must not overwrite one another.
      findFirst: async () => ({ ...stockRow }),
      findUniqueOrThrow: async () => ({ ...stockRow, currentStock: quantity }),
    },
    async $executeRaw(strings, amount, id) {
      assert.ok(strings.join('?').includes('GREATEST(0, currentStock - ?'));
      assert.equal(id, stockRow.id);
      quantity = Math.max(0, quantity - amount);
      decrements++;
      return 1;
    },
  };
  await Promise.all([1, 1].map(amount => deductStockForOrder('test-branch', [{ menuItemId: 'test-dish', itemName: 'Test dish', quantity: amount }], transaction)));
  assert.equal(decrements, 2);
  assert.equal(quantity, 8, 'concurrent deductions both reach SQL rather than writing the same stale stock value');
  console.log('PASS: checkout commits once; payment and stock failures roll back order, payment, stock, and shift totals together.');
} finally {
  console.error = originalError;
  for (const key of ['__checkoutDb', '__checkoutTx', '__checkoutHandler', '__deductCheckoutStock']) delete globalThis[key];
}
