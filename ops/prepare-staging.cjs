// Restore backups into NEW databases and compare records before any business upgrade.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {PrismaClient}=require('../server/node_modules/@prisma/client');
const privateRoot='C:/ProgramData/NaniFrys/backups/pre-repair-20261027';
const liveInput=process.argv[2];if(!liveInput)throw Error('Supply the downloaded live SQL gzip backup');
const localInput=path.join(privateRoot,'mombasam_nanifrys.sql');
const checksum=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(checksum(localInput).toUpperCase()!==fs.readFileSync(localInput+'.sha256','utf8').trim().toUpperCase())throw Error('Local backup checksum mismatch');
fs.mkdirSync(privateRoot,{recursive:true});const liveCopy=path.join(privateRoot,'live-mombasam_nanifrys.sql.gz');
fs.copyFileSync(liveInput,liveCopy);fs.writeFileSync(liveCopy+'.sha256',checksum(liveCopy));
const admin=new PrismaClient({datasourceUrl:'mysql://root@127.0.0.1:3306/mysql?connection_limit=2'});
const stamp=Date.now(),names={shop:`nanifrys_stage_${stamp}_shop`,cloud:`nanifrys_stage_${stamp}_cloud`};
const clients={};
async function main(){
 for(const [side,name]of Object.entries(names)){
  let sql=side==='cloud'?zlib.gunzipSync(fs.readFileSync(liveCopy)).toString('utf8'):fs.readFileSync(localInput,'utf8');
  if(/DELIMITER|CREATE\s+(?:DEFINER[^\n]+)?(?:TRIGGER|PROCEDURE|FUNCTION)\b/i.test(sql))throw Error('Stored-program review required');
  sql=sql.replace(/^CREATE DATABASE[^\n]*;\r?\n/gm,'').replace(/^USE `[^`]+`;\r?\n/gm,'');
  if(/^\s*(?:CREATE|DROP) DATABASE|^\s*USE\s/im.test(sql))throw Error('Unexpected database selector in backup');
  const input=path.join(privateRoot,side+'-staging.sql');fs.writeFileSync(input,sql);
  await admin.$executeRawUnsafe(`CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const result=spawnSync('C:/xampp/mysql/bin/mysql.exe',['--user=root','--host=127.0.0.1','--abort-source-on-error',name,'--execute=source '+input.replaceAll('\\','/')],{windowsHide:true,stdio:['ignore','ignore',fs.openSync(path.join(privateRoot,'staging-import-errors.log'),'a')]});
  if(result.status!==0)throw Error('Staging import failed; private diagnostic log retained');
  const db=new PrismaClient({datasourceUrl:`mysql://root@127.0.0.1:3306/${name}?connection_limit=2`});clients[side]=db;
  for(const migration of ['202610260001_integrity_activity','202610270001_two_way_terminals']){
   const content=fs.readFileSync(path.join(__dirname,'../server/prisma/migrations',migration,'migration.sql'),'utf8');
   for(const sql of content.split(';').map(s=>s.trim()).filter(Boolean))await db.$executeRawUnsafe(sql);
  }
 }
 const {snapshot,digest,models}=require('../server/dist/replica/protocol.js');
 const local=await snapshot(clients.shop),live=await snapshot(clients.cloud),differences=[];
 for(const model of models){const left=new Map(local[model].map(r=>[r.id,r])),right=new Map(live[model].map(r=>[r.id,r]));
  for(const id of new Set([...left.keys(),...right.keys()]))if(digest(left.get(id)||null)!==digest(right.get(id)||null))differences.push({model,id,side:!left.has(id)?'live-only':!right.has(id)?'shop-only':'changed'});
 }
 const report={createdAt:new Date().toISOString(),databases:names,match:differences.length===0,counts:Object.fromEntries(models.map(m=>[m,{shop:local[m].length,cloud:live[m].length}])),differences};
 fs.writeFileSync(path.join(privateRoot,'staging-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await Promise.all(Object.values(clients).map(db=>db.$disconnect()));await admin.$disconnect();});
