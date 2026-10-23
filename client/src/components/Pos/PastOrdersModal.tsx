import React, { useState, useEffect } from 'react';
import { X, Search, Printer, Receipt, Calendar, User, Phone, Smartphone, Banknote, RefreshCw } from 'lucide-react';
import { Order } from '../../types';
import { api } from '../../services/api';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { useBranch } from '../../context/BranchContext';

interface PastOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderForReprint: (order: Order) => void;
}

export const PastOrdersModal: React.FC<PastOrdersModalProps> = ({
  isOpen,
  onClose,
  onSelectOrderForReprint,
}) => {
  const { currentBranchId } = useBranch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders({ branchId: currentBranchId || undefined });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load past orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, currentBranchId]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchOrderNumber = o.orderNumber?.toLowerCase().includes(q);
    const matchCustomer = o.customerName?.toLowerCase().includes(q);
    const matchPhone = o.customerPhone?.includes(q);
    const matchItems = o.items?.some(i => i.itemName.toLowerCase().includes(q));
    const matchMpesa = o.payments?.some(p => p.mpesaCode?.toLowerCase().includes(q));
    return matchOrderNumber || matchCustomer || matchPhone || matchItems || matchMpesa;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Past Orders &amp; Receipt Reprinting</h3>
              <p className="text-[11px] text-zinc-400">View order history and reprint thermal receipts</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchOrders}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer, M-Pesa Ref, or Dish name..."
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-400 text-xs flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
              <span>Loading orders...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No orders found matching your search.
            </div>
          ) : (
            filteredOrders.map(order => {
              const hasMpesa = order.payments?.some(p => p.paymentMethod === 'MPESA');
              const mpesaPayment = order.payments?.find(p => p.paymentMethod === 'MPESA');

              return (
                <div
                  key={order.id}
                  className="bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-3.5 space-y-2.5 transition shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-750 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
                        {order.orderNumber}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatKenyaDateTime(order.createdAt)}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs font-black text-amber-400">
                      {formatKES(order.totalAmount)}
                    </div>
                  </div>

                  {/* Customer & Cashier Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                    {order.customerName && (
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-200">{order.customerName}</span>
                        {order.customerPhone && (
                          <span className="text-zinc-400 font-mono">({order.customerPhone})</span>
                        )}
                      </span>
                    )}
                    {!order.customerName && order.customerPhone && (
                      <span className="flex items-center space-x-1 text-zinc-300 font-mono">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{order.customerPhone}</span>
                      </span>
                    )}
                    {order.orderType && (
                      <span className="text-zinc-400">
                        Type: <span className="font-semibold text-zinc-300">{order.orderType}</span> {order.tableNumber ? `(${order.tableNumber})` : ''}
                      </span>
                    )}
                    <span className="text-zinc-400">
                      Cashier: <span className="font-semibold text-zinc-300">{order.cashier?.name || 'Staff'}</span>
                    </span>
                    {hasMpesa ? (
                      <span className="flex items-center space-x-1 text-safari-mpesa font-semibold">
                        <Smartphone className="w-3 h-3" />
                        <span>M-Pesa {mpesaPayment?.mpesaCode ? `(Ref: ${mpesaPayment.mpesaCode})` : ''}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                        <Banknote className="w-3 h-3" />
                        <span>Cash</span>
                      </span>
                    )}
                  </div>

                  {/* Items Preview */}
                  <div className="text-[11px] text-zinc-300 bg-zinc-900/80 p-2 rounded-xl border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">Dishes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items?.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded-md text-[10px] border border-zinc-700/60 font-medium"
                        >
                          {item.quantity}x {item.itemName}{item.variantName ? ` (${item.variantName})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectOrderForReprint(order);
                      }}
                      className="px-3.5 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Reprint Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
