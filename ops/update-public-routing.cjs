const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const protection = String.raw`# BEGIN NANI FRYS source protection
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^\.well-known(?:/|$) - [L]
  RewriteRule (^|/)\. - [F,L]
  RewriteRule ^(?:server|client|ops|tests|docs|node_modules)(?:/|$) - [F,L,NC]
</IfModule>
<FilesMatch "\.(?:env|sql|prisma|ts|tsx|mjs|cjs|ps1|bat|vbs|lock|md|yml|toml)$">
  Require all denied
</FilesMatch>
<FilesMatch "^(?:package(?:-lock)?\.json|tsconfig.*\.json)$">
  Require all denied
</FilesMatch>
# END NANI FRYS source protection
`;
function protectedContents(original) {
  const existing = original.replace(/^# BEGIN NANI FRYS source protection\r?\n[\s\S]*?^# END NANI FRYS source protection\r?\n?/gm, '')
    .replace(/^([ \t]*)RewriteBase[ \t]+\/pos%20sys\/[ \t]*\r?$/gm, '$1RewriteBase /');
  return protection + existing;
}
module.exports = { protectedContents };
if (require.main === module) {
  if (process.platform !== 'linux') throw new Error('This upgrade targets the reviewed cPanel host');
  const target = '/home/mombasam/nanifrys/.htaccess';
  const original = fs.readFileSync(target, 'utf8');
  const updated = protectedContents(original);
  if (updated !== original) {
    const backups = '/home/mombasam/nanifrys-private/backups';
    fs.mkdirSync(backups, { recursive: true, mode: 0o700 });
    const backup = path.join(backups, 'public-routing-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt');
    fs.writeFileSync(backup, original, { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(backup + '.sha256', createHash('sha256').update(original).digest('hex'), { mode: 0o600 });
    fs.writeFileSync(target + '.new', updated, { mode: 0o644 });
    fs.chmodSync(target + '.new', 0o644);
    fs.renameSync(target + '.new', target);
  }
  console.log('Public source protection installed; hosting-managed routing retained.');
}
