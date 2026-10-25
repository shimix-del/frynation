import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

// Dependency order matters for first import and newly created related records.
export const models = ['Branch', 'User', 'Category', 'MenuItem', 'MenuItemVariant',
  'StockItem', 'MenuItemRecipe', 'Shift', 'Order', 'OrderItem', 'Payment',
  'CashMovement', 'Expense', 'StockTransfer', 'StockAudit'] as const;
export type Change = { model: string; id: string; before: string | null; row: Record<string, any> };
export function canonical(value: any): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = (v: any) => createHash('sha256').update(canonical(v)).digest('hex');
export const protocolVersion = 2;
export const schemaFingerprint = digest(Prisma.dmmf.datamodel.models.map(model => ({
  name: model.name, databaseName: model.dbName || model.name, uniqueFields: model.uniqueFields,
  fields: model.fields.map(field => ({ name: field.name, kind: field.kind, type: field.type,
    required: field.isRequired, list: field.isList, id: field.isId, unique: field.isUnique,
    databaseName: field.dbName || field.name, from: field.relationFromFields, to: field.relationToFields,
    onDelete: field.relationOnDelete })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
})).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
export const delegate = (db: any, model: string) => db[model[0].toLowerCase() + model.slice(1)];
export const rowKey = (model: string, id: string) => `row:${model}:${id}`;
export function hydrate(model: string, row: any) {
  const definition = Prisma.dmmf.datamodel.models.find(m => m.name === model);
  if (!definition || !models.includes(model as any)) throw new Error('Unknown sync model');
  const fields = definition.fields.filter(f => f.kind !== 'object');
  const allowed = new Set(fields.map(f => f.name));
  if (Object.keys(row).some(k => !allowed.has(k))) throw new Error('Unknown sync field');
  return Object.fromEntries(fields.filter(f => Object.hasOwn(row, f.name)).map(f => [f.name,
    f.type === 'DateTime' && row[f.name] !== null ? new Date(row[f.name]) : row[f.name]]));
}
export async function snapshot(db: any) {
  const rows: Record<string, any[]> = {};
  for (const model of models) rows[model] = await delegate(db, model).findMany({ orderBy: { id: 'asc' } });
  return rows;
}
export async function applyChanges(db: any, changes: Change[]) {
  if (!Array.isArray(changes) || changes.length > 5000) throw new Error('Invalid sync batch');
  const seen = new Set<string>();
  for (const c of changes) {
    if (typeof c.id !== 'string' || c.id.length > 100 || !c.row || c.row.id !== c.id) throw new Error('Invalid sync row');
    const data = hydrate(c.model, c.row);
    const key = rowKey(c.model, c.id);
    if (seen.has(key)) throw new Error('Duplicate row in batch');
    seen.add(key);
    const table = delegate(db, c.model);
    const current = await table.findUnique({ where: { id: c.id } });
    if ((current ? digest(current) : null) !== c.before) throw new Error(`SYNC_CONFLICT:${c.model}:${c.id}`);
    if (current) await table.update({ where: { id: c.id }, data });
    else await table.create({ data });
  }
}
