import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export const models = ['Branch', 'User', 'Category', 'MenuItem', 'MenuItemVariant', 'StockItem', 'MenuItemRecipe',
  'Shift', 'Order', 'OrderItem', 'Payment', 'CashMovement', 'Expense', 'StockTransfer', 'StockAudit', 'ActivityLog', 'StockMovement'] as const;
export type Change = { model: string; id: string; before: string | null; base?: Record<string, any> | null; row: Record<string, any> | null };
export const protocolVersion = 4;
export function canonical(value: any): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = (value: any) => createHash('sha256').update(canonical(value)).digest('hex');
export const schemaFingerprint = digest(Prisma.dmmf.datamodel.models.map(model => ({
  name: model.name, databaseName: model.dbName || model.name, uniqueFields: model.uniqueFields,
  fields: model.fields.map(field => ({ name: field.name, kind: field.kind, type: field.type, required: field.isRequired,
    list: field.isList, id: field.isId, unique: field.isUnique, databaseName: field.dbName || field.name,
    from: field.relationFromFields, to: field.relationToFields, onDelete: field.relationOnDelete })).sort((a,b)=>a.name.localeCompare(b.name)),
})).sort((a,b)=>a.name.localeCompare(b.name)));
export const delegate = (db: any, model: string) => db[model[0].toLowerCase() + model.slice(1)];
export const rowKey = (model: string, id: string) => `row:${model}:${id}`;
const equal = (a: any,b: any) => canonical(a) === canonical(b);
const derived: Record<string, string[]> = {
  StockItem: ['currentStock'],
  Shift: ['totalCashSales','totalMpesaSales','totalCardSales','totalExpensesPaid','closingCashExpected','variance'],
};
const appendOnly = new Set(['ActivityLog','StockMovement','StockAudit','StockTransfer']);
export function hydrate(model: string, row: any) {
  const definition = Prisma.dmmf.datamodel.models.find(m=>m.name===model);
  if (!definition || !models.includes(model as any)) throw new Error('Unknown sync model');
  const fields=definition.fields.filter(f=>f.kind!=='object');
  const allowed=new Set(fields.map(f=>f.name));
  if (Object.keys(row).some(k=>!allowed.has(k))) throw new Error('Unknown sync field');
  return Object.fromEntries(fields.filter(f=>Object.hasOwn(row,f.name)).map(f=>[f.name,f.type==='DateTime'&&row[f.name]!==null?new Date(row[f.name]):row[f.name]]));
}

