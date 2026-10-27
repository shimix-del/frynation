// Additive upgrade only. Back up all existing rows before changing the schema.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
require('../server/node_modules/dotenv').config({path:process.env.DOTENV_CONFIG_PATH||'/home/mombasam/nanifrys-runtime/.env'});
const {PrismaClient,Prisma}=require('../server/node_modules/@prisma/client');
const url=new URL(process.env.DATABASE_URL||'');
const database=decodeURIComponent(url.pathname.slice(1));
if(database!=='mombasam_nanifrys'&&!/^nanifrys_stage_\d+_(shop|cloud)$/.test(database))throw Error('Unexpected database; upgrade stopped');
const db=new PrismaClient();
async function main(){
 const directory=process.env.UPGRADE_BACKUP_DIRECTORY||'/home/mombasam/nanifrys-private/backups';
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const existing=await db.$queryRaw`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE()`;
 const found=new Set(existing.map(r=>r.TABLE_NAME.toLowerCase())),rows={};
 for(const name of [...Prisma.dmmf.datamodel.models.map(m=>m.dbName||m.name),'NaniReplicaState'])if(found.has(name.toLowerCase()))rows[name]=await db.$queryRawUnsafe('SELECT * FROM `'+name+'`');
 const contents=JSON.stringify({database,at:new Date().toISOString(),rows},(_k,v)=>typeof v==='bigint'?v.toString():v);
 const file=path.join(directory,'before-upgrade-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
 fs.writeFileSync(file,contents,{mode:0o600,flag:'wx'});fs.writeFileSync(file+'.sha256',createHash('sha256').update(contents).digest('hex'),{mode:0o600});
 if(JSON.parse(fs.readFileSync(file,'utf8')).rows.Order.length!==rows.Order.length)throw Error('Backup read-back validation failed');
 for(const migration of ['202610260001_integrity_activity','202610270001_two_way_terminals']){
  const text=fs.readFileSync(path.join(__dirname,'../server/prisma/migrations',migration,'migration.sql'),'utf8');
  for(let statement of text.split(';').map(s=>s.replace(/^--.*$/gm,'').trim()).filter(Boolean)){
   const column=statement.match(/^ALTER TABLE `([^`]+)` ADD COLUMN `([^`]+)`/i);
   if(column){const present=await db.$queryRaw`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${column[1]} AND COLUMN_NAME=${column[2]}`;if(present.length)continue;}
   const index=statement.match(/^CREATE UNIQUE INDEX `([^`]+)` ON `([^`]+)`/i);
   if(index){const present=await db.$queryRaw`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${index[2]} AND INDEX_NAME=${index[1]}`;if(present.length)continue;}
   statement=statement.replace(/^CREATE TABLE /i,'CREATE TABLE IF NOT EXISTS ');
   if(!/^(ALTER TABLE[^;]+ADD COLUMN|CREATE TABLE IF NOT EXISTS|CREATE UNIQUE INDEX)/i.test(statement))throw Error('Non-additive migration rejected');
   await db.$executeRawUnsafe(statement);
  }
 }
 await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS NaniReplicaState (id VARCHAR(191) PRIMARY KEY,body LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
 for(const model of Prisma.dmmf.datamodel.models)await db[model.name[0].toLowerCase()+model.name.slice(1)].findFirst();
 console.log('Additive schema upgrade verified; backup: '+file);
}
main().catch(e=>{console.error('Upgrade stopped: '+e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
