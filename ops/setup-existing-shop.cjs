// Configure the reviewed existing shop database. Never reset data or credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dotenv=require('../server/node_modules/dotenv');
const {PrismaClient}=require('../server/node_modules/@prisma/client');
const directory='C:/ProgramData/NaniFrys';
const privateEnv=path.join(directory,'shop.env');
if(fs.existsSync(privateEnv))throw Error('Private shop configuration already exists; review it instead of replacing it');
const cloudBefore=process.argv[2];if(!cloudBefore)throw Error('Supply the private backup of the current hosted environment');
const cloud=dotenv.parse(fs.readFileSync(cloudBefore));
if(new URL(cloud.DATABASE_URL||'').pathname!=='/mombasam_nanifrys')throw Error('Unexpected cloud database');
const admin=new PrismaClient({datasourceUrl:'mysql://root@127.0.0.1:3306/mysql?connection_limit=2'});
async function main(){
 const user='nanifrys_pos_app';
 const existing=await admin.$queryRaw`SELECT User FROM mysql.user WHERE User=${user} AND Host='127.0.0.1'`;
 if(existing.length&&!process.argv.includes('--resume-created-account'))throw Error('Application database account already exists; no password was changed');
 const password=crypto.randomBytes(48).toString('hex'),key=cloud.REPLICA_SECRET||crypto.randomBytes(48).toString('hex');
 // The resume option is only for this newly created, unconfigured POS account.
 // Existing installations are protected by the private-file check above.
 await admin.$executeRawUnsafe(`${existing.length?'ALTER':'CREATE'} USER '${user}'@'127.0.0.1' IDENTIFIED BY '${password}'`);
 await admin.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,ALTER,INDEX,REFERENCES,TRIGGER,SHOW VIEW ON mombasam_nanifrys.* TO '${user}'@'127.0.0.1'`);
 fs.mkdirSync(directory,{recursive:true});fs.mkdirSync(path.join(directory,'backups'),{recursive:true});
 const local={NODE_ENV:'production',SITE_MODE:'shop',BIND_HOST:'127.0.0.1',PORT:'5050',TZ:'Africa/Nairobi',
  DATABASE_URL:`mysql://${user}:${password}@127.0.0.1:3306/mombasam_nanifrys?connection_limit=3`,JWT_SECRET:crypto.randomBytes(48).toString('hex'),
  REPLICA_SHOP_ID:'nani-frys-main-shop',REPLICA_CLOUD_URL:'https://nanifrys.com/api',REPLICA_SECRET:key,
  BACKUP_DIRECTORY:directory+'/backups',BACKUP_DEFAULTS_FILE:directory+'/backup.cnf',MYSQLDUMP_PATH:'C:/xampp/mysql/bin/mysqldump.exe',LOCAL_DATABASE_NAME:'mombasam_nanifrys',REPLICA_REFRESH_STAGED_BASE:'true'};
 const remote={...cloud,NODE_ENV:'production',SITE_MODE:'cloud',TZ:'Africa/Nairobi',REPLICA_SHOP_ID:local.REPLICA_SHOP_ID,REPLICA_SECRET:key,REPLICA_CLOUD_READONLY:'false',CORS_ORIGINS:'https://nanifrys.com,https://www.nanifrys.com'};
 const env=values=>Object.entries(values).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n';
 fs.writeFileSync(privateEnv,env(local),{mode:0o600,flag:'wx'});
 fs.writeFileSync(path.join(directory,'cloud.env'),env(remote),{mode:0o600,flag:'wx'});
 fs.writeFileSync(path.join(directory,'backup.cnf'),`[client]\nhost=127.0.0.1\nuser=${user}\npassword=${password}\n`,{mode:0o600,flag:'wx'});
 console.log('Private local configuration prepared. No credentials were printed or committed.');
}
main().catch(e=>{console.error('Setup stopped: '+(e.code||e.message));process.exitCode=1;}).finally(()=>admin.$disconnect());
