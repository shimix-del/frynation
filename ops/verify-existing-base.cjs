// Enroll only a reviewed, unchanged existing database; never replace business rows.
const path=require('node:path');
require('../server/node_modules/dotenv').config({path:path.join(process.env.ProgramData||'C:/ProgramData','NaniFrys/shop.env')});
if(process.env.SITE_MODE!=='shop')throw Error('This check is for the shop only');
const reference=process.argv[2];
if(!/^nanifrys_stage_\d+_shop$/.test(reference||''))throw Error('Supply the reviewed staging database name');
const {PrismaClient}=require('../server/node_modules/@prisma/client');
const db=require('../server/dist/prisma.js').default;
const staged=new PrismaClient({datasourceUrl:`mysql://root@127.0.0.1:3306/${reference}?connection_limit=2`});
const {snapshot,digest,models}=require('../server/dist/replica/protocol.js');
const {initializeReplica,readState,writeState}=require('../server/dist/replica/state.js');
async function main(){
 await initializeReplica();
 if(await readState('enrolled')||await readState('pending-batch'))throw Error('Already paired or has pending changes; no baseline replaced');
 const local=await db.$transaction(tx=>snapshot(tx),{isolationLevel:'RepeatableRead',timeout:60000});
 const expected=await staged.$transaction(tx=>snapshot(tx),{isolationLevel:'RepeatableRead',timeout:60000});
 if(digest(local)!==digest(expected))throw Error('Local data changed since the reviewed backup; reconcile before pairing');
 await writeState('staged-base',{fingerprint:digest(local),verifiedAt:new Date().toISOString(),reference});
 console.log('Existing shop base exactly matches the reviewed staging copy: '+models.map(m=>m+'='+local[m].length).join(', '));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>Promise.all([db.$disconnect(),staged.$disconnect()]));
