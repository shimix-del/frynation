import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('../server/node_modules/typescript');
let sequence = 0;
export async function loadSource(path, bindings = {}) {
  const key = `__regression_${sequence++}`;
  globalThis[key] = bindings;
  let source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  source = source.replace(/import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"];?/g, (_, names, module) => {
    if (!(module in bindings)) throw new Error(`Missing test dependency ${module} in ${path}`);
    return `const ${names.trim()} = globalThis[${JSON.stringify(key)}][${JSON.stringify(module)}];`;
  }).replace(/import\s+['"][^'"]+['"];?/g, '');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(output + '\n//' + key).toString('base64'));
}
