import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  Clock,
  ArrowDownCircle,
  Lock,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  Receipt,
  ShoppingBag,
} from 'lucide-react';
import { Shift } from '../../types';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { OpenShiftModal } from './OpenShiftModal';
import { CloseShiftModal } from './CloseShiftModal';
import { CashMovementModal } from './CashMovementModal';
import { ZReportPrint } from './ZReportPrint';

export const ShiftManager: React.FC = () => {
  const { currentBranchId, currentBranch } = useBranch();
  const { user } = useAuth();

  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isOpenShiftModal, setIsOpenShiftModal] = useState<boolean>(false);
  const [isCloseShiftModal, setIsCloseShiftModal] = useState<boolean>(false);
  const [isCashMovementModal, setIsCashMovementModal] = useState<boolean>(false);
  const [selectedZReport, setSelectedZReport] = useState<any | null>(null);

  const fetchShiftData = async () => {
    setIsLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        api.getCurrentShift({ branchId: currentBranchId || undefined }),
        api.getShiftHistory({ branchId: currentBranchId || undefined }),
      ]);
      setActiveShift(currentRes.activeShift);
      setShiftHistory(historyRes);
    } catch (err) {
      console.error('Failed to load shift data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [currentBranchId]);

  const handleShiftClosed = (zReport: any) => {
    setSelectedZReport(zReport);
    fetchShiftData();
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2.5">
            <WalletCards className="w-6 h-6 text-brand-500" />
            <span>Shift & Cash Float Management</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cash drawer balancing, payouts, float additions, and daily Z-Reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeShift ? (
            <>
              <button
                onClick={() => setIsCashMovementModal(true)}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>Cash Movement</span>
              </button>
              <button
                onClick={() => setIsCloseShiftModal(true)}
                className="flex-1 sm:flex-none justify-center px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-red-600/25"
              >
                <Lock className="w-4 h-4" />
                <span>Close Shift & Z-Report</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModal(true)}
              className="flex-1 sm:flex-none justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>Open New Shift (Float)</span>
            </button>
          )}

          <button
            onClick={fetchShiftData}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl border border-zinc-700 active:scale-95"
            title="Refresh shift data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-850 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                  ACTIVE SHIFT IN PROGRESS
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Cashier: {activeShift.cashier?.name} ({activeShift.branch?.name})
                </h3>
              </div>
            </div>
            <div className="text-xs text-zinc-400 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Opened: {formatKenyaDateTime(activeShift.openedAt)}</span>
            </div>
          </div>

          {/* Real-time Drawer Calculation Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-zinc-800/60 p-3 rounded-2xl border border-zinc-750">
              <span className="text-[10px] font-bold text-zinc-400">Opening Float</span>
              <div className="text-lg font-black text-zinc-200 mt-0.5">
                {formatKES(activeShift.openingFloat)}
              </div>
            </div>

            <div className="bg-zinc-800/60 p-3 rounded-2xl border border-zinc-750">
              <span className="text-[10px] font-bold text-zinc-400">Cash Sales</span>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {formatKES(activeShift.totalCashSales)}
              </div>
            </div>

            <div className="bg-zinc-800/60 p-3 rounded-2xl border border-zinc-750">
              <span className="text-[10px] font-bold text-zinc-400">M-Pesa Sales</span>
              <div className="text-lg font-black text-safari-mpesa mt-0.5">
                {formatKES(activeShift.totalMpesaSales)}
              </div>
            </div>

            <div className="bg-brand-500/10 p-3 rounded-2xl border border-brand-500/30">
              <span className="text-[10px] font-bold text-brand-400">Expected Cash in Drawer</span>
              <div className="text-lg font-black text-brand-400 mt-0.5">
                {formatKES(activeShift.expectedCash)}
              </div>
            </div>
          </div>

          {/* Foods & Dishes Sold During Shift */}
          <div className="pt-3 border-t border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center space-x-2">
                <UtensilsCrossed className="w-4 h-4 text-brand-500" />
                <span>Dishes & Foods Sold This Shift ({activeShift.itemsSold?.reduce((s, i) => s + i.quantity, 0) || 0} items):</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold">
                Completed Tickets: <span className="text-white font-bold">{activeShift.orders?.length || activeShift._count?.orders || 0}</span>
              </span>
            </div>

            {activeShift.itemsSold && activeShift.itemsSold.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {activeShift.itemsSold.map((food, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-zinc-100 truncate">{food.itemName}</div>
                      {food.variantName && (
                        <div className="text-[10px] text-zinc-400 truncate">{food.variantName}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-brand-400">
                        {food.quantity} sold
                      </div>
                      <div className="text-[10px] font-mono text-zinc-300 font-bold">
                        {formatKES(food.totalPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl text-center text-xs text-zinc-500">
                No food sales recorded in this active shift yet. Ring up meals on POS to see them appear live!
              </div>
            )}
          </div>

          {/* Cash Movements during this shift */}
          {activeShift.cashMovements && activeShift.cashMovements.length > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-xs font-bold text-zinc-300 block mb-2">
                Shift Cash Movements ({activeShift.cashMovements.length}):
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeShift.cashMovements.map(m => (
                  <div
                    key={m.id}
                    className="bg-zinc-950/70 border border-zinc-800 px-3 py-2 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          m.type === 'FLOAT_IN'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {m.type === 'FLOAT_IN' ? 'FLOAT IN' : 'PAYOUT'}
                      </span>
                      <span className="text-zinc-300 font-medium">{m.reason}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-200">{formatKES(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl mx-auto">
            💵
          </div>
          <h3 className="text-base font-bold text-zinc-200">No Shift Currently Open</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            To start processing orders and taking cash payments, open a shift and enter the opening cash drawer float.
          </p>
          <button
            onClick={() => setIsOpenShiftModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Open Cashier Shift Now</span>
          </button>
        </div>
      )}

      {/* Past Shifts History Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <h3 className="font-bold text-white text-base">Closed Shifts & Z-Report Archive</h3>

        {/* Mobile View: Clean Cards for Phones & Small Devices */}
        <div className="block sm:hidden space-y-3">
          {shiftHistory.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs">No closed shift records found.</div>
          ) : (
            shiftHistory.map(shift => {
              const gross = shift.totalCashSales + shift.totalMpesaSales + (shift.totalCardSales || 0);
              return (
                <div key={shift.id} className="bg-zinc-850 border border-zinc-750 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-750 pb-2">
                    <div>
                      <div className="font-bold text-white text-xs">{shift.cashier?.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {formatKenyaDateTime(shift.openedAt).split(' ')[0]} • {shift.branch?.name || 'Main Shop'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shift.status === 'OPEN'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {shift.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-medium">Gross Revenue</span>
                      <span className="font-black text-white text-sm">{formatKES(gross)}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-medium">Cash / M-Pesa</span>
                      <span className="text-[11px] font-bold text-emerald-400">{formatKES(shift.totalCashSales)}</span>
                      <span className="text-[10px] text-zinc-500"> / </span>
                      <span className="text-[11px] font-bold text-safari-mpesa">{formatKES(shift.totalMpesaSales)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                    <span>Float: <span className="font-bold text-zinc-200">{formatKES(shift.openingFloat)}</span></span>
                    <span>
                      Variance: {' '}
                      <span className={`font-black ${shift.variance === 0 ? 'text-emerald-400' : (shift.variance || 0) < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        {shift.variance === 0 ? '✓ Balanced' : `${(shift.variance || 0) > 0 ? '+' : ''}${formatKES(shift.variance || 0)}`}
                      </span>
                    </span>
                  </div>

                  {shift.status === 'CLOSED' && (
                    <button
                      onClick={() => {
                        const movements = shift.cashMovements || [];
                        const additions = shift.cashAdditions ?? (movements.filter(m => m.type === 'FLOAT_IN').reduce((sum, m) => sum + m.amount, 0));
                        const drops = shift.cashDrops ?? shift.totalExpensesPaid ?? (movements.filter(m => m.type === 'PAYOUT' || (m as any).type === 'CASH_DROP').reduce((sum, m) => sum + m.amount, 0));
                        setSelectedZReport({
                          zReportNumber: `Z-${shift.branch?.code || 'MGD'}-${shift.id.slice(-4).toUpperCase()}`,
                          branchName: shift.branch?.name,
                          cashierName: shift.cashier?.name,
                          openedAt: shift.openedAt,
                          closedAt: shift.closedAt,
                          openingFloat: shift.openingFloat,
                          totalCashSales: shift.totalCashSales,
                          totalMpesaSales: shift.totalMpesaSales,
                          totalCardSales: shift.totalCardSales,
                          totalGrossSales: gross,
                          cashMovements: movements,
                          totalCashAdditions: additions,
                          totalCashDrops: drops,
                          expectedCashInDrawer: shift.closingCashExpected || (shift.openingFloat + shift.totalCashSales + additions - drops),
                          actualCountedCash: shift.closingCashActual || shift.closingCashExpected,
                          variance: shift.variance || 0,
                          totalOrdersCount: shift._count?.orders || 0,
                        });
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>View Shift Report (Z-Report)</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table for Tablets & PCs */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Date</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">Branch</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Cashier</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell">Float</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">Cash Sales</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">M-Pesa</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Variance</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell">Status</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">Z-Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {shiftHistory.map(shift => (
                <tr key={shift.id} className="hover:bg-zinc-800/40">
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-400 text-[11px]">
                    {formatKenyaDateTime(shift.openedAt).split(' ')[0]}
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-white hidden sm:table-cell">{shift.branch?.name}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-zinc-100">{shift.cashier?.name.split(' ')[0]}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell">{formatKES(shift.openingFloat)}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-bold text-emerald-400 hidden lg:table-cell">{formatKES(shift.totalCashSales)}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-bold text-safari-mpesa hidden lg:table-cell">{formatKES(shift.totalMpesaSales)}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-black text-xs">
                    {shift.variance !== null && shift.variance !== undefined ? (
                      <span className={shift.variance === 0 ? 'text-emerald-400' : shift.variance < 0 ? 'text-red-400' : 'text-blue-400'}>
                        {shift.variance === 0 ? '✓' : `${shift.variance > 0 ? '+' : ''}${formatKES(shift.variance)}`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shift.status === 'OPEN'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {shift.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {shift.status === 'CLOSED' && (
                      <button
                        onClick={() => {
                          const movements = shift.cashMovements || [];
                          const additions = shift.cashAdditions ?? (movements.filter(m => m.type === 'FLOAT_IN').reduce((sum, m) => sum + m.amount, 0));
                          const drops = shift.cashDrops ?? shift.totalExpensesPaid ?? (movements.filter(m => m.type === 'PAYOUT' || (m as any).type === 'CASH_DROP').reduce((sum, m) => sum + m.amount, 0));
                          setSelectedZReport({
                            zReportNumber: `Z-${shift.branch?.code || 'MGD'}-${shift.id.slice(-4).toUpperCase()}`,
                            branchName: shift.branch?.name,
                            cashierName: shift.cashier?.name,
                            openedAt: shift.openedAt,
                            closedAt: shift.closedAt,
                            openingFloat: shift.openingFloat,
                            totalCashSales: shift.totalCashSales,
                            totalMpesaSales: shift.totalMpesaSales,
                            totalCardSales: shift.totalCardSales,
                            totalGrossSales: shift.totalCashSales + shift.totalMpesaSales + (shift.totalCardSales || 0),
                            cashMovements: movements,
                            totalCashAdditions: additions,
                            totalCashDrops: drops,
                            expectedCashInDrawer: shift.closingCashExpected || (shift.openingFloat + shift.totalCashSales + additions - drops),
                            actualCountedCash: shift.closingCashActual || shift.closingCashExpected,
                            variance: shift.variance || 0,
                            totalOrdersCount: shift._count?.orders || 0,
                          });
                        }}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-xl border border-zinc-700 transition"
                      >
                        View Z-Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModal}
        onClose={() => setIsOpenShiftModal(false)}
        onShiftOpened={fetchShiftData}
      />

      <CloseShiftModal
        shift={activeShift}
        isOpen={isCloseShiftModal}
        onClose={() => setIsCloseShiftModal(false)}
        onShiftClosed={handleShiftClosed}
      />

      <CashMovementModal
        shift={activeShift}
        isOpen={isCashMovementModal}
        onClose={() => setIsCashMovementModal(false)}
        onMovementAdded={fetchShiftData}
      />

      <ZReportPrint
        zReport={selectedZReport}
        isOpen={!!selectedZReport}
        onClose={() => setSelectedZReport(null)}
      />
    </div>
  );
};
