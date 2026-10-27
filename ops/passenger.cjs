'use strict';
// Shared hosting reports the host CPU count, which can exceed the account's
// process quota. Set limits before loading Node workers or the query engine.
process.env.UV_THREADPOOL_SIZE ||= '2';
process.env.TOKIO_WORKER_THREADS ||= '2';
process.env.RAYON_NUM_THREADS ||= '2';
const path = require('node:path');
const fs = require('node:fs');
const pointer=path.join(__dirname,'current-release');
const releaseId = fs.existsSync(pointer)?fs.readFileSync(pointer,'utf8').trim():process.env.NANIFRYS_RELEASE;
if (!/^[a-f0-9]{40}$/.test(releaseId || '')) {
  throw new Error('Set NANIFRYS_RELEASE to the staged Git commit.');
}
const releaseRoot = path.join('/home/mombasam/nanifrys-releases', releaseId);
process.env.APP_VERSION=releaseId;
require(path.join(releaseRoot, 'server/node_modules/dotenv')).config({ path: path.join(__dirname, '.env') });
if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  for (const [key, value] of Object.entries({ connection_limit: '3', pool_timeout: '5', connect_timeout: '5' })) {
    if (!databaseUrl.searchParams.has(key)) databaseUrl.searchParams.set(key, value);
  }
  process.env.DATABASE_URL = databaseUrl.toString();
}
require(path.join(releaseRoot, 'server/dist/index.js'));
