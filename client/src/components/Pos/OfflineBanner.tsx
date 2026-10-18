import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { offlineSync, OfflineOrder } from '../../services/offlineSync';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queue, setQueue] = useState<OfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateState = () => {
    setIsOnline(navigator.onLine);
    setQueue(offlineSync.getQueue());
  };

  useEffect(() => {
    updateState();
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);
    window.addEventListener('nanifrys_offline_queue_updated', updateState);

    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      window.removeEventListener('nanifrys_offline_queue_updated', updateState);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await offlineSync.syncPendingOrders();
      if (res.synced > 0) {
        alert(`Successfully synced ${res.synced} offline tickets!`);
      }
      updateState();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && queue.length === 0) return null;

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 flex items-center justify-between text-xs font-semibold select-none">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>
          {!isOnline
            ? 'Connection lost. Your cart stays on screen; SQL must confirm checkout.'
            : `Back Online! ${queue.length} order(s) pending sync to central server.`}
        </span>
      </div>

      {queue.length > 0 && (
        <button
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold rounded-lg transition flex items-center space-x-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : `Sync ${queue.length} Now`}</span>
        </button>
      )}
    </div>
  );
};
