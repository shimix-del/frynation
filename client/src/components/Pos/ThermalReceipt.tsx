import React, { useState } from 'react';
import { X, Printer, Share2, Check, MessageSquare } from 'lucide-react';
import { Order } from '../../types';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { printReceiptElement } from '../../utils/printReceipt';
import naniLogo from '../../assets/logo.jpg';

interface ThermalReceiptProps {
  order: Order | null;
  warnings?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  warnings = [],
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

  const handlePrint = () => {
    printReceiptElement('thermal-receipt', paperWidth);
  };

  const handleWhatsAppShare = () => {
    const itemsText = order.items
      .map(
        i =>
          `• ${i.quantity}x ${i.itemName}${i.variantName ? ` (${i.variantName})` : ''} - ${formatKES(i.totalPrice)}`
      )
      .join('\n');

    const message = `*NANI'S FRY NATION RECEIPT*\n` +
      `Order: ${order.orderNumber}\n` +
      `Date: ${formatKenyaDateTime(order.createdAt)}\n` +
      `Branch: ${order.branch?.name || 'Migadini Main Shop'}\n` +
      `Order Type: ${order.orderType}${order.tableNumber ? ` (${order.tableNumber})` : ''}\n` +
      (order.customerName ? `Customer: ${order.customerName}\n` : '') +
      (order.customerPhone ? `Customer Tel: ${order.customerPhone}\n` : '') +
      `---------------------------\n` +
      `*LIPA NA M-PESA (POCHI LA BIASHARA)*\n` +
      `Pochi No: ${order.branch?.phone || '0143285625'}\n` +
      `📞 Make Order / Call: ${order.branch?.phone || '0143285625'}\n` +
      `---------------------------\n` +
      `${itemsText}\n` +
      `---------------------------\n` +
      `*Total: ${formatKES(order.totalAmount)}*\n` +
      `${order.payments?.map(p => `PAID (${p.paymentMethod === 'MPESA' ? 'MPESA' : 'CASH'}): ${formatKES(p.amount)}${p.mpesaCode ? ` | REF: ${p.mpesaCode}` : ''}`).join('\n') || `PAID (CASH): ${formatKES(order.totalAmount)}`}\n` +
      `Asante Sana! Karibu Tena!`;

    const encoded = encodeURIComponent(message);
    const phone = order.customerPhone ? order.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/254${phone.startsWith('0') ? phone.slice(1) : phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 no-print">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Order Completed</h3>
              <p className="text-[11px] text-zinc-400">Print or share receipt</p>
            </div>
          </div>

          {/* Width Toggle */}
          <div className="flex bg-zinc-800 p-0.5 rounded-lg border border-zinc-700">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                paperWidth === '58mm' ? 'bg-brand-500 text-white' : 'text-zinc-400'
              }`}
            >
              58mm
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                paperWidth === '80mm' ? 'bg-brand-500 text-white' : 'text-zinc-400'
              }`}
            >
              80mm
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warnings Banner if any stock alert triggered */}
        {warnings && warnings.length > 0 && (
          <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-[11px] font-medium space-y-0.5 no-print">
            {warnings.map((w, idx) => (
              <div key={idx} className="flex items-center space-x-1.5">
                <span>⚠️</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Printable Thermal Receipt Container */}
        <div className="p-4 overflow-y-auto flex-1 bg-zinc-950 flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white text-black font-mono text-xs p-4 shadow-lg rounded-sm ${
              paperWidth === '58mm' ? 'w-[260px]' : 'w-[320px]'
            }`}
            style={{ fontFamily: '"JetBrains Mono", Courier, monospace' }}
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-400 flex flex-col items-center">
              <img
                src={naniLogo}
                alt="Nani's Fry Nation"
                className="w-20 h-20 rounded-full object-cover border-2 border-black mx-auto mb-1 block"
              />
              <div className="font-black text-sm tracking-wider">NANI'S FRY NATION</div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">Crispy • Golden • Irresistible</div>
              <div className="text-[11px] font-semibold">{order.branch?.name || 'Migadini Main Shop'}</div>
              {order.branch?.address && (
                <div className="text-[10px] text-zinc-600">{order.branch.address}</div>
              )}
              <div className="text-[10px] font-bold text-zinc-800 mt-1">
                CALL TO MAKE ORDER: <span className="font-mono text-black font-black">{order.branch?.phone || '0143285625'}</span>
              </div>
              {/* Lipa na M-Pesa Pochi la Biashara */}
              <div className="w-full mt-1.5 pt-1.5 border-t border-dashed border-zinc-400 text-center">
                <div className="text-[10px] font-black uppercase tracking-wider text-black">
                  LIPA NA M-PESA • POCHI LA BIASHARA
                </div>
                <div className="text-xs font-black font-mono tracking-widest text-black mt-0.5">
                  {order.branch?.phone || '0143285625'}
                </div>
              </div>
            </div>

            {/* Order Meta Info */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>ORDER #:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{formatKenyaDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{order.cashier?.name || 'Cashier'}</span>
              </div>
              <div className="flex justify-between">
                <span>TYPE:</span>
                <span className="font-bold">
                  {order.orderType} {order.tableNumber ? `(${order.tableNumber})` : ''}
                </span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex justify-between">
                  <span>CUSTOMER TEL:</span>
                  <span className="font-bold font-mono">{order.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-1.5 text-[11px]">
              <div className="flex justify-between font-bold text-[10px] text-zinc-600 pb-0.5 border-b border-zinc-300">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/4 text-center">QTY</span>
                <span className="w-1/4 text-right">TOTAL</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="w-1/2 pr-1">
                    <div className="font-semibold leading-tight">{item.itemName}</div>
                    {item.variantName && (
                      <div className="text-[10px] text-zinc-600">{item.variantName}</div>
                    )}
                  </div>
                  <div className="w-1/4 text-center">
                    {item.quantity}x {item.unitPrice}
                  </div>
                  <div className="w-1/4 text-right font-bold">
                    {Math.round(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{formatKES(order.subtotal)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>DISCOUNT ({order.discountReason || 'Promo'}):</span>
                  <span>- {formatKES(order.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-300">
                <span>TOTAL DUE:</span>
                <span>{formatKES(order.totalAmount)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
              {order.payments && order.payments.length > 0 ? (
                order.payments.map((p, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>PAID ({p.paymentMethod === 'MPESA' ? 'MPESA' : 'CASH'}):</span>
                      <span>{formatKES(p.amount)}</span>
                    </div>
                    {p.mpesaCode && (
                      <div className="flex justify-between text-zinc-600 text-[10px]">
                        <span>REF:</span>
                        <span className="font-mono font-semibold">{p.mpesaCode}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex justify-between font-bold">
                  <span>PAID (CASH):</span>
                  <span>{formatKES(order.totalAmount)}</span>
                </div>
              )}

              {order.payments?.some(p => p.changeAmount && p.changeAmount > 0) && (
                <div className="flex justify-between text-zinc-700 font-semibold pt-0.5 text-[10px]">
                  <span>CHANGE RETURNED:</span>
                  <span>
                    {formatKES(
                      order.payments.find(p => p.changeAmount && p.changeAmount > 0)?.changeAmount
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 text-center space-y-1 text-[10px]">
              <div className="font-bold">ASANTE SANA! KARIBU TENA!</div>
              <div className="text-zinc-400 pt-1 tracking-widest">*** NANI FRYS POS ***</div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 flex items-center space-x-2 no-print">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-2.5 bg-safari-mpesa/20 hover:bg-safari-mpesa/30 border border-safari-mpesa/50 text-safari-mpesa font-bold rounded-2xl transition flex items-center space-x-1.5 text-xs"
            title="Share via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-500/25 transition flex items-center justify-center space-x-2 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
