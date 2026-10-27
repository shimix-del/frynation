import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadSource } from './source-loader.mjs';
const require = createRequire(import.meta.url);
const express = require('../server/node_modules/express');
const jwt = require('../server/node_modules/jsonwebtoken');
const bcrypt = require('../server/node_modules/bcryptjs');
let db, paymentFailure = false, sequence = 0;
function reset() {
  paymentFailure = false;
  db = {
    branch: [{ id: 'A', isActive: true, code: 'A', name: 'Branch A' }, { id: 'B', isActive: true }],
    user: [{ id: 'cashier', name: 'Cashier', role: 'CASHIER', branchId: 'A', isActive: true, pinCode: '1234', email: 'cashier@test' }, { id: 'owner', name: 'Owner', role: 'OWNER', branchId: null, isActive: true, pinCode: '5678' }, { id: 'manager', name: 'Manager', role: 'MANAGER', branchId: 'A', isActive: true, pinCode: '9876' }],
    shift: [{ id: 'shift-A', terminalId: 'cloud', branchId: 'A', cashierId: 'cashier', status: 'OPEN', openingFloat: 50, totalCashSales: 0, totalMpesaSales: 0, totalCardSales: 0, totalExpensesPaid: 0 }],
    menuItem: [{ id: 'chips', name: 'Chips', basePrice: 100, costPrice: 40, isAvailable: true, hasVariants: false, variants: [] }],
    menuItemRecipe: [{ id: 'recipe', menuItemId: 'chips', variantId: null, stockItemId: 'potatoes', quantityRequired: 2 }],
    stockItem: [{ id: 'potatoes', name: 'Potatoes', branchId: 'A', currentStock: 10, minStockAlert: 1, unit: 'kg' }],
    order: [], orderItem: [], payment: [], stockMovement: [], activityLog: [], expense: [], cashMovement: [], stockTransfer: [], stockAudit: [],
  };
}
function matches(row, where = {}) {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === 'OR') return v.some(w => matches(row,w));
    if (v && typeof v === 'object') {
      if ('gte' in v && row[k] < v.gte) return false;
      if ('not' in v && row[k] === v.not) return false;
      return true;
    }
    return row[k] === v;
  });
}
function hydrate(model, row) {
  if (!row) return null;
  const copy = structuredClone(row);
  if (model === 'order') {
    copy.items = db.orderItem.filter(i => i.orderId === row.id).map(i => structuredClone(i));
    copy.payments = db.payment.filter(p => p.orderId === row.id).map(p => structuredClone(p));
    copy.branch = db.branch.find(b => b.id === row.branchId);
    copy.cashier = { id: row.cashierId, name: row.cashierId };
  }
  if (model === 'menuItemRecipe') copy.stockItem = structuredClone(db.stockItem.find(s => s.id === row.stockItemId));
  if (model === 'shift') {
    copy.branch = db.branch.find(b => b.id === row.branchId);
    copy.cashier = db.user.find(u => u.id === row.cashierId);
    copy.orders = db.order.filter(o => o.shiftId === row.id).map(o => hydrate('order',o));
    copy.cashMovements = db.cashMovement.filter(m => m.shiftId === row.id);
    copy.expenses = db.expense.filter(e => e.shiftId === row.id);
  }
  return copy;
}
function update(row, data) {
  for (const [k,v] of Object.entries(data)) {
    if (v === undefined || k === 'items') continue;
    row[k] = v && typeof v === 'object' && 'increment' in v ? (row[k] || 0) + v.increment
      : v && typeof v === 'object' && 'decrement' in v ? row[k] - v.decrement : v;
  }
}
const prisma = {};
for (const model of ['branch','user','shift','menuItem','menuItemRecipe','stockItem','order','payment','stockMovement','activityLog','expense','cashMovement','stockTransfer','stockAudit']) {
  prisma[model] = {
    findMany: async ({ where = {} } = {}) => db[model].filter(r => matches(r,where)).map(r => hydrate(model,r)),
    findFirst: async ({ where = {} } = {}) => hydrate(model,db[model].find(r => matches(r,where))),
    findUnique: async ({ where }) => hydrate(model,db[model].find(r => matches(r,where))),
    findUniqueOrThrow: async ({ where }) => { const row = db[model].find(r => matches(r,where)); if (!row) throw Error('Missing record'); return hydrate(model,row); },
    count: async ({ where = {} } = {}) => db[model].filter(r => matches(r,where)).length,
    create: async ({ data }) => {
      if (model === 'payment' && paymentFailure) throw Error('Simulated database payment failure');
      if (data.clientRequestId && db[model].some(r => r.clientRequestId === data.clientRequestId)) throw Object.assign(Error('Duplicate request'),{code:'P2002'});
      const { items, ...rest } = structuredClone(data);
      const row = { id: 'id-' + ++sequence, createdAt: new Date(), ...rest }; db[model].push(row);
      if (model === 'order' && items) for (const item of items.create) db.orderItem.push({ id: 'item-' + ++sequence, orderId: row.id, ...item });
      return hydrate(model,row);
    },
    update: async ({ where, data }) => {
      const row = db[model].find(r => matches(r,where)); if (!row) throw Error('Missing record'); update(row,data);
      if (model === 'order' && data.items) { db.orderItem = db.orderItem.filter(i => i.orderId !== row.id); for (const item of data.items.create) db.orderItem.push({ id: 'item-' + ++sequence, orderId: row.id, ...item }); }
      return hydrate(model,row);
    },
    updateMany: async ({ where, data }) => { const rows = db[model].filter(r => matches(r,where)); rows.forEach(r => update(r,data)); return { count: rows.length }; },
    delete: async ({ where }) => { const row = db[model].find(r => matches(r,where)); db[model] = db[model].filter(r => r !== row); return row; },
  };
}
prisma.$transaction = async work => {
  const snapshot = structuredClone(db);
  try { return await work(prisma); } catch (e) { db = snapshot; throw e; }
};
reset();
const security = await loadSource('server/src/security.ts', { bcryptjs: bcrypt, crypto: await import('node:crypto') });
const activity = await loadSource('server/src/services/activityService.ts', { '@prisma/client': {}, '../middleware/auth.js': {}, '../security.js': security });
const tx = await loadSource('server/src/services/transactionService.ts', { '../prisma.js': prisma, '@prisma/client': {} });
const stock = await loadSource('server/src/services/stockDeductionService.ts', { '@prisma/client': {}, '../middleware/auth.js': {}, './activityService.js': activity });
const auth = await loadSource('server/src/middleware/auth.ts', { express: {}, jsonwebtoken: jwt, '../prisma.js': prisma, '../security.js': security });
const pricing = await loadSource('server/src/services/menuPricing.ts', {});
const analyticsAccess = await loadSource('server/src/middleware/analyticsAccess.ts', { express: {}, bcryptjs: bcrypt, jsonwebtoken: jwt, './auth.js': {}, '../security.js': security });
const { default: orders } = await loadSource('server/src/routes/orders.ts', { crypto: await import('node:crypto'), '../services/menuPricing.js': pricing, '../security.js': security, '../services/transactionService.js': tx, '../services/activityService.js': activity, express, '../prisma.js': prisma, '../middleware/auth.js': auth, '../services/stockDeductionService.js': stock });
const { default: authRoutes } = await loadSource('server/src/routes/auth.ts', { express, bcryptjs: bcrypt, jsonwebtoken: jwt, '../prisma.js': prisma, '../middleware/auth.js': auth, '../security.js': security, '../services/activityService.js': activity, '../replica/state.js': {readState:async()=>null} });
const { default: expenseRoutes } = await loadSource('server/src/routes/expenses.ts', { express, '../prisma.js': prisma, '../middleware/auth.js': auth, '../security.js': security, '../services/transactionService.js': tx, '../services/activityService.js': activity });
const { summarizeShift } = await loadSource('server/src/services/shiftService.ts', { '../security.js': security });
const shiftService = await loadSource('server/src/services/shiftService.ts', { '../security.js': security });
const { default: shiftRoutes } = await loadSource('server/src/routes/shifts.ts', { express, '../prisma.js': prisma, '../middleware/auth.js': auth, '../security.js': security, '../services/transactionService.js': tx, '../services/shiftService.js': shiftService, '../services/activityService.js': activity });
const { default: inventoryRoutes } = await loadSource('server/src/routes/inventory.ts', { express, '../prisma.js': prisma, '../middleware/auth.js': auth, '../security.js': security, '../services/transactionService.js': tx, '../services/activityService.js': activity });
const { default: activityRoutes } = await loadSource('server/src/routes/activity.ts', { express, '../prisma.js': prisma, '../middleware/auth.js': auth });
const app = express(); app.use(express.json()); app.use('/api/orders',orders); app.use('/api/auth',authRoutes); app.use('/api/expenses',expenseRoutes); app.use('/api/shifts',shiftRoutes); app.use('/api/inventory',inventoryRoutes); app.use('/api/activity',activityRoutes);
app.post('/api/reports/unlock',auth.authenticateToken,analyticsAccess.unlockAnalytics);
app.get('/api/reports/check',auth.authenticateToken,analyticsAccess.requireAnalyticsUnlock,(_req,res)=>res.json({ok:true}));
const server = await new Promise(resolve => { const instance = app.listen(0,'127.0.0.1', () => resolve(instance)); });
const base = `http://127.0.0.1:${server.address().port}/api`;
async function call(path, body, user = 'cashier', method = 'POST') {
  const response = await fetch(base + path, { method, headers: { 'Content-Type':'application/json', Authorization:'Bearer '+jwt.sign({id:user},security.JWT_SECRET) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
const sale = () => ({ branchId:'A',shiftId:'shift-A',cashierId:'cashier',clientRequestId:crypto.randomUUID(),items:[{menuItemId:'chips',itemName:'Chips',quantity:1,unitPrice:100}],payments:[{paymentMethod:'CASH',amount:100,cashTendered:100}] });

try {
  await test('owner analytics requires its separate PIN and a scoped owner token', async () => {
    reset();
    assert.equal((await call('/reports/check',null,'owner','GET')).status,403);
    assert.equal((await call('/reports/unlock',{pin:'1199'},'cashier')).status,403);
    assert.equal((await call('/reports/unlock',{pin:'5678'},'owner')).status,401);
    const unlocked=await call('/reports/unlock',{pin:'1199'},'owner');assert.equal(unlocked.status,200);
    const response=await fetch(base+'/reports/check',{headers:{Authorization:'Bearer '+jwt.sign({id:'owner'},security.JWT_SECRET),'x-analytics-token':unlocked.body.token}});
    assert.equal(response.status,200);
    const cashier=await fetch(base+'/reports/check',{headers:{Authorization:'Bearer '+jwt.sign({id:'cashier'},security.JWT_SECRET),'x-analytics-token':unlocked.body.token}});
    assert.equal(cashier.status,403);
    const expires=jwt.decode(unlocked.body.token);assert.equal(expires.exp-expires.iat,600);
    for(let i=0;i<3;i++)assert.equal((await call('/reports/unlock',{pin:'0000'},'owner')).status,401);
    assert.equal((await call('/reports/unlock',{pin:'1199'},'owner')).status,429);
  });
  await test('soda choices and manual Viazi Karai prices are enforced without opening other menu prices', async () => {
    for(const name of ['Coca-Cola','Fanta Orange','Krest','Stoney','Sprite','Spirit','Viazi Karai']){
      for(const value of name==='Viazi Karai'?[30,40,70]:[50,70]){
        reset();db.menuItem[0].name=name;db.menuItem[0].hasVariants=true;
        const body=sale();body.items[0].unitPrice=value;body.payments[0].amount=value;body.payments[0].cashTendered=value;
        const saved=await call('/orders',body);assert.equal(saved.status,201,JSON.stringify(saved.body));assert.equal(saved.body.order.items[0].unitPrice,value);
        assert.match(saved.body.order.orderNumber,/^NF-[A-F0-9]{16}$/);
      }
    }
    for(const [name,value] of [['Fanta',60],['Viazi Karai',0],['Viazi Karai',-20],['Chips',50]]){
      reset();db.menuItem[0].name=name;const body=sale();body.items[0].unitPrice=value;
      assert.equal((await call('/orders',body)).status,400);assert.equal(db.order.length,0);
    }
  });
  await test('M-Pesa and split payments allow no code and preserve supplied code checks', async () => {
    for(const payments of [[{paymentMethod:'MPESA',amount:100}],[{paymentMethod:'MPESA',amount:100,mpesaCode:'   '}],[{paymentMethod:'CASH',amount:40,cashTendered:50},{paymentMethod:'MPESA',amount:60}]]){
      reset();const saved=await call('/orders',{...sale(),payments});assert.equal(saved.status,201,JSON.stringify(saved.body));assert.equal(db.payment.find(p=>p.paymentMethod==='MPESA').mpesaCode,null);
    }
    reset();const withCode={...sale(),payments:[{paymentMethod:'MPESA',amount:100,mpesaCode:' abc1234567 '}]};
    assert.equal((await call('/orders',withCode)).status,201);assert.equal(db.payment[0].mpesaCode,'ABC1234567');
    assert.equal((await call('/orders',{...withCode,clientRequestId:crypto.randomUUID()})).status,400);
    reset();assert.equal((await call('/orders',{...sale(),payments:[{paymentMethod:'MPESA',amount:100,mpesaCode:'bad!'}]})).status,400);
  });
  await test('branch isolation and owner-only staff administration are enforced by API', async () => {
    reset();
    assert.equal((await call('/orders',{...sale(),branchId:'B'})).status,403);
    assert.equal((await call('/auth/users',{name:'Escalation',role:'OWNER'},'manager')).status,403);
    assert.equal(db.order.length,0);
  });
  await test('checkout rejects changed prices, negative quantities, mismatched payments and missing shift', async () => {
    for (const change of [b=>b.items[0].unitPrice=0.01,b=>b.items[0].quantity=-1,b=>b.payments[0].amount=50,b=>db.shift[0].status='CLOSED']) {
      reset();const body=sale();change(body);assert.equal((await call('/orders',body)).status,400);assert.equal(db.order.length,0);assert.equal(db.stockItem[0].currentStock,10);
    }
  });
  await test('payment failure rolls back order, stock, counters and activity', async () => {
    reset();paymentFailure=true;assert.equal((await call('/orders',sale())).status,400);
    assert.equal(db.order.length,0);assert.equal(db.payment.length,0);assert.equal(db.stockMovement.length,0);assert.equal(db.activityLog.length,0);assert.equal(db.shift[0].totalCashSales,0);
  });
  await test('checkout retry creates exactly one sale and one deduction', async () => {
    reset();const body=sale();const first=await call('/orders',body);assert.equal(first.status,201,JSON.stringify(first.body));
    const second=await call('/orders',body);assert.equal(second.body.order.id,first.body.order.id);
    assert.equal(db.order.length,1);assert.equal(db.payment.length,1);assert.equal(db.stockItem[0].currentStock,8);assert.equal(db.shift[0].totalCashSales,100);
  });
  await test('insufficient stock and missing local stock mapping never change another branch', async () => {
    reset();db.stockItem[0].currentStock=1;assert.equal((await call('/orders',sale())).status,400);assert.equal(db.stockItem[0].currentStock,1);assert.equal(db.order.length,0);
    reset();db.stockItem[0].branchId='B';assert.equal((await call('/orders',sale())).status,400);assert.equal(db.stockItem[0].currentStock,10);
  });
  await test('cancellation restores original recorded quantities despite recipe edits, once only', async () => {
    reset();const saved=await call('/orders',sale());db.menuItemRecipe[0].quantityRequired=9;
    const path='/orders/'+saved.body.order.id+'/cancel';
    assert.equal((await call(path,null,'owner','DELETE')).status,200);
    assert.equal(db.stockItem[0].currentStock,10);assert.equal(db.shift[0].totalCashSales,0);assert.equal(db.payment[0].status,'REFUNDED');
    await call(path,null,'owner','DELETE');assert.equal(db.stockItem[0].currentStock,10);
  });
  await test('held order completion updates the same record and shift, without exposing cashier credentials', async () => {
    reset();const body={...sale(),isHeld:true};const held=await call('/orders',body);assert.equal(db.stockItem[0].currentStock,10);
    const resumed=await call('/orders/'+held.body.order.id+'/resume',{...body,isHeld:false,clientRequestId:crypto.randomUUID()},'cashier','PATCH');
    assert.equal(resumed.status,201,JSON.stringify(resumed.body));assert.equal(resumed.body.order.id,held.body.order.id);assert.equal(resumed.body.order.cashier.pinCode,undefined);
    assert.equal(db.shift[0].totalCashSales,100);assert.equal(db.order.length,1);
  });
  await test('drawer expense automatically links its shift; reversal restores cash and retains activity', async () => {
    reset();const created=await call('/expenses',{branchId:'A',category:'OTHER',amount:20,description:'Supplier',paymentSource:'CASH_DRAWER'},'owner');
    assert.equal(created.status,201);assert.equal(created.body.shiftId,'shift-A');assert.equal(summarizeShift(hydrate('shift',db.shift[0])).expectedCash,30);
    assert.equal((await call('/expenses/'+created.body.id,null,'owner','DELETE')).status,200);
    assert.equal(summarizeShift(hydrate('shift',db.shift[0])).expectedCash,50);
    assert.equal(db.activityLog.filter(e=>e.action==='EXPENSE_REVERSED').length,1);
  });
  await test('current drawer and closing Z-report agree after sale cancellation and expense', async () => {
    reset();const saved=await call('/orders',sale());await call('/orders/'+saved.body.order.id+'/cancel',null,'owner','DELETE');
    await call('/expenses',{branchId:'A',category:'OTHER',amount:20,description:'Drawer payout',paymentSource:'CASH_DRAWER'},'owner');
    const current=await call('/shifts/current',null,'cashier','GET');
    const closed=await call('/shifts/close',{shiftId:'shift-A',closingCashActual:30});
    assert.equal(closed.status,200,JSON.stringify(closed.body));assert.equal(closed.body.zReport.expectedCashInDrawer,current.body.activeShift.expectedCash);assert.equal(closed.body.zReport.variance,0);
  });
  await test('restock retains invoice details and transfer rejects negative or excessive quantities', async () => {
    reset();const restocked=await call('/inventory/restock',{stockItemId:'potatoes',quantityAdded:5,invoiceRef:'INV-TEST',unitCost:10},'owner');
    assert.equal(restocked.status,200);assert.equal(db.stockItem[0].currentStock,15);assert.equal(db.activityLog.at(-1).details.invoiceRef,'INV-TEST');
    for(const quantity of [-1,99]){const result=await call('/inventory/transfer',{sourceBranchId:'A',destBranchId:'B',stockItemId:'potatoes',quantity},'owner');assert.equal(result.status,400);assert.equal(db.stockItem[0].currentStock,15);}
    assert.equal(db.stockItem.length,1);
  });
  await test('cashiers cannot read another branch order or the owner activity log', async () => {
    reset();db.order.push({id:'foreign',branchId:'B',cashierId:'owner'});
    assert.equal((await call('/orders/foreign',null,'cashier','GET')).status,403);
    assert.equal((await call('/activity',null,'cashier','GET')).status,403);
    assert.equal((await call('/activity',null,'owner','GET')).status,200);
  });
  await test('three invalid PIN attempts trigger backend lockout', async () => {
    reset();assert.equal((await call('/auth/login',{pinCode:'0000'})).status,401);assert.equal((await call('/auth/login',{pinCode:'0000'})).status,401);assert.equal((await call('/auth/login',{pinCode:'0000'})).status,429);
  });
} finally { await new Promise(resolve => server.close(resolve)); }
