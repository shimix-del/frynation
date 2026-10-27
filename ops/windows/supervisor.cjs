const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const privateRoot = path.join(process.env.ProgramData || 'C:/ProgramData', 'NaniFrys');
require(path.join(root, 'server/node_modules/dotenv')).config({ path: path.join(privateRoot, 'shop.env'), quiet: true });
const databaseUrl = new URL(process.env.DATABASE_URL || 'mysql://localhost:3306/mombasam_nanifrys');
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) throw new Error('Shop database must be local');
const databasePort = Number(databaseUrl.port || 3306);
if (!Number.isInteger(databasePort) || databasePort < 1024 || databasePort > 65535) throw new Error('Invalid shop database port');
const databaseConfig = process.env.MYSQL_DEFAULTS_FILE || 'C:/xampp/mysql/bin/my.ini';
// Binding a private loopback port prevents duplicate supervisors after double-clicks.
const lock = net.createServer();
lock.once('error', () => process.exit(0));
lock.listen(15051, '127.0.0.1', () => void run());
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function databaseReady() {
  return new Promise(resolve => {
    const socket = net.connect(databasePort, '127.0.0.1');
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
async function run() {
  const log = fs.openSync(path.join(privateRoot, 'service.log'), 'a');
  let checkingDatabase = false;
  async function ensureDatabase() {
    if (checkingDatabase) return;
    checkingDatabase = true;
    try {
      if (await databaseReady()) return;
      const database = spawn('C:/xampp/mysql/bin/mysqld.exe', ['--defaults-file=' + databaseConfig, '--standalone'], { windowsHide: true, stdio: ['ignore', log, log] });
      database.on('error', () => {});
      for (let attempt = 0; attempt < 30 && !await databaseReady(); attempt++) await wait(1000);
    } finally { checkingDatabase = false; }
  }
  for (;;) {
    await ensureDatabase();
    if (!await databaseReady()) { await wait(10000); continue; }
    const child = spawn(process.execPath, [path.join(root, 'server/dist/index.js')], {
      cwd: path.join(root, 'server'), windowsHide: true, env: { ...process.env, DOTENV_CONFIG_PATH: path.join(privateRoot, 'shop.env') }, stdio: ['ignore', log, log],
    });
    const databaseWatch = setInterval(() => void ensureDatabase().catch(() => {}), 10000);
    await new Promise(resolve => { child.once('error', resolve); child.once('exit', resolve); });
    clearInterval(databaseWatch);
    await wait(5000);
  }
}
