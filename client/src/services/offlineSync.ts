import { api } from './api';

const OFFLINE_QUEUE_KEY = 'nanifrys_pos_offline_orders';

export interface OfflineOrder {
  id: string;
  timestamp: string;
  orderData: any;
  retryCount: number;
}

export const offlineSync = {
  isOnline: (): boolean => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getQueue: (): OfflineOrder[] => {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY) || localStorage.getItem('simba_pos_offline_orders');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveQueue: (queue: OfflineOrder[]): void => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new Event('nanifrys_offline_queue_updated'));
    } catch (err) {
      console.error('Failed to save offline queue:', err);
    }
  },

  enqueueOrder: (orderData: any): OfflineOrder => {
    const queue = offlineSync.getQueue();
    const offlineItem: OfflineOrder = {
      id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      orderData: {
        ...orderData,
        isOfflineSynced: true,
      },
      retryCount: 0,
    };

    queue.push(offlineItem);
    offlineSync.saveQueue(queue);
    return offlineItem;
  },

  syncPendingOrders: async (): Promise<{ synced: number; failed: number; errors: string[] }> => {
    if (!offlineSync.isOnline()) {
      return { synced: 0, failed: 0, errors: ['Device is still offline'] };
    }

    const queue = offlineSync.getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    const remainingQueue: OfflineOrder[] = [];

    for (const item of queue) {
      try {
        await api.createOrder(item.orderData);
        synced++;
      } catch (err: any) {
        failed++;
        errors.push(`Order ${item.id}: ${err.message || 'Failed to sync'}`);
        item.retryCount++;
        // Never discard a failed secondary copy because a retry limit elapsed.
        remainingQueue.push(item);
      }
    }

    offlineSync.saveQueue(remainingQueue);
    return { synced, failed, errors };
  },

  clearQueue: (): void => {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    localStorage.removeItem('simba_pos_offline_orders');
    window.dispatchEvent(new Event('nanifrys_offline_queue_updated'));
  },
};
