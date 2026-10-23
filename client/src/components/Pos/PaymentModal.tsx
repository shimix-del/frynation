import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  Smartphone,
  CreditCard,
  Split,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { usePosCart } from '../../context/PosCartContext';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { offlineSync } from '../../services/offlineSync';
import { formatKES } from '../../utils/currency';
import { Order } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order, warnings: string[]) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted,
}) => {
  if (!isOpen) return null;

  const {
    cartItems,
    orderType,
    tableNumber,
    customerName,
    customerPhone,
    discountAmount,
    discountReason,
    subtotal,
    totalAmount,
    notes,
    clearCart,
  } = usePosCart();

  const { currentBranch, currentBranchId } = useBranch();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'SPLIT' | 'CARD'>('CASH');
  
  // Cash details
  const [cashTendered, setCashTendered] = useState<number>(totalAmount);
  
  // Split details
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totalAmount / 2));
  const [splitMpesa, setSplitMpesa] = useState<number>(totalAmount - Math.floor(totalAmount / 2));

  // Card details
  const [cardRef, setCardRef] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick cash note buttons
  const cashNotes = [100, 200, 500, 1000, 2000];

  const changeAmount = Math.max(0, cashTendered - totalAmount);
  const splitRemaining = totalAmount - (splitCash + splitMpesa);

  const handleProcessCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    // Prepare payments array
    const paymentsPayload: any[] = [];

    if (paymentMethod === 'CASH') {
      if (cashTendered < totalAmount) {
        setError(`Cash tendered (${formatKES(cashTendered)}) is less than total amount (${formatKES(totalAmount)})`);
        setIsSubmitting(false);
        return;
      }
      paymentsPayload.push({
        amount: totalAmount,
        paymentMethod: 'CASH',
        cashTendered,
        changeAmount,
      });
    } else if (paymentMethod === 'MPESA') {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const randLetters = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
      const randNums = Math.floor(1000 + Math.random() * 9000);
      const autoCode = `QHK${randNums}${randLetters.slice(0, 3)}`;

      paymentsPayload.push({
        amount: totalAmount,
        paymentMethod: 'MPESA',
        mpesaCode: autoCode,
      });
    } else if (paymentMethod === 'SPLIT') {
      if (splitRemaining !== 0) {
        setError(`Split amounts must equal total (${formatKES(totalAmount)}). Current diff: ${formatKES(splitRemaining)}`);
        setIsSubmitting(false);
        return;
      }
      if (splitCash > 0) {
        paymentsPayload.push({
          amount: splitCash,
          paymentMethod: 'CASH',
          cashTendered: splitCash,
          changeAmount: 0,
        });
      }
      if (splitMpesa > 0) {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const randLetters = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
        const randNums = Math.floor(1000 + Math.random() * 9000);
        const autoCode = `QHK${randNums}${randLetters.slice(0, 3)}`;

        paymentsPayload.push({
          amount: splitMpesa,
          paymentMethod: 'MPESA',
          mpesaCode: autoCode,
        });
      }
    } else if (paymentMethod === 'CARD') {
      paymentsPayload.push({
        amount: totalAmount,
        paymentMethod: 'CARD',
        cardRef: cardRef || `POS-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }

    const orderPayload = {
      branchId: currentBranchId,
      orderType,
      tableNumber: orderType === 'DINE_IN' ? tableNumber : null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      items: cartItems.map(ci => ({
        menuItemId: ci.menuItem.id,
        variantId: ci.variant?.id || null,
        itemName: ci.menuItem.name,
        variantName: ci.variant?.name || null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        unitCost: ci.unitCost,
        totalPrice: ci.quantity * ci.unitPrice,
        notes: ci.notes || null,
      })),
      subtotal,
      discountAmount,
      discountReason,
      totalAmount,
      notes,
      payments: paymentsPayload,
    };

    try {
      const res = await api.createOrder(orderPayload);
      clearCart();
      onClose();
      onOrderCompleted(res.order, res.warnings || []);
    } catch (err: any) {
      console.warn('Backend order submission failed, falling back to local offline queue:', err);
      // Offline mode: enqueue locally so it syncs when backend is reachable
      const offlineItem = offlineSync.enqueueOrder(orderPayload);
      const mockCompletedOrder: any = {
        id: offlineItem.id,
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        branchId: currentBranchId || '',
        branch: currentBranch || undefined,
        cashierId: user?.id || '',
        cashier: { name: user?.name || 'Cashier' },
        orderType,
        tableNumber,
        customerName,
        customerPhone,
        status: 'COMPLETED',
        subtotal,
        discountAmount,
        taxAmount: 0,
        totalAmount,
        items: orderPayload.items.map(i => ({ ...i, totalPrice: i.quantity * i.unitPrice })),
        payments: paymentsPayload,
        createdAt: new Date().toISOString(),
      };

      clearCart();
      onClose();
      onOrderCompleted(mockCompletedOrder, ['Order saved locally in offline queue and will sync to central server.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-safari-mpesa/20 border border-safari-mpesa/40 flex items-center justify-center text-safari-mpesa font-black">
              KES
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {currentBranch?.name || 'POS Checkout'}
              </span>
              <h3 className="text-lg font-black text-white">Payment & Receipt</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount to Pay Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 font-semibold">Total Amount Due</span>
            <div className="text-2xl sm:text-3xl font-black text-brand-500 dark:text-brand-400">
              {formatKES(totalAmount)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-medium">Order Type</span>
            <div className="text-xs font-bold text-zinc-200 capitalize">
              {orderType.replace('_', ' ').toLowerCase()}{' '}
              {orderType === 'DINE_IN' ? `(${tableNumber})` : ''}
            </div>
          </div>
        </div>

        {/* Delivery details banner */}
        {orderType === 'DELIVERY' && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-400">🛵 Delivery:</span>
              <span className="text-zinc-200 font-semibold">{customerName || 'No Name'}</span>
              <span className="text-zinc-300 font-mono font-bold">({customerPhone || 'No Phone'})</span>
            </div>
            {!customerPhone && (
              <span className="text-[10px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded font-bold">
                Phone recommended for delivery
              </span>
            )}
          </div>
        )}

        {/* Payment Methods Tabs */}
        <div className="p-3 bg-zinc-950/60 border-b border-zinc-800">
          <div className="grid grid-cols-4 gap-1.5 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => { setPaymentMethod('CASH'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
                paymentMethod === 'CASH'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>

            <button
              onClick={() => { setPaymentMethod('MPESA'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
                paymentMethod === 'MPESA'
                  ? 'bg-safari-mpesa text-white shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>M-Pesa</span>
            </button>

            <button
              onClick={() => { setPaymentMethod('SPLIT'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
                paymentMethod === 'SPLIT'
                  ? 'bg-brand-500 text-white shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Split className="w-4 h-4" />
              <span>Split</span>
            </button>

            <button
              onClick={() => { setPaymentMethod('CARD'); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 ${
                paymentMethod === 'CARD'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Method Specific Inputs */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CASH TAB */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Cash Received / Tendered (KES)
                </label>
                <input
                  type="number"
                  value={cashTendered || ''}
                  onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2.5 px-4 text-xl font-black text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick Note Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashTendered(totalAmount)}
                  className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-extrabold rounded-xl border border-zinc-700/80"
                >
                  Exact
                </button>
                {cashNotes.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCashTendered(prev => (prev < totalAmount ? n : prev + n))}
                    className="py-2 bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 text-xs font-black rounded-xl border border-zinc-700/60"
                  >
                    +{n}
                  </button>
                ))}
              </div>

              {/* Change calculation badge */}
              <div className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-750 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Change to Return Customer:</span>
                <span
                  className={`text-lg font-black ${
                    cashTendered >= totalAmount ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {cashTendered >= totalAmount
                    ? formatKES(changeAmount)
                    : `Short by ${formatKES(totalAmount - cashTendered)}`}
                </span>
              </div>
            </div>
          )}

          {/* M-PESA TAB */}
          {paymentMethod === 'MPESA' && (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-safari-mpesa/10 border border-safari-mpesa/30 flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-safari-mpesa/20 text-safari-mpesa flex items-center justify-center">
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold text-safari-mpesa uppercase tracking-wider">
                    Lipa na M-Pesa — Pochi la Biashara
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    Pochi No: <span className="text-safari-mpesa font-mono tracking-wider">0143285625</span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-750 text-left space-y-1">
                    <p className="font-bold text-zinc-200">How to pay:</p>
                    <p>1. Go to M-Pesa on phone &gt; Lipa na M-Pesa</p>
                    <p>2. Select <span className="text-safari-mpesa font-bold">Pochi la Biashara</span></p>
                    <p>3. Enter Mobile Number: <span className="font-bold text-white font-mono">0143285625</span></p>
                    <p>4. Enter Amount: <span className="font-bold text-safari-mpesa">{formatKES(totalAmount)}</span> &amp; complete</p>
                  </div>
                </div>

                <div className="w-full bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-semibold">Amount to Receive:</span>
                  <span className="text-base font-black text-safari-mpesa">{formatKES(totalAmount)}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-[11px] text-zinc-400 text-center">
                ✓ Recorded automatically as <span className="text-safari-mpesa font-bold">M-Pesa (Pochi) Payment</span> in your shift and receipt.
              </div>
            </div>
          )}

          {/* SPLIT TAB */}
          {paymentMethod === 'SPLIT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Cash Portion (KES)
                  </label>
                  <input
                    type="number"
                    value={splitCash || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setSplitCash(val);
                      setSplitMpesa(Math.max(0, totalAmount - val));
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2 px-3 text-sm font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-safari-mpesa mb-1">
                    M-Pesa Portion (KES)
                  </label>
                  <input
                    type="number"
                    value={splitMpesa || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setSplitMpesa(val);
                      setSplitCash(Math.max(0, totalAmount - val));
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2 px-3 text-sm font-black text-safari-mpesa focus:outline-none focus:border-safari-mpesa"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-safari-mpesa/10 border border-safari-mpesa/25 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-safari-mpesa block">Pochi la Biashara</span>
                  <span className="text-xs font-black text-white font-mono">0143285625</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block">M-Pesa Portion</span>
                  <span className="text-xs font-black text-safari-mpesa">{formatKES(splitMpesa)}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-750 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-semibold">Total Split Balance:</span>
                <span
                  className={`font-black ${
                    splitRemaining === 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {splitRemaining === 0
                    ? '✓ Balanced'
                    : `Unallocated: ${formatKES(splitRemaining)}`}
                </span>
              </div>
            </div>
          )}

          {/* CARD TAB */}
          {paymentMethod === 'CARD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Card Authorization / Slip Ref Number
                </label>
                <input
                  type="text"
                  value={cardRef}
                  onChange={e => setCardRef(e.target.value)}
                  placeholder="e.g. AUTH-9042-VISA"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2.5 px-4 text-sm font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Complete Checkout */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleProcessCheckout}
            disabled={isSubmitting || (paymentMethod === 'SPLIT' && splitRemaining !== 0)}
            className="flex-1 py-3 px-4 bg-safari-mpesa hover:bg-safari-mpesaDark active:scale-[0.98] disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-xl shadow-safari-mpesa/25 transition flex items-center justify-center space-x-2 text-xs sm:text-sm"
          >
            <span>{isSubmitting ? 'Finalizing Order...' : `Complete & Print Receipt (${formatKES(totalAmount)})`}</span>
            <Receipt className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
