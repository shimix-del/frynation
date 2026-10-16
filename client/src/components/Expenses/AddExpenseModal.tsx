import React, { useState } from 'react';
import { X, TrendingDown, Flame, Carrot, Fuel, Users, Wrench, Bike, HelpCircle, Lock, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
}) => {
  if (!isOpen) return null;

  const { currentBranchId, currentBranch } = useBranch();

  const [category, setCategory] = useState<string>('MARKET_PRODUCE');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paidTo, setPaidTo] = useState<string>('');
  const [paymentSource, setPaymentSource] = useState<'CASH_DRAWER' | 'BANK_MPESA'>('CASH_DRAWER');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [securityPin, setSecurityPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'MARKET_PRODUCE', label: 'Wakulima / Veggies', icon: Carrot },
    { id: 'GAS_CHARCOAL', label: 'Gas Refill / Charcoal', icon: Flame },
    { id: 'COOKING_OIL', label: 'Cooking Oil Jerrycan', icon: Fuel },
    { id: 'DAILY_WAGES', label: 'Casual Staff Wages', icon: Users },
    { id: 'TRANSPORT_BODA', label: 'Boda / Delivery Transport', icon: Bike },
    { id: 'REPAIRS', label: 'Equipment Repairs', icon: Wrench },
    { id: 'OTHER', label: 'Other Operating Cost', icon: HelpCircle },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    if (securityPin.trim() !== '0099') {
      setError('🚨 Security Authorization Failed: Invalid security PIN code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api.createExpense({
        branchId: currentBranchId,
        category,
        amount: amt,
        description,
        paidTo: paidTo || undefined,
        paymentSource,
        receiptNumber: receiptNumber || undefined,
      });
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="font-bold text-white text-base">Record Daily Eatery Expense</h3>
              <p className="text-[11px] text-zinc-400">{currentBranch?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Expense Category *
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 text-xs font-bold ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500 text-white'
                        : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-red-400' : 'text-zinc-400'}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Expense Amount (KES) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 2800"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2.5 px-4 text-lg font-black text-red-400 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Payment Source */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Paid From (Source) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentSource('CASH_DRAWER')}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  paymentSource === 'CASH_DRAWER'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                Cash Drawer (Payout)
              </button>
              <button
                type="button"
                onClick={() => setPaymentSource('BANK_MPESA')}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  paymentSource === 'BANK_MPESA'
                    ? 'bg-safari-mpesa/20 border-safari-mpesa text-safari-mpesa'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                Owner M-Pesa / Bank
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Description / Details *
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 13kg Gas cylinder refill for main fryers"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Paid To (Vendor / Person)
              </label>
              <input
                type="text"
                value={paidTo}
                onChange={e => setPaidTo(e.target.value)}
                placeholder="e.g. TotalEnergies, Mama John"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Receipt / Invoice #
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                placeholder="e.g. TOT-8921"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Security Authorization PIN */}
          <div className="bg-zinc-800/80 p-3 rounded-2xl border border-zinc-700/80">
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Security Authorization PIN *</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">4 Digits</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={securityPin}
                onChange={e => {
                  setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setError(null);
                }}
                placeholder="Enter 4-digit security PIN"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-red-600/25 transition"
            >
              {isLoading ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
