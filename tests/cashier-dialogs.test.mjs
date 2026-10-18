import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import { build } from '../client/node_modules/esbuild/lib/main.js';

const require = createRequire(new URL('../client/package.json', import.meta.url));
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const noop = () => {};
let cleared = 0;
let completed = 0;
let writes = 0;
globalThis.__cashierFixture = {
  auth: { user: { id: 'cashier-test', role: 'CASHIER', name: 'Test' } },
  branch: { currentBranchId: 'test', currentBranch: { name: 'Test' } },
  cart: { cartItems: [{ menuItem: { id: 'test', name: 'Dish' }, quantity: 1, unitPrice: 100, unitCost: 40 }], orderType: 'TAKEAWAY', subtotal: 100, totalAmount: 100, discountAmount: 0, clearCart: () => { cleared++; } },
  api: { createOrder: async () => { writes++; throw new Error('Saving was not confirmed; check saved records before retrying.'); } },
};
const dialogs = ['Shifts/OpenShiftModal', 'Shifts/CloseShiftModal', 'Shifts/CashMovementModal', 'Pos/PaymentModal', 'Pos/VariantModal', 'Pos/ThermalReceipt'];
const bundle = fileURLToPath(new URL('../client/node_modules/.cache/nanifrys-cashier-tests.cjs', import.meta.url));
await mkdir(fileURLToPath(new URL('../client/node_modules/.cache/', import.meta.url)), { recursive: true });
try {
  await build({
    stdin: { contents: dialogs.map(path => `export * from './src/components/${path}.tsx';`).join('\n'), resolveDir: fileURLToPath(new URL('../client/', import.meta.url)), loader: 'tsx' },
    outfile: bundle, bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react/jsx-runtime'], loader: { '.jpg': 'dataurl' },
    plugins: [{ name: 'cashier-fixtures', setup(builder) {
      builder.onResolve({ filter: /context\/(AuthContext|BranchContext|PosCartContext)/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onResolve({ filter: /services\/api$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('/api')
        ? 'export const api = globalThis.__cashierFixture.api;'
        : args.path.includes('AuthContext') ? 'export const useAuth = () => globalThis.__cashierFixture.auth;'
        : args.path.includes('BranchContext') ? 'export const useBranch = () => globalThis.__cashierFixture.branch;'
        : 'export const usePosCart = () => globalThis.__cashierFixture.cart;' }));
    } }],
  });
  const components = require(bundle);
  const order = { id: 'test', orderNumber: 'TEST', orderType: 'TAKEAWAY', items: [], payments: [], subtotal: 100, totalAmount: 100, discountAmount: 0, taxAmount: 0, createdAt: new Date().toISOString() };
  const props = { isOpen: false, onClose: noop, onShiftOpened: noop, onShiftClosed: noop, onMovementAdded: noop, onAddToCart: noop, onOrderCompleted: () => { completed++; }, item: { id: 'dish', name: 'Dish', basePrice: 100, variants: [] }, shift: { id: 'shift', openingFloat: 100, totalCashSales: 0 }, order };
  for (const path of dialogs) {
    const name = path.split('/').at(-1);
    let renderer;
    await act(async () => { renderer = create(React.createElement(components[name], props)); });
    for (let cycle = 0; cycle < 3; cycle++) {
      await act(async () => { renderer.update(React.createElement(components[name], { ...props, isOpen: true })); });
      assert.ok(renderer.toJSON(), `${name} opens`);
      await act(async () => { renderer.update(React.createElement(components[name], props)); });
      assert.equal(renderer.toJSON(), null, `${name} closes`);
    }
    await act(async () => { renderer.unmount(); });
  }
  let payment;
  await act(async () => { payment = create(React.createElement(components.PaymentModal, { ...props, isOpen: true })); });
  const submit = payment.root.findAllByType('button').find(button => button.findAllByType('span').some(span => String(span.props.children).includes('Complete & Print')));
  assert.ok(submit);
  await act(async () => { await submit.props.onClick(); });
  assert.equal(writes, 1);
  assert.equal(cleared, 0, 'failed SQL confirmation keeps the cart');
  assert.equal(completed, 0, 'failed SQL confirmation never creates a completed receipt');
  assert.ok(JSON.stringify(payment.toJSON()).includes('Saving was not confirmed'));
  await act(async () => { payment.unmount(); });
  console.log('PASS: six cashier dialogs reopen safely; failed SQL checkout retains cart and shows uncertainty.');
} finally {
  await rm(bundle, { force: true });
  delete globalThis.__cashierFixture;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
}
