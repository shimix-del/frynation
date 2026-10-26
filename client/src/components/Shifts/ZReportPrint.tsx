import React from 'react';
import { X, Printer, FileSpreadsheet } from 'lucide-react';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { printReceiptElement } from '../../utils/printReceipt';

interface ZReportPrintProps {
  zReport: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ZReportPrint: React.FC<ZReportPrintProps> = ({ zReport, isOpen, onClose }) => {
  if (!isOpen || !zReport) return null;

  const handlePrint = () => {
    printReceiptElement('thermal-receipt', '80mm');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 no-print">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Shift Z-Report</h3>
              <p className="text-[11px] text-zinc-400">Official End-of-Day Financial Reading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Z-Report Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-zinc-950 flex justify-center">
          <div
            id="thermal-receipt"
            className="bg-white text-black font-mono text-xs p-5 shadow-lg rounded-sm w-[320px]"
            style={{ fontFamily: '"JetBrains Mono", Courier, monospace', color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
              <div className="font-black text-sm tracking-wider uppercase text-black">NANI'S FRY NATION</div>
              <div className="font-extrabold text-xs uppercase bg-black text-white py-0.5 mt-1">
                *** SHIFT Z-REPORT ***
              </div>
              <div className="text-[11px] font-bold mt-1 text-black">{zReport.branchName || 'Migadini Main Shop'}</div>
              <div className="text-[10px] text-black font-mono">Ref: {zReport.zReportNumber}</div>
            </div>

            {/* Shift Timings */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[11px] text-black">
              <div className="flex justify-between">
                <span>OPENED:</span>
                <span className="font-mono">{formatKenyaDateTime(zReport.openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>CLOSED:</span>
                <span className="font-mono">{formatKenyaDateTime(zReport.closedAt)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CASHIER:</span>
                <span>{zReport.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL ORDERS:</span>
                <span className="font-bold font-mono">{zReport.totalOrdersCount}</span>
              </div>
            </div>

            {/* Sales Breakdown by Payment Method */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px] text-black">
              <div className="font-black border-b border-black pb-0.5 uppercase tracking-wide">
                REVENUE BREAKDOWN:
              </div>
              <div className="flex justify-between">
                <span>CASH SALES:</span>
                <span className="font-bold font-mono">{formatKES(zReport.totalCashSales || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>M-PESA SALES:</span>
                <span className="font-bold font-mono">{formatKES(zReport.totalMpesaSales || 0)}</span>
              </div>

              {(zReport.totalCardSales || 0) > 0 && (
                <div className="flex justify-between">
                  <span>CARD SALES:</span>
                  <span className="font-bold font-mono">{formatKES(zReport.totalCardSales)}</span>
                </div>
              )}

              {/* End of Day Total Gross Money */}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                <span>TOTAL REVENUE (GROSS):</span>
                <span className="font-mono font-black">{formatKES(zReport.totalGrossSales || ((zReport.totalCashSales || 0) + (zReport.totalMpesaSales || 0) + (zReport.totalCardSales || 0)))}</span>
              </div>
            </div>

            {/* Foods & Dishes Sold Breakdown */}
            {zReport.itemsSold && zReport.itemsSold.length > 0 && (
              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px] text-black">
                <div className="font-black border-b border-black pb-0.5 uppercase tracking-wide">
                  FOODS &amp; DISHES SOLD ({zReport.itemsSold.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}):
                </div>
                <div className="space-y-0.5 pt-0.5">
                  {zReport.itemsSold.map((food: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start text-[10px] leading-tight">
                      <span className="pr-1 text-black font-semibold">
                        {food.quantity}x {food.itemName}{food.variantName ? ` (${food.variantName})` : ''}
                      </span>
                      <span className="font-mono font-bold shrink-0 text-black">
                        {formatKES(food.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash Movements during Shift (Float In & Payouts with full explanation/reasons) */}
            {((zReport.cashMovements && zReport.cashMovements.length > 0) || (zReport.totalCashAdditions > 0) || (zReport.totalCashDrops > 0)) && (
              <div className="py-2.5 border-b border-dashed border-black space-y-1.5 text-[11px] text-black">
                <div className="font-black border-b border-black pb-0.5 uppercase tracking-wide">
                  CASH MOVEMENTS &amp; PAYOUTS {zReport.cashMovements ? `(${zReport.cashMovements.length})` : ''}:
                </div>
                {zReport.cashMovements && zReport.cashMovements.length > 0 ? (
                  <div className="space-y-1.5 pt-0.5">
                    {zReport.cashMovements.map((m: any, idx: number) => (
                      <div key={idx} className="border-b border-dotted border-black/40 pb-1 text-[10px]">
                        <div className="flex justify-between items-start font-bold">
                          <span className="pr-1 text-black">
                            {m.type === 'FLOAT_IN' ? '[+] FLOAT IN' : '[-] PAYOUT'}:{' '}
                            <span className="underline font-black">{m.reason || (m.type === 'FLOAT_IN' ? 'Extra Float' : 'Payout')}</span>
                          </span>
                          <span className="font-mono font-black shrink-0 text-black text-right">
                            {m.type === 'FLOAT_IN' ? '+' : '-'}{formatKES(m.amount)}
                          </span>
                        </div>
                        {m.createdAt && (
                          <div className="text-[9px] text-black font-mono mt-0.5">
                            {formatKenyaDateTime(m.createdAt)}{m.authorizedBy ? ` • Auth: ${m.authorizedBy}` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] space-y-0.5 text-black">
                    {zReport.totalCashAdditions > 0 && (
                      <div className="flex justify-between">
                        <span>[+] Extra Float Additions:</span>
                        <span className="font-bold font-mono">+{formatKES(zReport.totalCashAdditions)}</span>
                      </div>
                    )}
                    {zReport.totalCashDrops > 0 && (
                      <div className="flex justify-between">
                        <span>[-] Payouts / Drops:</span>
                        <span className="font-bold font-mono">-{formatKES(zReport.totalCashDrops)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-[10px] font-bold pt-1 border-t border-black text-black">
                  <span>TOTAL FLOAT ADDITIONS:</span>
                  <span className="font-mono font-black">+{formatKES(zReport.totalCashAdditions || 0)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-black">
                  <span>TOTAL PAYOUTS:</span>
                  <span className="font-mono font-black">-{formatKES(zReport.totalCashDrops || 0)}</span>
                </div>
              </div>
            )}

            {/* Cash Drawer Balancing */}
            <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px] text-black">
              <div className="font-black border-b border-black pb-0.5 uppercase tracking-wide">
                CASH DRAWER BALANCING:
              </div>
              <div className="flex justify-between">
                <span>(+) OPENING FLOAT:</span>
                <span className="font-mono">{formatKES(zReport.openingFloat || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) CASH SALES:</span>
                <span className="font-mono">{formatKES(zReport.totalCashSales || 0)}</span>
              </div>
              {(zReport.totalCashAdditions || 0) > 0 && (
                <div className="flex justify-between">
                  <span>(+) EXTRA FLOAT IN:</span>
                  <span className="font-mono">+{formatKES(zReport.totalCashAdditions)}</span>
                </div>
              )}
              {(zReport.totalCashDrops || 0) > 0 && (
                <div className="flex justify-between text-black">
                  <span>(-) CASH PAYOUTS / DROPS:</span>
                  <span className="font-mono">-{formatKES(zReport.totalCashDrops)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-black">
                <span>EXPECTED IN DRAWER:</span>
                <span className="font-mono font-black">{formatKES(zReport.expectedCashInDrawer)}</span>
              </div>
              <div className="flex justify-between font-black text-sm">
                <span>ACTUAL COUNTED CASH:</span>
                <span className="font-mono">{formatKES(zReport.actualCountedCash)}</span>
              </div>

              {/* Variance line */}
              <div className="flex justify-between font-black pt-1 border-t border-black text-xs">
                <span>VARIANCE (OVER/SHORT):</span>
                <span className="font-mono">
                  {zReport.variance === 0
                    ? 'KES 0.0 (EXACT)'
                    : `${zReport.variance > 0 ? '+' : ''}${formatKES(zReport.variance)}`}
                </span>
              </div>
            </div>

            {/* Closing Handover Notes */}
            {zReport.notes && (
              <div className="py-2 border-b border-dashed border-black text-[10px] text-black">
                <span className="font-bold uppercase text-[9px] block">Closing Handover Notes:</span>
                <span className="italic">{zReport.notes}</span>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-3 space-y-3 text-[10px] text-black">
              <div className="flex justify-between pt-3 border-t border-black">
                <div>
                  <div className="border-b border-black w-24 mb-1"></div>
                  <span>Cashier Signature</span>
                </div>
                <div>
                  <div className="border-b border-black w-24 mb-1"></div>
                  <span>Manager Signature</span>
                </div>
              </div>
              <div className="text-center text-black font-semibold pt-1 text-[9px]">
                Asante Sana • Nani's Fry Nation POS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 flex items-center space-x-2 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-2 text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Z-Report</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