// A field changed on just one side is retained. Different edits to the same
// business field stop synchronization for review; timestamps never pick a winner.
export function mergeRow(model: string, current: any, change: Change): any {
  const incoming=change.row,base=change.base;
  if (incoming===null) {
    if (appendOnly.has(model)) throw new Error('Audit records cannot be removed');
    if (!current) return null;
    if (!base || !equal(current,base)) throw new Error(`SYNC_CONFLICT:${model}:${change.id}:deletion`);
    return null;
  }
  if (!current) {
    if (base) throw new Error(`SYNC_CONFLICT:${model}:${change.id}:removed-record`);
    return {...incoming,...(model==='StockItem'?{currentStock:0}:{})};
  }
  if (equal(current,incoming)) return current;
  if (model==='StockMovement' && incoming.reversesMovementId && current.reversesMovementId===incoming.reversesMovementId &&
    current.stockItemId===incoming.stockItemId && current.quantity===incoming.quantity && current.orderId===incoming.orderId) {
    return canonical(current)<canonical(incoming)?current:incoming;
  }
  if (!base) throw new Error(`SYNC_CONFLICT:${model}:${change.id}:identity`);
  if (appendOnly.has(model)) throw new Error(`SYNC_CONFLICT:${model}:${change.id}:audit`);
  const merged={...current};
  for (const [field,value] of Object.entries(incoming)) {
    if (field==='id' || (derived[model]||[]).includes(field)) continue;
    if (field==='updatedAt') { merged[field]=new Date(Math.max(Date.parse(current[field]),Date.parse(String(value)))).toISOString();continue; }
    if (equal(value,base[field])) continue;
    if (!equal(current[field],base[field])&&!equal(current[field],value)) throw new Error(`SYNC_CONFLICT:${model}:${change.id}:${field}`);
    merged[field]=value;
  }
  return merged;
}
export async function snapshot(db: any) {
  const rows:Record<string,any[]>={};
  for (const model of models) rows[model]=await delegate(db,model).findMany({orderBy:{id:'asc'}});
  return rows;
}
export async function applyChanges(db: any, changes: Change[]) {
  if (!Array.isArray(changes)||changes.length>5000) throw new Error('Invalid sync batch');
  const seen=new Set<string>(),resolved: Array<{change:Change;row:any;current:any;skip?:boolean}>=[];
  for (const change of changes) {
    if (!models.includes(change.model as any)||typeof change.id!=='string'||change.id.length>191||(change.row!==null&&change.row?.id!==change.id)) throw new Error('Invalid sync row');
    if (change.base && digest(change.base)!==change.before) throw new Error('Invalid synchronization baseline');
    const key=rowKey(change.model,change.id);if(seen.has(key))throw new Error('Duplicate sync row');seen.add(key);
    const current=await delegate(db,change.model).findUnique({where:{id:change.id}});
    if (change.row) hydrate(change.model,change.row);
    if (change.model==='StockMovement'&&change.row?.reversesMovementId&&!current) {
      const reversal=await db.stockMovement.findUnique({where:{reversesMovementId:change.row.reversesMovementId}});
      if(reversal){if(reversal.stockItemId!==change.row.stockItemId||reversal.quantity!==change.row.quantity)throw new Error('SYNC_CONFLICT:stock-reversal');resolved.push({change,current,row:null,skip:true});continue;}
    }
    resolved.push({change,current,row:mergeRow(change.model,current,change)});
  }
  const stockDeltas=new Map<string,number>(),shifts=new Set<string>();
  for (const entry of resolved) if (!entry.current && entry.row && entry.change.model==='StockMovement' &&
    ['STOCK_AUDITED','STOCK_UPDATED'].includes(entry.row.reason) && entry.row.quantity!==0) {
    const stock=resolved.find(r=>r.change.model==='StockItem'&&r.change.id===entry.row.stockItemId);
    if (stock?.current && stock.change.base && stock.current.currentStock!==stock.change.base.currentStock) throw new Error('SYNC_CONFLICT:stock-count');
  }
  for (const entry of resolved.filter(r=>!r.skip&&r.row!==null).sort((a,b)=>models.indexOf(a.change.model as any)-models.indexOf(b.change.model as any))) {
    const {change,row,current}=entry;
    if(change.model==='StockMovement'&&!current) stockDeltas.set(row.stockItemId,(stockDeltas.get(row.stockItemId)||0)+row.quantity);
    if(row.shiftId)shifts.add(row.shiftId);if(change.model==='Shift')shifts.add(change.id);
    const data=hydrate(change.model,row);
    await delegate(db,change.model).upsert({where:{id:change.id},create:data,update:data});
  }
  for(const {change,current} of resolved.filter(r=>!r.skip&&r.row===null).sort((a,b)=>models.indexOf(b.change.model as any)-models.indexOf(a.change.model as any))){
    if(current?.shiftId)shifts.add(current.shiftId);
    if(current)await delegate(db,change.model).delete({where:{id:change.id}});
  }
  for(const [id,delta] of [...stockDeltas].sort(([a],[b])=>a.localeCompare(b)))await db.stockItem.update({where:{id},data:{currentStock:{increment:delta}}});
  // Counters are projections of confirmed orders, payments and drawer movements,
  // not competing row totals that can overwrite another till's sales.
  for(const id of [...shifts].sort()) {
    const shift=await db.shift.findUnique({where:{id},include:{orders:{include:{payments:true}},cashMovements:true,expenses:true}});if(!shift)continue;
    const sums={CASH:0,MPESA:0,CARD:0};
    for(const order of shift.orders)if(order.status==='COMPLETED')for(const p of order.payments)if(p.status==='COMPLETED'&&p.paymentMethod in sums)sums[p.paymentMethod as keyof typeof sums]+=p.amount;
    const cash=shift.cashMovements.reduce((n:number,m:any)=>n+(m.type==='FLOAT_IN'?m.amount:-m.amount),0);
    const expected=Math.round((shift.openingFloat+sums.CASH+cash)*100)/100;
    await db.shift.update({where:{id},data:{totalCashSales:sums.CASH,totalMpesaSales:sums.MPESA,totalCardSales:sums.CARD,
      totalExpensesPaid:shift.expenses.filter((e:any)=>e.paymentSource==='CASH_DRAWER').reduce((n:number,e:any)=>n+e.amount,0),
      ...(shift.status==='CLOSED'?{closingCashExpected:expected,variance:Math.round((shift.closingCashActual-expected)*100)/100}:{})}});
  }
}
