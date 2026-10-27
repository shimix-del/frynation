import React, { useEffect, useRef, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { api, setAnalyticsToken } from '../../services/api';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const OwnerAnalyticsGate: React.FC = () => {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(expiry.current); setAnalyticsToken(''); }, []);
  const lock = () => { clearTimeout(expiry.current); setAnalyticsToken(''); setUnlocked(false); setPin(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api.unlockAnalytics(pin);
      setAnalyticsToken(result.token); setPin(''); setUnlocked(true);
      expiry.current = setTimeout(lock, result.expiresIn * 1000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to unlock. Please retry.'); }
    finally { setBusy(false); }
  };
  if (unlocked) return <><div className="flex justify-end px-4 py-2 bg-zinc-900"><button onClick={lock} className="text-sm text-amber-300">Lock Sales &amp; Analytics</button></div><AnalyticsDashboard /></>;
  return <div className="flex flex-1 items-center justify-center p-5"><form onSubmit={submit} className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 space-y-4">
    <LockKeyhole className="text-brand-400 mx-auto" size={36} /><h2 className="text-xl font-bold text-center">Sales &amp; Analytics</h2>
    <p className="text-sm text-zinc-400 text-center">Enter the owner’s section PIN to view sales and reports.</p>
    <label className="block text-sm">Owner section PIN<input autoFocus aria-label="Sales & Analytics PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className="block w-full mt-2 p-3 bg-zinc-800 border border-zinc-600 rounded-xl text-center text-2xl tracking-widest" /></label>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button disabled={busy || pin.length !== 4} className="w-full p-3 bg-brand-500 rounded-xl font-bold disabled:opacity-50">{busy ? 'Checking…' : 'Unlock Sales & Analytics'}</button>
  </form></div>;
};
