import { useEffect, useState } from 'react';
export function ShopStatus() {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    let active = true, busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch('/api/system/status', { headers: { Authorization: `Bearer ${localStorage.getItem('nanifrys_pos_token') || ''}` }, signal: AbortSignal.timeout(4000) });
        if (response.ok && active) setState(await response.json());
      } catch { if (active) setState((previous: any) => previous ? { ...previous, localDatabase: 'unavailable' } : null); }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!['shop', 'cloud'].includes(state?.mode)) return null;
  const local = state.mode === 'shop';
  const time = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not yet';
  const warning = !state.ready || state.localDatabase !== 'connected' || state.backupState === 'failed' || state.syncState.includes('conflict');
  return <details className={`text-xs rounded-lg px-2 py-1 ${warning ? 'bg-red-950 text-red-200' : 'bg-zinc-800 text-zinc-100'}`}>
    <summary className="cursor-pointer">{local ? `Shop ${state.ready ? 'ready' : 'setup pending'} · ${state.pendingChanges ?? '—'} pending` : `Hosted copy · ${state.lastSync ? 'received' : 'waiting'}`}</summary>
    <div className="absolute top-16 right-2 bg-zinc-900 border border-zinc-600 p-4 rounded-xl shadow-xl z-50 max-w-sm space-y-2" role="status">
      <p>{local ? 'Local' : 'Hosted'} database: {state.localDatabase}</p>
      <p>Cloud: {state.syncState.replaceAll('-', ' ')}</p>
      <p>{local ? 'Last successful upload' : 'Last received from shop'}: {time(state.lastSync)}</p>
      {local ? <><p>Next sync attempt: {time(state.nextAttempt)}</p>
        <p>Backup: {state.backupState} · {time(state.lastBackup)}</p>
        <p>Sales continue locally without internet. Sync runs automatically every 20 minutes and retries after connection failures.</p>
        <p>Make staff, menu, and stock changes on this shop computer.</p></>
        : <p>The shop computer uploads changes securely. This website displays the last successfully received data; an offline shop can have newer records pending upload.</p>}
    </div>
  </details>;
}
