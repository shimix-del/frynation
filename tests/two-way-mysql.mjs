// Explicit integration check: creates two isolated databases, never the shop database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const {PrismaClient}=require('../server/node_modules/@prisma/client');
const bcrypt=require('../server/node_modules/bcryptjs');
const stamp=Date.now(),shopName=`nanifrys_verify_${stamp}_shop`,cloudName=`nanifrys_verify_${stamp}_cloud`;
const url=name=>`mysql://root@127.0.0.1:3306/${name}?connection_limit=3`;
const secret=randomBytes(48).toString('hex'),jwt=randomBytes(48).toString('hex');
const admin=new PrismaClient({datasourceUrl:url('mysql')});
const actualFetch=globalThis.fetch,processes=[];
let shop,cloud;
try {
  for(const name of [shopName,cloudName]) {
    await admin.$executeRawUnsafe(`CREATE DATABASE ${name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','db','push','--skip-generate'],{cwd:path.join(root,'server'),env:{...process.env,DATABASE_URL:url(name)},windowsHide:true,encoding:'utf8'});
    assert.equal(result.status,0,'create isolated verification schema: '+result.stderr);
  }
  process.env.DATABASE_URL=url(shopName);process.env.SITE_MODE='shop';process.env.REPLICA_SECRET=secret;
  process.env.REPLICA_SHOP_ID='verification-shop';process.env.REPLICA_CLOUD_URL='https://cloud.test/api';
  shop=require('../server/dist/prisma.js').default;
  cloud=new PrismaClient({datasourceUrl:url(cloudName)});
  const state=require('../server/dist/replica/state.js'),protocol=require('../server/dist/replica/protocol.js');
  const worker=require('../server/dist/replica/worker.js'),bootstrap=require('../server/dist/replica/bootstrap.js');
  await state.initializeReplica();
  await cloud.$executeRawUnsafe('CREATE TABLE NaniReplicaState (id VARCHAR(191) PRIMARY KEY,body LONGTEXT NOT NULL) ENGINE=InnoDB');
  await state.writeState('receiver-lock',{},cloud);
  const pin='4826';
  await cloud.branch.create({data:{id:'verify-branch',name:'VERIFICATION ONLY',code:'VERIFY'}});
  await cloud.user.create({data:{id:'verify-owner',name:'Verification Owner',email:'verification@invalid.example',branchId:'verify-branch',role:'OWNER',pinCode:await bcrypt.hash(pin,10),passwordHash:'!disabled!'}});
  await cloud.category.create({data:{id:'verify-category',name:'Verification',code:'VERIFY'}});
  await cloud.menuItem.create({data:{id:'verify-dish',categoryId:'verify-category',name:'VERIFICATION ONLY',basePrice:100,costPrice:20}});
  await cloud.stockItem.create({data:{id:'verify-stock',branchId:'verify-branch',name:'Verification stock',currentStock:10,unit:'piece'}});
  await cloud.menuItemRecipe.create({data:{id:'verify-recipe',menuItemId:'verify-dish',stockItemId:'verify-stock',quantityRequired:1}});
  await cloud.activityLog.create({data:{id:'verify-null-details',actorId:'verify-owner',actorName:'Verification Owner',actorRole:'OWNER',branchId:'verify-branch',action:'VERIFICATION',entityType:'SYSTEM',details:require('../server/node_modules/@prisma/client').Prisma.DbNull}});
  function start(name,port,mode) {
    const child=spawn(process.execPath,['dist/index.js'],{cwd:path.join(root,'server'),env:{...process.env,DATABASE_URL:url(name),SITE_MODE:mode,PORT:String(port),BIND_HOST:'127.0.0.1',NODE_ENV:'production',JWT_SECRET:jwt,REPLICA_CLOUD_URL:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
    let errors='';child.stderr.on('data',d=>{errors+=d.toString()});child.stdout.on('data',d=>{errors+=d.toString()});child.on('error',e=>{errors+=e.message;});child.getErrors=()=>errors+' exit='+child.exitCode;processes.push(child);return child;
  }
  const cloudProcess=start(cloudName,15501,'cloud'),shopProcess=start(shopName,15502,'shop');
  for(const [port,child]of [[15501,cloudProcess],[15502,shopProcess]]){
    let healthy=false;
    for(let i=0;i<120;i++){try{healthy=(await actualFetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)})).ok;if(healthy)break;}catch{}await new Promise(r=>setTimeout(r,250));}
    assert.ok(healthy,'isolated backend startup: '+child.getErrors());
  }
  globalThis.fetch=(address,options)=>actualFetch(String(address).replace('https://cloud.test','http://127.0.0.1:15501'),options);
  await bootstrap.bootstrapShop();assert.ok(await state.readState('enrolled'));
  async function request(port,endpoint,body,token,method='POST'){
    const response=await actualFetch(`http://127.0.0.1:${port}/api${endpoint}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();assert.ok(response.ok,endpoint+': '+JSON.stringify(data));return data;
  }
  const localLogin=await request(15502,'/auth/login',{pinCode:pin}),liveLogin=await request(15501,'/auth/login',{pinCode:pin});
  const localShift=await request(15502,'/shifts/open',{branchId:'verify-branch',openingFloat:0},localLogin.token);
  const liveShift=await request(15501,'/shifts/open',{branchId:'verify-branch',openingFloat:0},liveLogin.token);
  const sale=(shift)=>({branchId:'verify-branch',shiftId:shift,cashierId:'verify-owner',clientRequestId:randomUUID(),items:[{menuItemId:'verify-dish',quantity:1,unitPrice:100}],payments:[{paymentMethod:'CASH',amount:100,cashTendered:100}]});
  await Promise.all([request(15502,'/orders',sale(localShift.shift.id),localLogin.token),request(15501,'/orders',sale(liveShift.shift.id),liveLogin.token)]);
  await worker.syncOnce();
  assert.equal(await cloud.order.count(),2,'both origins retained');assert.equal(await shop.order.count(),2,'cloud sale downloaded');
  assert.equal((await cloud.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,8,'both stock deductions merged');
  assert.equal((await shop.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,8,'local stock reconciled');
  assert.equal((await cloud.shift.aggregate({_sum:{totalCashSales:true}}))._sum.totalCashSales,200,'cash counters include both origins');
  console.log('PASS: simultaneous local/live sales, stock movements, payments, and separate drawers merge.');
  await request(15502,'/orders',sale(localShift.shift.id),localLogin.token);
  let loseAck=true;
  globalThis.fetch=async(address,options)=>{const result=await actualFetch(String(address).replace('https://cloud.test','http://127.0.0.1:15501'),options);if(loseAck&&options?.method==='POST'){loseAck=false;throw new Error('Simulated lost acknowledgement');}return result;};
  await assert.rejects(worker.syncOnce(),/lost acknowledgement/);assert.ok(await state.readState('pending-batch'));
  await worker.syncOnce();assert.equal(await cloud.order.count(),3,'retry did not duplicate sale');assert.equal(await state.readState('pending-batch'),null);
  assert.equal((await cloud.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,7);
  console.log('PASS: committed batch survives lost acknowledgement and retry without duplicate sales or stock deductions.');
  await request(15501,'/orders',sale(liveShift.shift.id),liveLogin.token);await worker.syncOnce();
  assert.equal(await shop.order.count(),4,'download runs even without local sales');
  assert.equal((await shop.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,6);
  console.log('PASS: remote-only sales pull down on synchronization.');
  const cancelled=await cloud.order.findFirst({where:{status:'COMPLETED'}});
  await Promise.all([request(15502,`/orders/${cancelled.id}/cancel`,null,localLogin.token,'DELETE'),request(15501,`/orders/${cancelled.id}/cancel`,null,liveLogin.token,'DELETE')]);
  await worker.syncOnce();
  assert.equal((await cloud.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,7,'concurrent cancellation restores stock once');
  assert.equal((await shop.stockItem.findUnique({where:{id:'verify-stock'}})).currentStock,7);
  assert.equal(await cloud.stockMovement.count({where:{reason:'CANCELLATION'}}),1);
  assert.equal((await cloud.shift.aggregate({_sum:{totalCashSales:true}}))._sum.totalCashSales,300);
  console.log('PASS: simultaneous cancellation restores stock once and reconciles drawer totals.');
  const next=worker.nextScheduledSync(Date.parse('2026-10-27T00:59:59Z'));
  assert.equal(new Date(next).toISOString(),'2026-10-27T01:00:00.000Z');
  assert.equal(worker.nextScheduledSync(next)-next,4*60*60*1000);
  console.log('PASS: six daily runs align with East Africa Time.');
  await shop.user.update({where:{id:'verify-owner'},data:{name:'Edited at shop'}});
  await cloud.user.update({where:{id:'verify-owner'},data:{name:'Edited live'}});
  await assert.rejects(worker.syncOnce(),/SYNC_CONFLICT/);
  assert.equal((await shop.user.findUnique({where:{id:'verify-owner'}})).name,'Edited at shop');
  assert.equal((await cloud.user.findUnique({where:{id:'verify-owner'}})).name,'Edited live');
  console.log('PASS: competing edits stop with both versions preserved.');
} finally {
  globalThis.fetch=actualFetch;await Promise.all(processes.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill();})));
  await Promise.allSettled([shop?.$disconnect(),cloud?.$disconnect()]);
  for(const name of [shopName,cloudName]){if(!/^nanifrys_verify_\d+_(shop|cloud)$/.test(name))throw Error('Unsafe test database name');await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name}`);}
  await admin.$disconnect();
}
