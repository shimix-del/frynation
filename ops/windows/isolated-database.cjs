// Recovery into a NEW private MariaDB instance. Never modify the shared XAMPP
// data directory or replace existing business data/configuration without backup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..');
const dotenv=require(path.join(repo,'server/node_modules/dotenv'));
const {PrismaClient}=require(path.join(repo,'server/node_modules/@prisma/client'));
const {snapshot,digest,models}=require(path.join(repo,'server/dist/replica/protocol.js'));
const home=path.join(process.env.ProgramData||'C:/ProgramData','NaniFrys');
const data=path.join(home,'mysql-data'),config=path.join(home,'mysql-isolated.ini');
const planFile=path.join(home,'isolated-setup.json'),adminFile=path.join(home,'mysql-isolated-admin.cnf');
const shopFile=path.join(home,'shop.env'),port=3307;
function writePrivate(file,contents){fs.writeFileSync(file,contents,{mode:0o600,flag:'wx'});}
function validateDump(file){
 const bytes=fs.readFileSync(file),hash=fs.readFileSync(file+'.sha256','utf8').trim().toLowerCase();
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Backup checksum mismatch');
 const sql=bytes.toString('utf8');
 if(/^\s*(CREATE\s+DATABASE|DROP\s+DATABASE|USE\s|CREATE\s+USER|ALTER\s+USER|GRANT\s)/im.test(sql))throw Error('Backup changes more than application tables');
 const allowed=new Set([...models,'NaniReplicaState'].map(m=>m.toLowerCase()));
 const tables=[...sql.matchAll(/CREATE TABLE `([^`]+)`/g)].map(m=>m[1].toLowerCase());
 if(tables.length!==allowed.size||tables.some(t=>!allowed.has(t)))throw Error('Unexpected backup tables');
 return hash;
}
async function prepare(){
 const backup=path.resolve(process.argv[3]||'');
 const hash=validateDump(backup);
 const current=dotenv.parse(fs.readFileSync(shopFile));
 if(new URL(current.DATABASE_URL).pathname!=='/mombasam_nanifrys')throw Error('Unexpected shop database');
 for(const target of [data,config,planFile,adminFile])if(fs.existsSync(target))throw Error('Isolated instance already exists; review it instead of overwriting');
 await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
 const adminPassword=crypto.randomBytes(48).toString('hex'),appPassword=crypto.randomBytes(48).toString('hex');
 const generated=new URL(current.DATABASE_URL);generated.username='nanifrys_pos_app';generated.password=appPassword;generated.port=String(port);
 const plan={backup,hash,port,databaseUrl:generated.toString(),adminUrl:`mysql://root:${adminPassword}@127.0.0.1:${port}/mysql?connection_limit=2`,preparedAt:new Date().toISOString()};
 writePrivate(planFile,JSON.stringify(plan));
 writePrivate(adminFile,`[client]\nhost=127.0.0.1\nport=${port}\nuser=root\npassword=${adminPassword}\n`);
 const result=spawnSync('C:/xampp/mysql/bin/mysql_install_db.exe',[`--datadir=${data}`,`--port=${port}`,`--password=${adminPassword}`,'--skip-networking'],{windowsHide:true,encoding:'utf8'});
 writePrivate(path.join(home,'isolated-initialization.log'),(result.stdout||'')+(result.stderr||''));
 if(result.status!==0)throw Error('MariaDB initialization failed; private log retained');
 const normalized=data.replaceAll('\\','/');
 writePrivate(config,`[mysqld]\nbasedir=C:/xampp/mysql\ndatadir=${normalized}\nport=${port}\nbind-address=127.0.0.1\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_unicode_ci\ndefault-time-zone=+00:00\ninnodb_buffer_pool_size=64M\naria_pagecache_buffer_size=16M\nmax_connections=25\nlog-error=${normalized}/isolated-error.log\npid-file=${normalized}/isolated.pid\n`);
 console.log('Private isolated instance initialized on loopback port 3307. Shared XAMPP files unchanged.');
}
async function finish(){
 const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));
 if(plan.port!==port||new URL(plan.adminUrl).port!==String(port)||new URL(plan.databaseUrl).pathname!=='/mombasam_nanifrys')throw Error('Unexpected private instance identity');
 if(validateDump(plan.backup)!==plan.hash)throw Error('Restoration source changed');
 const admin=new PrismaClient({datasourceUrl:plan.adminUrl});
 let application;
 try{
  const existing=await admin.$queryRaw`SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='mombasam_nanifrys'`;
  if(existing.length)throw Error('Destination application database already exists; no data replaced');
  await admin.$executeRawUnsafe('CREATE DATABASE mombasam_nanifrys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const imported=spawnSync('C:/xampp/mysql/bin/mysql.exe',[`--defaults-file=${adminFile}`,'--abort-source-on-error','mombasam_nanifrys','--execute=source '+plan.backup.replaceAll('\\','/')],{windowsHide:true,encoding:'utf8'});
  writePrivate(path.join(home,'isolated-restore.log'),(imported.stdout||'')+(imported.stderr||''));
  if(imported.status!==0||/^ERROR/m.test(imported.stderr||''))throw Error('Backup restoration failed; destination retained for review');
  const password=new URL(plan.databaseUrl).password;
  if(!/^[a-f0-9]{96}$/.test(password))throw Error('Unexpected application credential format');
  await admin.$executeRawUnsafe(`CREATE USER 'nanifrys_pos_app'@'127.0.0.1' IDENTIFIED BY '${password}'`);
  await admin.$executeRawUnsafe("GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES,TRIGGER,SHOW VIEW ON mombasam_nanifrys.* TO 'nanifrys_pos_app'@'127.0.0.1'");
  application=new PrismaClient({datasourceUrl:plan.databaseUrl});
  const rows=await application.$transaction(tx=>snapshot(tx),{timeout:60000,isolationLevel:'RepeatableRead'});
  const state=await application.$queryRaw`SELECT body FROM NaniReplicaState WHERE id='staged-base'`;
  if(state.length!==1||JSON.parse(state[0].body).fingerprint!==digest(rows))throw Error('Restored business rows differ from the reviewed base; private shop settings unchanged');
  const old=dotenv.parse(fs.readFileSync(shopFile));
  writePrivate(path.join(home,'shop-before-isolation.env'),fs.readFileSync(shopFile));
  writePrivate(path.join(home,'backup-before-isolation.cnf'),fs.readFileSync(path.join(home,'backup.cnf')));
  const updated={...old,DATABASE_URL:plan.databaseUrl,MYSQL_DEFAULTS_FILE:config.replaceAll('\\','/')};
  const contents=Object.entries(updated).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n';
  writePrivate(shopFile+'.isolated',contents);fs.renameSync(shopFile+'.isolated',shopFile);
  fs.writeFileSync(path.join(home,'backup.cnf'),`[client]\nhost=127.0.0.1\nport=${port}\nuser=nanifrys_pos_app\npassword=${password}\n`,{mode:0o600});
  writePrivate(path.join(home,'isolated-restoration.json'),JSON.stringify({at:new Date().toISOString(),sourceHash:plan.hash,counts:Object.fromEntries(models.map(m=>[m,rows[m].length])),fingerprint:digest(rows)}));
  console.log('Restoration verified against the exact reviewed fingerprint: '+rows.Order.length+' orders. Shop settings now use the isolated instance.');
 }finally{await application?.$disconnect();await admin.$disconnect();}
}
(process.argv[2]==='prepare'?prepare:process.argv[2]==='finish'?finish:()=>{throw Error('Choose prepare or finish');})().catch(error=>{fs.writeFileSync(path.join(home,'isolated-setup-error.log'),error.stack||String(error),{mode:0o600});console.error('Isolated setup stopped; private diagnostics retained. '+(error.code||error.name));process.exitCode=1;});
