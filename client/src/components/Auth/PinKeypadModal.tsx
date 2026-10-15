import React, { useState, useEffect } from 'react';
import { X, KeyRound, Delete, CheckCircle2, Keyboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PinKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinKeypadModal: React.FC<PinKeypadModalProps> = ({ isOpen, onClose }) => {
  const { loginWithPin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        e.preventDefault();
        submitPin(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, isLoading]);

  if (!isOpen) return null;

  const handleInput = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(null);
      if (next.length === 4) {
        submitPin(next);
      }
    }
  };

  const submitPin = async (pinValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithPin(pinValue);
      setPin('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid PIN code');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-zinc-100 text-base">Switch Cashier PIN</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex justify-center space-x-3 mb-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > i ? 'bg-brand-500 border-brand-500 scale-110' : 'border-zinc-700 bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Physical Keyboard Input */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
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
              placeholder="Type PIN with keyboard..."
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-brand-500 rounded-xl py-2 px-3 text-center font-mono tracking-widest text-base font-bold text-white placeholder:text-zinc-500 placeholder:text-xs placeholder:tracking-normal focus:outline-none"
            />
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleInput(num.toString())}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-lg font-bold text-zinc-100 transition flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="h-12 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 transition flex items-center justify-center"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleInput('0')}
            disabled={isLoading}
            className="h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-lg font-bold text-zinc-100 transition flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin(prev => prev.slice(0, -1))}
            className="h-12 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 transition flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 text-center mt-3">
          Quick PINs: Robina: <span className="font-mono text-zinc-300">9999</span> | Manager: <span className="font-mono text-zinc-300">1111</span> | Cashiers: <span className="font-mono text-zinc-300">1234 / 2345</span>
        </div>
      </div>
    </div>
  );
};
