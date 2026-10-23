import React, { useState } from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { Order } from '../../types';
import { printReceiptElement } from '../../utils/printReceipt';
import naniLogo from '../../assets/logo.jpg';

interface ThermalReceiptProps {
  order: Order | null;
  warnings?: string[];
  isOpen: boolean;
  onClose: () => void;
}

const formatReceiptDate = (dateString?: string | Date) => {
  const d = dateString ? new Date(dateString) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
};

const formatReceiptTime = (dateString?: string | Date) => {
  const d = dateString ? new Date(dateString) : new Date();
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Deterministic SVG Barcode generator for clean thermal printing
const BarcodeDisplay: React.FC<{ value: string }> = ({ value }) => {
  const bars: { width: number; isSpace: boolean }[] = [];
  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 2, isSpace: false });

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const b1 = (code % 3) + 1;
    const s1 = ((code >> 2) % 2) + 1;
    const b2 = ((code >> 4) % 3) + 1;
    const s2 = ((code >> 1) % 2) + 1;
    bars.push({ width: b1, isSpace: false });
    bars.push({ width: s1, isSpace: true });
    bars.push({ width: b2, isSpace: false });
    bars.push({ width: s2, isSpace: true });
  }

  bars.push({ width: 2, isSpace: false });
  bars.push({ width: 1, isSpace: true });
  bars.push({ width: 3, isSpace: false });

  let currentX = 0;
  const rects: { x: number; width: number }[] = [];
  bars.forEach(bar => {
    if (!bar.isSpace) {
      rects.push({ x: currentX, width: bar.width });
    }
    currentX += bar.width;
  });

  return (
    <div className="flex flex-col items-center justify-center my-1.5 w-full">
      <svg
        viewBox={`0 0 ${currentX} 36`}
        className="h-8 w-44 max-w-full"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y="0" width={r.width} height="36" fill="#000000" />
        ))}
      </svg>
      <div className="text-[9px] tracking-widest font-mono text-black mt-0.5 font-bold">
        *{value}*
      </div>
    </div>
  );
};

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  warnings = [],
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

  const storePhone = order.branch?.phone || '0143285625';
  const branchName = order.branch?.name || 'Migadini Main Shop';
  const cashierName = order.cashier?.name || 'Cashier';

  const totalAmount = Number(order.totalAmount || 0);
  const totalPaid = order.payments && order.payments.length > 0
    ? order.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
    : totalAmount;
  const changeAmount = order.payments && order.payments.length > 0
    ? order.payments.reduce((acc, p) => acc + Number(p.changeAmount || 0), 0)
    : 0;

  const mpesaRef = order.payments?.find(p => p.mpesaCode)?.mpesaCode
    || (order.payments?.some(p => p.paymentMethod === 'MPESA') ? 'MPESA' : 'CASH');

  const handlePrint = () => {
    printReceiptElement('thermal-receipt', paperWidth);
  };

  const handleWhatsAppShare = () => {
    const itemsText = order.items
      .map(
        i =>
          `• ${Number(i.quantity).toFixed(1)}x ${i.itemName}${i.variantName ? ` (${i.variantName})` : ''} @ ${Number(i.unitPrice).toFixed(1)} = ${Number(i.totalPrice).toFixed(1)}`
      )
      .join('\n');

    const message = `*NANI'S FRY NATION*\n` +
      `TEL: ${storePhone}\n` +
      `POCHI LA BIASHARA: ${storePhone}\n` +
      `PAY BILL: 247247 | ACC NO: ${storePhone}\n` +
      `---------------------------\n` +
      `M/S: ${order.customerName || 'CASH SALE'}\n` +
      `Cash Sale #: ${order.orderNumber}\n` +
      `DATE: ${formatReceiptDate(order.createdAt)}  TIME: ${formatReceiptTime(order.createdAt)}\n` +
      (order.customerPhone ? `TEL: ${order.customerPhone}\n` : '') +
      `TYPE: ${order.orderType}${order.tableNumber ? ` (${order.tableNumber})` : ''}\n` +
      `---------------------------\n` +
      `${itemsText}\n` +
      `---------------------------\n` +
      `*TOTAL: KES ${totalAmount.toFixed(1)}*\n` +
      `AMOUNT PAID: KES ${totalPaid.toFixed(1)}\n` +
      `CHANGE: KES ${changeAmount.toFixed(1)}\n` +
      `MPESA CODE: ${mpesaRef}\n` +
      `---------------------------\n` +
      `Asante Sana • Karibu Tena\n` +
      `Cashier: ${cashierName}\n` +
      `Developed By Simba POS`;

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
              <h3 className="font-bold text-white text-sm">Receipt Ready</h3>
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
            className={`bg-white text-black font-mono text-xs p-4 shadow-xl rounded-sm ${
              paperWidth === '58mm' ? 'w-[260px]' : 'w-[320px]'
            }`}
            style={{ fontFamily: '"JetBrains Mono", Courier, monospace', color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Header: Store Name & Contacts matching exact layout */}
            <div className="text-center space-y-0.5 pb-1 text-black">
              <img
                src={naniLogo}
                alt="Nani's Fry Nation"
                className="w-16 h-16 rounded-full object-cover border-2 border-black mx-auto mb-1 block"
              />
              <div className="font-black text-sm tracking-wider uppercase text-black">NANI'S FRY NATION</div>
              <div className="text-[10px] font-semibold text-black uppercase">{branchName}</div>
              <div className="text-[10px] font-bold text-black">
                TEL: <span className="font-mono">{storePhone}</span>
              </div>
              <div className="text-[10px] font-bold text-black">
                POCHI LA BIASHARA: <span className="font-mono">{storePhone}</span>
              </div>
              <div className="text-[10px] font-bold text-black">
                PAY BILL: <span className="font-mono">247247</span>
              </div>
              <div className="text-[10px] font-bold text-black">
                ACC NO: <span className="font-mono">{storePhone}</span>
              </div>
            </div>

            {/* Barcode block */}
            <BarcodeDisplay value={order.orderNumber} />

            {/* Meta Section */}
            <div className="border-t border-dashed border-black py-1.5 space-y-0.5 text-[10px] text-black">
              <div className="flex justify-between">
                <span className="font-bold">M/S:</span>
                <span className="font-bold uppercase truncate max-w-[190px]">
                  {order.customerName || 'CASH SALE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cash Sale #:</span>
                <span className="font-bold font-mono">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span className="font-mono">{formatReceiptDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME:</span>
                <span className="font-mono">{formatReceiptTime(order.createdAt)}</span>
              </div>
              {order.customerPhone && (
                <div className="flex justify-between">
                  <span>TEL:</span>
                  <span className="font-mono font-bold">{order.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TYPE:</span>
                <span className="font-bold uppercase">
                  {order.orderType} {order.tableNumber ? `(${order.tableNumber})` : ''}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-1 border-t border-dashed border-black space-y-1 text-black">
              <div className="flex justify-between font-bold text-[10px] text-black pb-0.5 border-b border-black py-0.5">
                <span className="w-5/12 text-left">ITEM</span>
                <span className="w-2/12 text-center">QTY</span>
                <span className="w-2/12 text-right">PRICE</span>
                <span className="w-3/12 text-right">AMOUNT</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[10px] leading-tight py-0.5">
                  <div className="w-5/12 text-left pr-1">
                    <div className="font-bold truncate">{item.itemName}</div>
                    {item.variantName && (
                      <div className="text-[9px] text-zinc-700 truncate">{item.variantName}</div>
                    )}
                  </div>
                  <div className="w-2/12 text-center font-medium font-mono">
                    {Number(item.quantity).toFixed(1)}
                  </div>
                  <div className="w-2/12 text-right font-medium font-mono">
                    {Number(item.unitPrice).toFixed(1)}
                  </div>
                  <div className="w-3/12 text-right font-bold font-mono">
                    {Number(item.totalPrice).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-black py-1.5 space-y-0.5 text-[11px] text-black">
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span>DISCOUNT:</span>
                  <span className="font-mono">- {Number(order.discountAmount).toFixed(1)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-0.5">
                <span>TOTAL:</span>
                <span className="font-black font-mono">{totalAmount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between font-medium text-[10px]">
                <span>AMOUNT PAID:</span>
                <span className="font-mono">{totalPaid.toFixed(1)}</span>
              </div>
              <div className="flex justify-between font-medium text-[10px]">
                <span>CHANGE:</span>
                <span className="font-mono">{changeAmount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between font-medium text-[10px]">
                <span>MPESA CODE:</span>
                <span className="font-mono font-bold uppercase">{mpesaRef}</span>
              </div>
            </div>

            {/* VAT Breakdown */}
            <div className="border-t border-dashed border-black py-1 space-y-0.5 text-[9px] text-black">
              <div className="flex justify-between font-bold border-b border-dashed border-black pb-0.5">
                <span className="w-2/12 text-left">Code</span>
                <span className="w-2/12 text-center">Rate</span>
                <span className="w-4/12 text-right">Vatable</span>
                <span className="w-4/12 text-right">VAT Amt</span>
              </div>
              <div className="flex justify-between font-mono pt-0.5 text-black">
                <span className="w-2/12 text-left">Z</span>
                <span className="w-2/12 text-center">0.0%</span>
                <span className="w-4/12 text-right">{totalAmount.toFixed(1)}</span>
                <span className="w-4/12 text-right">0.00</span>
              </div>
              <div className="text-[8px] text-center pt-1 font-bold tracking-tight text-black">
                PRICES INCLUSIVE OF VAT WHERE APPLICABLE
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-black pt-2 text-center space-y-0.5 text-[10px] text-black">
              <div className="font-bold tracking-wide">Asante Sana • Karibu Tena</div>
              <div className="text-[9px] text-black">
                Cashier: <span className="font-semibold">{cashierName}</span>
              </div>
              <div className="text-[9px] font-bold tracking-widest pt-0.5 text-black">
                Developed By Simba POS
              </div>
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
