import React, { useState } from 'react';
import { KeyRound, Mail, Lock, Store, Shield, ArrowRight, Sparkles, Delete } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import naniLogo from '../../assets/logo.jpg';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, loginWithPin } = useAuth();
  const [mode, setMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [pin, setPin] = useState<string>('');
  const [email, setEmail] = useState<string>('admin@nanifrys.co.ke');
  const [password, setPassword] = useState<string>('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  React.useEffect(() => {
    if (!isLocalHost) {
      // On GitHub Pages or remote URL, POS runs in cloud standalone mode
      setServerOnline(true);
      return;
    }

    const checkServer = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/health');
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, [isLocalHost]);

  const handlePinInput = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        // Auto-submit when 4 digits reached
        submitPin(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin('');
  };

  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithPin(pinToSubmit);
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('⚠️ POS Backend Server (Port 5000) or MySQL is offline. Please double-click "run_pos.bat" in the pos sys folder to start the system.');
      } else {
        setError(err.message || 'Invalid PIN code. Try demo PINs: 9999 or 1234');
      }
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check email & password.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogins = [
    { label: 'Robina (Owner)', pin: '9999', role: 'OWNER', badge: 'Migadini' },
    { label: 'Manager', pin: '1111', role: 'MANAGER', badge: 'Migadini' },
    { label: 'Cashier 1', pin: '1234', role: 'CASHIER', badge: 'Migadini' },
    { label: 'Cashier 2', pin: '2345', role: 'CASHIER', badge: 'Migadini' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-4 relative overflow-y-auto">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 my-auto">
        {/* Brand Header & Prominent Center Logo */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative mb-3 group">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 via-brand-500 to-yellow-400 blur-md opacity-80 group-hover:opacity-100 transition duration-300"></div>
            <img
              src={naniLogo}
              alt="Nani's Fry Nation Logo"
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover shadow-2xl border-4 border-amber-400 bg-black block mx-auto"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center space-x-1.5">
            <span className="text-yellow-400">NANI'S</span>
            <span className="text-brand-500">FRY NATION</span>
          </h1>
          <p className="text-xs font-black text-amber-400 tracking-wider mt-1 uppercase">
            Crispy • Golden • Irresistible
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Hotel, Fast Food & Inventory POS</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-zinc-800/80 p-1 rounded-xl mb-6 border border-zinc-700/60">
          <button
            onClick={() => { setMode('PIN'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              mode === 'PIN' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Fast PIN Login</span>
          </button>
          <button
            onClick={() => { setMode('PASSWORD'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              mode === 'PASSWORD' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email / Password</span>
          </button>
        </div>

        {!isLocalHost && (
          <div className="mb-4 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">Live Cloud POS (Offline-Ready)</span>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium">Online</span>
          </div>
        )}

        {isLocalHost && serverOnline === false && (
          <div className="mb-4 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-700 text-xs font-bold flex items-start space-x-2">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <div className="font-extrabold text-amber-800">Local POS Backend (Port 5000) is Offline</div>
              <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                Double-click <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono font-bold text-amber-900">run_pos.bat</code> in the project folder to start the database &amp; server.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        {/* PIN Pad Mode */}
        {mode === 'PIN' ? (
          <div>
            {/* PIN Display circles */}
            <div className="flex justify-center space-x-3 mb-6">
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

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinInput(num.toString())}
                  disabled={isLoading}
                  className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 active:scale-95 text-xl font-black text-zinc-100 transition shadow-sm flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handlePinClear}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 transition flex items-center justify-center"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 active:scale-95 text-xl font-black text-zinc-100 transition shadow-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Staff Logins */}
            <div className="border-t border-zinc-800/80 pt-4">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-2">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>1-Tap Demo Staff Switch:</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickDemoLogins.map(staff => (
                  <button
                    key={staff.pin}
                    type="button"
                    onClick={() => submitPin(staff.pin)}
                    className="p-2 bg-zinc-800/70 hover:bg-zinc-750 border border-zinc-700/60 rounded-xl text-left transition hover:border-brand-500/50 group"
                  >
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-brand-400 truncate">
                      {staff.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-0.5">
                      <span>{staff.badge}</span>
                      <span className="font-mono text-zinc-500 bg-zinc-900 px-1 rounded">PIN {staff.pin}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Email & Password Mode */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@nanifrys.co.ke"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In as Admin / Owner'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-zinc-500 mt-2">
              Default Admin: <span className="text-zinc-300 font-mono">admin@nanifrys.co.ke</span> / <span className="text-zinc-300 font-mono">admin123</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
