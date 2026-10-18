import React, { useState } from 'react';
import { X, Lock, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Shift } from '../../types';
import { api } from '../../services/api';
import { formatKES } from '../../utils/currency';

interface CloseShiftModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed: (zReport: any) => void;
}

const CloseShiftModalContent: React.FC<CloseShiftModalProps> = ({
  shift,
  isOpen,
  onClose,
  onShiftClosed,
}) => {
  if (!isOpen || !shift) return null;

  const expectedCash = shift.expectedCash || (shift.openingFloat + shift.totalCashSales);
  const [closingCashActual, setClosingCashActual] = useState<string>(expectedCash.toString());
  const [notes, setNotes] = useState<string>('End of shift cash drawer counted and closed');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const actualCount = parseFloat(closingCashActual) || 0;
  const variance = actualCount - expectedCash;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.closeShift({
        shiftId: shift.id,
        closingCashActual: actualCount,
        notes,
      });
      onShiftClosed(res.zReport);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close shift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="font-bold text-white text-base">Close Shift & Generate Z-Report</h3>
              <p className="text-[11px] text-zinc-400">{shift.branch?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCloseShift} className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Shift Summary Card */}
          <div className="p-3 bg-zinc-800/70 rounded-2xl border border-zinc-750 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Opening Float:</span>
              <span className="font-bold text-zinc-200">{formatKES(shift.openingFloat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Cash Sales:</span>
              <span className="font-bold text-emerald-400">{formatKES(shift.totalCashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total M-Pesa Sales:</span>
              <span className="font-bold text-safari-mpesa">{formatKES(shift.totalMpesaSales)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-700/80 font-black">
              <span className="text-zinc-300">Expected Cash in Drawer:</span>
              <span className="text-amber-400 text-sm">{formatKES(expectedCash)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Actual Physical Cash Counted in Drawer (KES) *
            </label>
            <input
              type="number"
              value={closingCashActual}
              onChange={e => setClosingCashActual(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2.5 px-4 text-xl font-black text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Variance result banner */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
              variance === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : variance < 0
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            <span>Cash Drawer Variance:</span>
            <span>
              {variance === 0
                ? '✓ 100% Balanced (Zero Variance)'
                : `${variance > 0 ? '+' : ''}${formatKES(variance)} (${
                    variance < 0 ? 'Cash Shortage' : 'Cash Overage'
                  })`}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Closing Handover Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Handed over to evening manager"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-lg shadow-red-600/25 transition flex items-center justify-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isLoading ? 'Closing...' : 'Close & Print Z-Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CloseShiftModal: React.FC<CloseShiftModalProps> = (props) => (
  props.isOpen && props.shift ? <CloseShiftModalContent {...props} /> : null
);
