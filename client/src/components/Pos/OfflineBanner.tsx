import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { isLocalMode } from '../../services/api';
import { offlineSync, OfflineOrder } from '../../services/offlineSync';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queue, setQueue] = useState<OfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [storageError, setStorageError] = useState('');

  const updateState = () => {
    setIsOnline(navigator.onLine);
    try { setQueue(offlineSync.getQueue()); setStorageError(''); }
    catch (e: any) { setStorageError(e.message); }
  };

  useEffect(() => {
    updateState();
    const sync = () => { if (!isLocalMode()) handleSync(true).catch(console.error); };
    const timer = setInterval(sync, 30000);
    window.addEventListener('online', sync);
    sync();
    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);
    window.addEventListener('nanifrys_offline_queue_updated', updateState);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      window.removeEventListener('nanifrys_offline_queue_updated', updateState);
    };
  }, []);

  const handleSync = async (silent = false) => {
    setIsSyncing(true);
    try {
      const res = await offlineSync.syncPendingOrders();
      if (res.synced > 0 && !silent) {
        alert(`Successfully synced ${res.synced} offline tickets!`);
      }
      if (res.errors.length && !silent) alert(res.errors.join('\n'));
      updateState();
    } catch (e: any) {
      if (!silent) alert(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && queue.length === 0 && !storageError) return null;

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 flex items-center justify-between text-xs font-semibold select-none">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>
          {storageError || (!isOnline
            ? 'Internet unavailable. The shop server can still confirm local sales; live updates will retry.'
            : `${queue.length} order(s) pending server confirmation.`)}
        </span>
      </div>

      {queue.length > 0 && (
        <button
          onClick={() => handleSync(false)}
          disabled={isSyncing || isLocalMode()}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold rounded-lg transition flex items-center space-x-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : `Sync ${queue.length} Now`}</span>
        </button>
      )}
    </div>
  );
};
