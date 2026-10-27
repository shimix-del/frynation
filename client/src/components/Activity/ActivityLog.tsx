import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { offlineSync, OfflineOrder } from '../../services/offlineSync';
import { formatKenyaDateTime } from '../../utils/currency';

export const ActivityLog: React.FC = () => {
  const { currentBranchId } = useBranch();
  const [entries, setEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [actorId, setActorId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<OfflineOrder[]>([]);

  const filters = () => ({
    ...(currentBranchId ? { branchId: currentBranchId } : {}),
    ...(actorId ? { actorId } : {}), ...(shiftId ? { shiftId } : {}), ...(action ? { action } : {}),
    ...(from ? { from: new Date(`${from}T00:00:00+03:00`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59.999+03:00`).toISOString() } : {}),
  });
  useEffect(() => { setShiftId(''); }, [currentBranchId]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setEntries([]); setCursor(null);
    Promise.all([
      api.getActivity(filters()), api.getUsers(),
      api.getShiftHistory({ branchId: currentBranchId || undefined, limit: 200 }),
    ]).then(([data, people, history]) => {
      if (active) { setEntries(data.entries); setCursor(data.nextCursor); setUsers(people); setShifts(history); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentBranchId, actorId, shiftId, from, to, action, refresh]);
  useEffect(() => {
    const update = () => { try { setPending(offlineSync.getQueue()); } catch(e:any) { setError(e.message); } };
    update(); window.addEventListener('nanifrys_offline_queue_updated', update);
    return () => window.removeEventListener('nanifrys_offline_queue_updated', update);
  }, []);
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(pending, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nanifrys-pending-sales.json'; link.click(); URL.revokeObjectURL(url);
  };
  const loadMore = async () => {
    if (!cursor) return;
    setLoading(true); setError('');
    try { const data = await api.getActivity({ ...filters(), cursor }); setEntries(prev => [...prev, ...data.entries]); setCursor(data.nextCursor); }
    catch(e:any) { setError(e.message); } finally { setLoading(false); }
  };
  const field = 'bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 w-full';
  return <section className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-950 text-zinc-100">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">User &amp; Shift Activity</h1><p className="text-sm text-zinc-400">Sales, stock movements, cash, expenses, and staff actions by user and shift.</p></div>
      <button className="px-4 py-2 rounded-lg bg-amber-600 text-white" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Refresh</button>
    </div>
    <p className="text-xs text-zinc-400">Activity from all users and cashiers is recorded from this update onward and shared at the next successful exchange. Historical actions cannot be reconstructed. Times shown in East Africa Time.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <label className="text-xs space-y-1">User<select aria-label="Filter activity by user" className={field} value={actorId} onChange={e => setActorId(e.target.value)}><option value="">All users</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label className="text-xs space-y-1">Shift<select aria-label="Filter activity by shift" className={field} value={shiftId} onChange={e => setShiftId(e.target.value)}><option value="">All shifts</option>{shifts.map(s => <option key={s.id} value={s.id}>{s.cashier?.name} · {formatKenyaDateTime(s.openedAt)} · {s.status}</option>)}</select></label>
      <label className="text-xs space-y-1">From<input type="date" className={field} value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label className="text-xs space-y-1">To<input type="date" className={field} value={to} onChange={e => setTo(e.target.value)} /></label>
      <label className="text-xs space-y-1">Action<select className={field} value={action} onChange={e => setAction(e.target.value)}><option value="">All actions</option>{['LOGIN','LOGOUT','ORDER_COMPLETED','ORDER_HELD','ORDER_RESUMED','ORDER_CANCELLED','SHIFT_OPENED','SHIFT_CLOSED','CASH_FLOAT_IN','CASH_CASH_DROP','CASH_PAYOUT','EXPENSE_CREATED','EXPENSE_REVERSED','STOCK_DEDUCTED','STOCK_RESTORED','STOCK_RESTOCKED','STOCK_AUDITED','STOCK_TRANSFER_OUT','STOCK_TRANSFER_IN','STAFF_CREATED','STAFF_UPDATED'].map(a => <option key={a} value={a}>{a.split('_').join(' ')}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="p-3 rounded-lg bg-red-900/30 text-red-300">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm text-left"><thead className="bg-zinc-900 text-zinc-400"><tr>{['Time','User','Action','Shift','Details'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{entries.map(e => <tr key={e.id} className="border-t border-zinc-800 align-top"><td className="p-3 whitespace-nowrap">{formatKenyaDateTime(e.createdAt)}</td><td className="p-3">{e.actorName}<span className="block text-xs text-zinc-500">{e.actorRole}</span></td><td className="p-3">{e.action.split('_').join(' ')}</td><td className="p-3 text-xs break-all">{e.shiftId || 'Outside shift'}</td><td className="p-3 text-xs text-zinc-300 max-w-lg break-words">{Object.entries(e.details || {}).map(([key,value]) => <div key={key}><span className="text-zinc-500">{key}: </span>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</div>)}</td></tr>)}</tbody>
      </table>
      {!entries.length && <p className="p-6 text-zinc-400">{loading ? 'Loading activity…' : error ? 'Activity is unavailable.' : 'No activity matches these filters.'}</p>}
    </div>
    {cursor && <button className="px-4 py-2 rounded-lg bg-zinc-800" onClick={loadMore} disabled={loading}>Load more</button>}
    {pending.length > 0 && <div className="p-4 border border-amber-700 rounded-xl space-y-2"><h2 className="font-bold">Pending central sales on this device ({pending.length})</h2><p className="text-sm text-zinc-400">Tickets stay here until the central server confirms them. Sign in as the original cashier to sync. Tickets from closed shifts need owner review.</p>{pending.map(p => <p key={p.id} className="text-xs break-all">{p.id} · Attempts: {p.retryCount} · {p.lastError || 'Waiting to synchronize'}</p>)}<button className="px-3 py-2 bg-zinc-800 rounded-lg text-sm" onClick={download}>Export pending sales for review</button></div>}
  </section>;
};
