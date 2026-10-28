import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Delete } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApiBaseUrl, isLocalMode } from '../../services/api';

import naniLogo from '../../assets/logo.jpg';

export const LoginScreen: React.FC = () => {
  const { loginWithPin, logoutReason } = useAuth();
  const [setupError,setSetupError] = useState('');
  const [apiAddress, setApiAddress] = useState(localStorage.getItem('nanifrys_custom_api_url') || '');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  const LOCKOUT_KEY = 'nanifrys_auth_lockout';

  const getLockoutInfo = (): { count: number; lockedUntil: number; lastFailedAt: number } => {
    try {
      const raw = localStorage.getItem(LOCKOUT_KEY);
      return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0, lastFailedAt: 0 };
    } catch {
      return { count: 0, lockedUntil: 0, lastFailedAt: 0 };
    }
  };

  const setLockoutInfo = (info: { count: number; lockedUntil: number; lastFailedAt: number }) => {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(info));
  };

  useEffect(() => {
    const checkLockout = () => {
      const info = getLockoutInfo();
      if (info.lockedUntil && info.lockedUntil > Date.now()) {
        setLockoutRemaining(Math.ceil((info.lockedUntil - Date.now()) / 1000));
      } else {
        setLockoutRemaining(0);
        if (info.count >= 3 && info.lockedUntil > 0) {
          setLockoutInfo({ count: 0, lockedUntil: 0, lastFailedAt: 0 });
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const recordFailedAttempt = () => {
    const info = getLockoutInfo();
    const isOld = Date.now() - (info.lastFailedAt || 0) > 5 * 60 * 1000;
    const count = isOld ? 1 : (info.count || 0) + 1;

    if (count >= 3) {
      const lockedUntil = Date.now() + 5 * 60 * 1000;
      setLockoutInfo({ count: 3, lockedUntil, lastFailedAt: Date.now() });
      setLockoutRemaining(300);
      setError('🚨 Security Lockout: 3 failed attempts exceeded. Access blocked for 5 minutes.');
    } else {
      setLockoutInfo({ count, lockedUntil: 0, lastFailedAt: Date.now() });
      const left = 3 - count;
      setError(`Invalid PIN code. ${left} attempt${left === 1 ? '' : 's'} remaining before 5-minute security lockout.`);
    }
  };

  const clearFailedAttempts = async () => {
    localStorage.removeItem(LOCKOUT_KEY);
    setLockoutRemaining(0);
    setError(null);
    try {
      const apiBase = getApiBaseUrl();
      if (apiBase) {
        await fetch(`${apiBase}/auth/reset-lockout`, { method: 'POST' });
      }
    } catch {
      // ignore
    }
  };

  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (isLocalHost) {
      if (localStorage.getItem('nanifrys_mode') === 'local') {
        localStorage.removeItem('nanifrys_mode');
      }
    }
  }, [isLocalHost]);

  React.useEffect(() => {
    const checkServer = async () => {
      try {
        if (isLocalMode()) { setServerOnline(null); return; }
        const apiBase = getApiBaseUrl();
        if (!apiBase) {
          setServerOnline(true);
          return;
        }
        const res = await fetch(`${apiBase}/health`);
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  // Physical keyboard support for PIN mode
  useEffect(() => {
    if (isLoading || lockoutRemaining > 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinDelete();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handlePinClear();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        e.preventDefault();
        submitPin(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading, lockoutRemaining]);

  const handlePinInput = (num: string) => {
    if (lockoutRemaining > 0 || isLoading) return;
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    if (lockoutRemaining > 0 || isLoading) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const submitPin = async (pinToSubmit: string) => {
    if (lockoutRemaining > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await loginWithPin(pinToSubmit);
      clearFailedAttempts();
    } catch (err: any) {
      if (err.message?.includes('Shift in Progress') || err.message?.includes('Access Denied')) {
        setError(err.message);
      } else if (err.status === 0 || err.status >= 500 || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('The central server is unavailable. Check the server connection and retry.');
      } else {
        recordFailedAttempt();
      }
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-4 relative overflow-y-auto">
      <div className="relative z-10 w-full max-w-md mb-3 p-3 bg-zinc-900 rounded-xl border border-zinc-700 text-xs text-zinc-200">
        <p className="font-bold mb-2">{isLocalHost ? 'Local mode — shop database with two-way synchronization' : 'Live mode — shared POS database'}</p>
        {isLocalMode() && <div className="space-y-2 text-amber-300"><p>Browser-only trading has been retired. Export any old browser records before switching to the synchronized POS.</p><a className="underline block" href="./backup-local-data.html" target="_blank">Export legacy browser records</a><button className="p-2 bg-zinc-800 rounded" onClick={()=>{localStorage.removeItem('nanifrys_mode');window.location.reload();}}>Use synchronized POS</button></div>}
        {!isLocalMode() && <form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();try{const value=apiAddress.trim();if(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP or HTTPS API address without credentials.');if(window.location.protocol==='https:'&&url.protocol!=='https:')throw new Error('Use an HTTPS API address.');localStorage.setItem('nanifrys_custom_api_url',value.replace(/\/+$/,''));}else localStorage.removeItem('nanifrys_custom_api_url');window.location.reload();}catch(err:any){setSetupError(err.message);}}}>
          <label>POS server API address<input aria-label="POS server API address" type="url" value={apiAddress} onChange={e=>setApiAddress(e.target.value)} placeholder="Default: this site's /api" className="block w-full mt-1 p-2 bg-zinc-800 rounded" /></label>
          <button className="p-2 bg-zinc-800 rounded">Save connection</button><p role="alert">{setupError}</p>
        </form>}

      </div>
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-xl relative z-10 my-auto">
        {/* Brand Header & Prominent Center Logo */}
        <div className="text-center mb-4 sm:mb-6 flex flex-col items-center">
          <div className="relative mb-2.5 sm:mb-3 group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-brand-500 to-yellow-400 blur-md opacity-80 group-hover:opacity-100 transition duration-300"></div>
            <img
              src={naniLogo}
              alt="Nani's Fry Nation Logo"
              className="relative w-28 h-28 sm:w-40 sm:h-40 rounded-full object-cover shadow-2xl border-4 border-amber-400 bg-black block mx-auto"
            />
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center space-x-1.5">
            <span className="text-yellow-400">NANI'S</span>
            <span className="text-brand-500">FRY NATION</span>
          </h1>
          <p className="text-xs font-black text-amber-400 tracking-wider mt-1 uppercase">
            Crispy • Golden • Irresistible
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Hotel, Fast Food & Inventory POS</p>
        </div>



        {!isLocalMode() && serverOnline === true && (
          <div className="mb-4 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">POS server connected</span>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Online</span>
          </div>
        )}

        {!isLocalMode() && serverOnline === false && (
          <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-700 text-xs font-bold flex items-start space-x-2">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <div className="font-extrabold text-amber-300">POS server unavailable</div>
              <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                Check the server address and connection, then retry.
              </div>
            </div>
          </div>
        )}

        {logoutReason && (
          <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold text-center flex items-center justify-center space-x-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{logoutReason}</span>
          </div>
        )}

        {lockoutRemaining > 0 && (
          <div className="mb-4 p-3.5 bg-red-500/20 border-2 border-red-500/60 rounded-2xl text-red-300 text-xs text-center space-y-2">
            <div className="flex items-center justify-center space-x-1.5 text-red-400 font-black uppercase tracking-wider text-[11px]">
              <Shield className="w-4 h-4 text-red-400" />
              <span>🚨 Lockout Active</span>
            </div>
            <div className="text-xl font-mono font-black text-amber-400">
              {Math.floor(lockoutRemaining / 60)}m {(lockoutRemaining % 60).toString().padStart(2, '0')}s
            </div>
            <button
              type="button"
              onClick={clearFailedAttempts}
              className="mt-1 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg shadow text-xs transition"
            >
              Reset Lockout Now
            </button>
          </div>
        )}

        {error && !lockoutRemaining && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        {/* PIN Pad Login */}
        <div>
            {/* PIN Display circles */}
            <div className="flex justify-center space-x-3 mb-4">
              {[0, 1, 2, 3].map(index => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > index
                      ? 'bg-brand-500 border-brand-500 scale-110 shadow-md shadow-brand-500/50'
                      : 'border-zinc-700 bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* PIN Input Field */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  disabled={isLoading || lockoutRemaining > 0}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPin(cleaned);
                    setError(null);
                    if (cleaned.length === 4) {
                      submitPin(cleaned);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && pin.length >= 4) {
                      e.preventDefault();
                      submitPin(pin);
                    }
                  }}
                  placeholder={lockoutRemaining > 0 ? "System locked (5m timeout)..." : "Type PIN with keyboard & press Enter..."}
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-2.5 px-4 text-center font-mono tracking-widest text-lg font-bold text-white placeholder:text-zinc-500 placeholder:text-xs placeholder:tracking-normal focus:outline-none transition shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinInput(num.toString())}
                  disabled={isLoading || lockoutRemaining > 0}
                  className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 active:scale-95 text-xl font-black text-zinc-100 transition shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                disabled={isLoading || lockoutRemaining > 0}
                className="h-14 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                disabled={isLoading || lockoutRemaining > 0}
                className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 active:scale-95 text-xl font-black text-zinc-100 transition shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                disabled={isLoading || lockoutRemaining > 0}
                className="h-14 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Security Notice & Staff PIN guide */}
            <div className="border-t border-zinc-800/80 pt-3 text-center">
              <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-center space-x-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter your 4-digit staff PIN code to unlock POS</span>
              </div>
              <div className="bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-700/60 text-left">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 text-center">Staff PINs</div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-300">
                  <div>Robina (Owner): <strong className="text-white">9878</strong></div>
                  <div>Cashier 1: <strong className="text-white">1234</strong></div>
                  <div>Manager: <strong className="text-white">5609</strong></div>
                  <div>Cashier 2: <strong className="text-white">1349</strong></div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
