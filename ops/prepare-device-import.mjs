// Offline preparation only. Never connects to a database or modifies a device.
// Outputs contain private business data and must stay outside Git and the webroot.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { Prisma } = require('@prisma/client');
const models = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
const quote = value => value === null ? 'NULL' : typeof value === 'boolean' ? (value ? '1' : '0') : typeof value === 'number' ? String(value) : `CONVERT(0x${Buffer.from(String(value), 'utf8').toString('hex')} USING utf8mb4) COLLATE utf8mb4_unicode_ci`;
const idQuote = name => `\`${name}\``;

export async function prepare(paths) {
  const tables = new Map();
  const inferred = [];
  const sources = [];
  const add = (modelName, source, backup, locator, generatedId) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`Invalid ${locator}`);
    const model = models.get(modelName);
    const row = {};
    for (const field of model.fields.filter(field => field.kind !== 'object')) {
      let value = source[field.name];
      if (value === undefined) {
        if (field.isId && generatedId) value = generatedId;
        else if (field.name === 'passwordHash' && modelName === 'User') {
          // Browser mode had no password hash. Preserve PIN login; invent no password.
          value = '!no-password-hash-in-device-backup!';
          inferred.push({ locator, field: field.name, policy: 'Email/password login unavailable; existing PIN preserved' });
        } else if (field.type === 'DateTime' && (field.name === 'createdAt' || field.name === 'updatedAt')) {
          value = backup.exportedAt;
          inferred.push({ locator, field: field.name, policy: 'Export timestamp; original field absent' });
        } else if (field.default !== undefined && typeof field.default !== 'object') value = field.default;
        else if (!field.isRequired) value = null;
        else throw new Error(`Missing required ${locator}.${field.name}`);
      }
      if (value !== null && field.type === 'DateTime') {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date at ${locator}.${field.name}`);
        value = date.toISOString().slice(0, 23).replace('T', ' ');
      }
      if (value !== null && ['Float', 'Int'].includes(field.type) && (!Number.isFinite(Number(value)) || (field.type === 'Int' && !Number.isInteger(Number(value))))) throw new Error(`Invalid number at ${locator}.${field.name}`);
      if (value !== null && ['Float', 'Int'].includes(field.type)) value = Number(value);
      if (value === null && field.isRequired) throw new Error(`Null required field at ${locator}.${field.name}`);
      row[field.name] = value;
    }
    const rows = tables.get(modelName) || new Map();
    const existing = rows.get(row.id);
    if (existing && canonical(existing) !== canonical(row)) throw new Error(`Conflicting ${modelName} ID across device backups; manual reconciliation required`);
    rows.set(row.id, row);
    tables.set(modelName, rows);
    return row;
  };
  for (const path of paths) {
    const bytes = await readFile(path);
    const backup = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (backup.format !== 'nanifrys-device-backup-v1' || backup.origin !== 'https://nanifrys.com' || !Number.isFinite(new Date(backup.exportedAt).getTime())) throw new Error('Unsupported device export');
    sources.push({ sha256: hash(bytes), exportedAt: backup.exportedAt });
    const read = key => {
      const raw = backup.records[`nanifrys_standalone_${key}`];
      return raw === undefined ? [] : JSON.parse(raw);
    };
    const mapping = { branches: 'Branch', users: 'User', categories: 'Category', menu: 'MenuItem', inventory: 'StockItem', shiftHistory: 'Shift', orders: 'Order', expenses: 'Expense', recipes: 'MenuItemRecipe', transfers: 'StockTransfer', audits: 'StockAudit' };
    for (const [key, modelName] of Object.entries(mapping)) {
      const records = read(key);
      if (!Array.isArray(records)) throw new Error(`Expected list for ${key}`);
      for (const source of records) {
        const parent = add(modelName, source, backup, `${modelName}:${source.id}`);
        const nested = modelName === 'Order' ? [['items', 'OrderItem', 'orderId'], ['payments', 'Payment', 'orderId']] : modelName === 'MenuItem' ? [['variants', 'MenuItemVariant', 'menuItemId']] : modelName === 'Shift' ? [['cashMovements', 'CashMovement', 'shiftId']] : [];
        for (const [property, childModel, foreignKey] of nested) {
          for (const [index, child] of (source[property] || []).entries()) {
            const generatedId = `legacy-${hash(`${childModel}:${parent.id}:${index}:${canonical(child)}`).slice(0, 40)}`;
            add(childModel, { ...child, [foreignKey]: parent.id, ...(childModel === 'Payment' || childModel === 'CashMovement' ? { branchId: parent.branchId } : {}) }, backup, `${childModel}:${parent.id}:${index}`, generatedId);
          }
        }
      }
    }
    const known = new Set(Object.keys(mapping).map(key => `nanifrys_standalone_${key}`));
    for (const [key, raw] of Object.entries(backup.records)) {
      if (known.has(key) || key === 'nanifrys_standalone_version') continue;
      // An unknown business store may contain active shifts or unsynced tickets.
      // Stop for review rather than silently omit it from migration.
      if (raw && !['null', '[]', '{}', '""'].includes(raw)) throw new Error(`Unmapped device store requires review: ${key}`);
    }
  }
  for (const [name, rows] of tables) {
    for (const relation of models.get(name).fields.filter(field => field.kind === 'object' && field.relationFromFields?.length)) {
      if (relation.relationFromFields.length !== 1) throw new Error('Composite relation requires manual review');
      const foreignKey = relation.relationFromFields[0];
      for (const row of rows.values()) if (row[foreignKey] !== null && !tables.get(relation.type)?.has(row[foreignKey])) throw new Error(`Unresolved ${name}.${foreignKey}; original export preserved for reconciliation`);
    }
  }
  // Foreign-key order. Existing rows must match exactly, including historical values.
  const order = ['Branch', 'User', 'Category', 'MenuItem', 'MenuItemVariant', 'StockItem', 'MenuItemRecipe', 'Shift', 'Order', 'OrderItem', 'Payment', 'CashMovement', 'Expense', 'StockTransfer', 'StockAudit'];
  const sql = ['-- PRIVATE: import only into mombasam_nanifrys after taking a SQL backup.', '-- Keep phpMyAdmin stop-on-error enabled. Never continue after an assertion error.', 'USE `mombasam_nanifrys`;', 'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;', 'START TRANSACTION;', 'CREATE TEMPORARY TABLE `nf_import_guard` (`ok` INT NOT NULL CHECK (`ok` = 1));'];
  for (const name of order) for (const row of tables.get(name)?.values() || []) {
    const same = Object.entries(row).map(([key, value]) => `${idQuote(key)} <=> ${quote(value)}`).join(' AND ');
    sql.push(`INSERT INTO nf_import_guard SELECT IF(EXISTS(SELECT 1 FROM ${idQuote(name)} WHERE id = ${quote(row.id)} AND NOT (${same})), 0, 1);`);
  }
  for (const name of order) for (const row of tables.get(name)?.values() || []) {
    sql.push(`INSERT INTO ${idQuote(name)} (${Object.keys(row).map(idQuote).join(', ')}) SELECT ${Object.values(row).map(quote).join(', ')} WHERE NOT EXISTS (SELECT 1 FROM ${idQuote(name)} WHERE id = ${quote(row.id)});`);
  }
  sql.push('COMMIT;', 'DROP TEMPORARY TABLE nf_import_guard;');
  return { sql: sql.join('\n') + '\n', report: { sources, counts: Object.fromEntries([...tables].map(([name, rows]) => [name, rows.size])), inferred, preservesOriginalIDs: true, overwritesExistingRows: false } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [outputDirectory, ...backups] = process.argv.slice(2);
  if (!outputDirectory || !backups.length) throw new Error('Usage: node ops/prepare-device-import.mjs PRIVATE_OUTPUT_DIR BACKUP.json [...]');
  const result = await prepare(backups);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'device-import.sql'), result.sql, { mode: 0o600 });
  await writeFile(resolve(outputDirectory, 'device-import-report.json'), JSON.stringify(result.report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ prepared: true, counts: result.report.counts, inferredFields: result.report.inferred.length }));
}
