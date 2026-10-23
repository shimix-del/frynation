import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Utensils,
  Package,
  Bike,
  Tag,
  PauseCircle,
  ArrowRight,
  User,
  Phone,
  Layers,
  X,
  Smartphone,
  Printer,
  Receipt,
} from 'lucide-react';
import { usePosCart } from '../../context/PosCartContext';
import { formatKES } from '../../utils/currency';

interface CartSidebarProps {
  onOpenPaymentModal: () => void;
  onOpenHeldOrders: () => void;
  onOpenPastOrders?: () => void;
  onClose?: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  onOpenPaymentModal,
  onOpenHeldOrders,
  onOpenPastOrders,
  onClose,
}) => {
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
    heldOrders,
    updateQuantity,
    removeItem,
    setOrderType,
    setTableNumber,
    setCustomerInfo,
    setDiscount,
    clearCart,
    holdCurrentCart,
  } = usePosCart();

  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [discountInputType, setDiscountInputType] = useState<'PERCENT' | 'AMOUNT'>('AMOUNT');
  const [discountVal, setDiscountVal] = useState<string>('');
  const [discountReasonInput, setDiscountReasonInput] = useState<string>('');
  const [isHolding, setIsHolding] = useState<boolean>(false);

  const quickTables = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'];

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountVal) || 0;
    setDiscount(discountInputType, val, discountReasonInput || 'Manager approved discount');
    setShowDiscountModal(false);
  };

  const handleHoldOrder = async () => {
    if (cartItems.length === 0) return;
    setIsHolding(true);
    try {
      const success = await holdCurrentCart();
      if (success) {
        // notification
      }
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <div className="w-full lg:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full select-none justify-between">
      {/* Mobile Back to Menu Bar with Instant Pay Button */}
      {onClose && (
        <div className="lg:hidden p-2.5 bg-zinc-850 border-b border-zinc-750 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center space-x-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 py-1.5 px-2.5 rounded-xl bg-zinc-800 border border-zinc-700"
          >
            <span>← Back to Menu</span>
          </button>
          
          <button
            type="button"
            onClick={onOpenPaymentModal}
            disabled={cartItems.length === 0}
            className="flex items-center space-x-1.5 text-xs font-black text-white bg-safari-mpesa hover:bg-safari-mpesaDark active:scale-95 py-1.5 px-3 rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Pay ({formatKES(totalAmount)})</span>
          </button>
        </div>
      )}

      {/* Header: Order Type & Held Tickets */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/90 space-y-2.5">
        {/* Order Type Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex bg-zinc-800 p-1 rounded-xl w-full border border-zinc-700/60">
            <button
              onClick={() => setOrderType('DINE_IN')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                orderType === 'DINE_IN'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dine-In</span>
            </button>
            <button
              onClick={() => setOrderType('TAKEAWAY')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                orderType === 'TAKEAWAY'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
            <button
              onClick={() => setOrderType('DELIVERY')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                orderType === 'DELIVERY'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>
        </div>

        {/* Held Orders Recall & Past Receipts Buttons */}
        <div className="flex items-center space-x-2">
          {heldOrders.length > 0 && (
            <button
              onClick={onOpenHeldOrders}
              className="flex-1 py-1.5 px-3 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-between transition animate-pulse"
            >
              <span className="flex items-center space-x-1.5 truncate">
                <PauseCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{heldOrders.length} Held</span>
              </span>
              <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded-full font-extrabold shrink-0">
                Resume &gt;
              </span>
            </button>
          )}

          {onOpenPastOrders && (
            <button
              type="button"
              onClick={onOpenPastOrders}
              className={`${heldOrders.length > 0 ? '' : 'w-full'} py-1.5 px-3 bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/80 text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition`}
              title="View past orders & reprint thermal receipts"
            >
              <Printer className="w-3.5 h-3.5 text-brand-400" />
              <span>Past Receipts / Reprint</span>
            </button>
          )}
        </div>

        {/* Table Selector (for Dine-In) or Customer Details */}
        {orderType === 'DINE_IN' ? (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickTables.map(t => (
              <button
                key={t}
                onClick={() => setTableNumber(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border ${
                  tableNumber === t
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {orderType === 'DELIVERY' && (
              <div className="flex items-center justify-between text-[10px] font-bold text-brand-400">
                <span>Delivery Customer Info</span>
                <span className="text-[9px] text-zinc-400 font-normal">Required for receipt & rider</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerInfo(e.target.value, customerPhone)}
                  placeholder="Customer Name"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="relative">
                <Phone className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerInfo(customerName, e.target.value)}
                  placeholder="Phone (07...)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
            <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center text-2xl text-zinc-600">
              🛒
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400">Order cart is empty</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Tap menu items on the left to add</p>
            </div>
          </div>
        ) : (
          cartItems.map((item, idx) => (
            <div
              key={`${item.menuItem.id}-${item.variant?.id || 'base'}-${idx}`}
              className="bg-zinc-800/70 border border-zinc-700/60 rounded-2xl p-2.5 flex flex-col justify-between group transition hover:border-zinc-600"
            >
              <div className="flex items-start justify-between">
                <div className="pr-2">
                  <h5 className="font-bold text-xs text-zinc-100 leading-tight">
                    {item.menuItem.name}
                  </h5>
                  {item.variant && (
                    <span className="text-[10px] font-semibold text-brand-400">
                      {item.variant.name}
                    </span>
                  )}
                  {item.notes && (
                    <div className="text-[10px] text-amber-400/90 italic mt-0.5">
                      Note: {item.notes}
                    </div>
                  )}
                  <div className="text-[11px] text-zinc-400 font-semibold mt-0.5">
                    {formatKES(item.unitPrice)} each
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-extrabold text-xs text-zinc-100">
                    {formatKES(item.unitPrice * item.quantity)}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition mt-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="mt-2 pt-2 border-t border-zinc-750 flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-400">Qty:</span>
                <div className="flex items-center space-x-2 bg-zinc-900/80 px-1.5 py-0.5 rounded-xl border border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-black text-zinc-100 w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white flex items-center justify-center font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Action Buttons */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 z-20 shadow-2xl space-y-2.5">
        {/* Subtotal, Discount & Total */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Subtotal</span>
            <span className="font-semibold text-zinc-200">{formatKES(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center space-x-1">
                <span>Discount ({discountReason || 'Promo'})</span>
              </span>
              <span>- {formatKES(discountAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-750 text-sm font-black text-zinc-100">
            <span>Total to Pay</span>
            <span className="text-brand-500 dark:text-brand-400 text-lg font-black tracking-tight">{formatKES(totalAmount)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Apply Discount Button */}
          <button
            type="button"
            onClick={() => setShowDiscountModal(true)}
            disabled={cartItems.length === 0}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
              discountAmount > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750 disabled:opacity-50'
            }`}
            title="Apply Discount"
          >
            <Tag className="w-4 h-4" />
          </button>

          {/* Park / Hold Order Button */}
          <button
            type="button"
            onClick={handleHoldOrder}
            disabled={cartItems.length === 0 || isHolding}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-amber-400 transition flex items-center justify-center disabled:opacity-50"
            title="Park / Hold Order for later"
          >
            <PauseCircle className="w-4 h-4" />
          </button>

          {/* Clear Cart */}
          <button
            type="button"
            onClick={clearCart}
            disabled={cartItems.length === 0}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 hover:text-red-400 transition flex items-center justify-center disabled:opacity-50"
            title="Clear Cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Large Checkout Button */}
          <button
            type="button"
            onClick={onOpenPaymentModal}
            disabled={cartItems.length === 0}
            className="flex-1 py-3 px-4 bg-safari-mpesa hover:bg-safari-mpesaDark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl shadow-lg shadow-safari-mpesa/20 transition flex items-center justify-between text-xs sm:text-sm"
          >
            <span>Pay & Print</span>
            <div className="flex items-center space-x-1">
              <span>{formatKES(totalAmount)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-brand-500" />
                <h4 className="font-bold text-zinc-100 text-sm">Apply Order Discount</h4>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyDiscount} className="space-y-3">
              {/* Type */}
              <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                <button
                  type="button"
                  onClick={() => setDiscountInputType('AMOUNT')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg ${
                    discountInputType === 'AMOUNT' ? 'bg-brand-500 text-white' : 'text-zinc-400'
                  }`}
                >
                  KES Amount
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountInputType('PERCENT')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg ${
                    discountInputType === 'PERCENT' ? 'bg-brand-500 text-white' : 'text-zinc-400'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Discount Value ({discountInputType === 'PERCENT' ? '%' : 'KES'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={discountVal}
                  onChange={e => setDiscountVal(e.target.value)}
                  placeholder={discountInputType === 'PERCENT' ? 'e.g. 10' : 'e.g. 50'}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-brand-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Reason for Discount (Mandatory)
                </label>
                <input
                  type="text"
                  value={discountReasonInput}
                  onChange={e => setDiscountReasonInput(e.target.value)}
                  placeholder="e.g. Regular loyalty, Staff meal, Promo..."
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDiscount('AMOUNT', 0, '');
                    setShowDiscountModal(false);
                  }}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-xs font-bold rounded-xl"
                >
                  Remove
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
