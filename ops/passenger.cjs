'use strict';
const path = require('node:path');
const releaseId = process.env.NANIFRYS_RELEASE;
if (!/^[a-f0-9]{40}$/.test(releaseId || '')) {
  throw new Error('Set NANIFRYS_RELEASE to the staged Git commit.');
}
const releaseRoot = path.join('/home/mombasam/nanifrys-releases', releaseId);
require(path.join(releaseRoot, 'server/node_modules/dotenv')).config({ path: path.join(__dirname, '.env') });
require(path.join(releaseRoot, 'server/dist/index.js'));
