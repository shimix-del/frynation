import { createRequestId } from '../utils/id';
import { api, isLocalMode } from './api';
const OFFLINE_QUEUE_KEY = 'nanifrys_pos_offline_orders';
export interface OfflineOrder { id: string; timestamp: string; orderData: any; retryCount: number; lastError?: string; }
let syncing: Promise<{ synced: number; failed: number; errors: string[] }> | null = null;
export const offlineSync = {
  isOnline: () => navigator.onLine,
  getQueue: (): OfflineOrder[] => {
    const data=localStorage.getItem(OFFLINE_QUEUE_KEY)||localStorage.getItem('simba_pos_offline_orders');
    if(!data)return[];
    const parsed=JSON.parse(data);if(!Array.isArray(parsed))throw new Error('Pending order storage is damaged. Export it before recovery.');return parsed;
  },
  saveQueue: (queue: OfflineOrder[]) => { localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(queue));localStorage.removeItem('simba_pos_offline_orders');window.dispatchEvent(new Event('nanifrys_offline_queue_updated')); },
  enqueueOrder: (data: any): OfflineOrder => {
    const queue=offlineSync.getQueue();const id=data.clientRequestId||createRequestId();
    const previous=queue.find(i=>i.id===id);if(previous)return previous;
    const item={id,timestamp:new Date().toISOString(),orderData:{...data,clientRequestId:id,isOfflineSynced:true},retryCount:0};
    offlineSync.saveQueue([...queue,item]);return item;
  },
  syncPendingOrders: (): Promise<{synced:number;failed:number;errors:string[]}> => {
    if(syncing)return syncing;
    const run=async()=>{
      // The loopback SQL server remains reachable when the PC has no internet.
      if(isLocalMode())return{synced:0,failed:0,errors:['Export legacy browser records and switch to the synchronized POS first.']};
      let synced=0,failed=0;const errors:string[]=[];
      const user=await api.getMe();
      for(const item of offlineSync.getQueue()){
        try{
          if(!item.orderData.cashierId||item.orderData.cashierId!==user.id)throw new Error('Sign in as the original cashier; legacy tickets require owner review.');
          if(!item.orderData.shiftId)throw new Error('Original shift is missing; owner review required.');
          const payload={...item.orderData,clientRequestId:item.orderData.clientRequestId||item.id};
          const result=payload.heldOrderId?await api.resumeOrder(payload.heldOrderId,payload):await api.createOrder(payload);
          if(!result?.order?.id)throw new Error('The central server did not confirm this order');
          offlineSync.saveQueue(offlineSync.getQueue().filter(i=>i.id!==item.id));synced++;
        }catch(e:any){failed++;errors.push(item.id+': '+e.message);
          offlineSync.saveQueue(offlineSync.getQueue().map(i=>i.id===item.id?{...i,retryCount:i.retryCount+1,lastError:e.message}:i));}
      }return{synced,failed,errors};
    };
    const guarded=async()=>navigator.locks?await navigator.locks.request('nanifrys-order-sync',async()=>await run()):await run();
    const pending=guarded().finally(()=>{syncing=null});syncing=pending;return pending;
  },
  clearQueue: () => { if(offlineSync.getQueue().length)throw new Error('Pending orders must be confirmed by the central server before removal.'); },
};
