import React, { useState } from 'react';
import { X, Wallet, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { formatKES } from '../../utils/currency';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftOpened: () => void;
}

const OpenShiftModalContent: React.FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  onShiftOpened,
}) => {
  if (!isOpen) return null;

  const { currentBranchId, currentBranch } = useBranch();
  const [openingFloat, setOpeningFloat] = useState<string>('0');
  const [notes, setNotes] = useState<string>('Opening drawer float counted and verified');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const quickFloats = [0, 1000, 2000, 3000];

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.openShift({
        branchId: currentBranchId || undefined,
        openingFloat: parseFloat(openingFloat) || 0,
        notes,
      });
      onShiftOpened();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to open shift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-base">Open Cashier Shift</h3>
              <p className="text-[11px] text-zinc-400">{currentBranch?.name || 'Current Branch'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleOpen} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Opening Cash Float in Drawer (KES) *
            </label>
            <input
              type="number"
              value={openingFloat}
              onChange={e => setOpeningFloat(e.target.value)}
              placeholder="e.g. 0"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2.5 px-4 text-xl font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Float Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {quickFloats.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setOpeningFloat(f.toString())}
                className="py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-extrabold text-zinc-200 rounded-xl border border-zinc-700 transition"
              >
                {formatKES(f)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Shift Opening Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Morning cash float handed over"
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
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Opening...' : 'Start Active Shift'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OpenShiftModal: React.FC<OpenShiftModalProps> = (props) => (
  props.isOpen ? <OpenShiftModalContent {...props} /> : null
);
