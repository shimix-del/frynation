import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Building2,
  Calendar,
  Download,
  RefreshCw,
  PieChart as PieIcon,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { DashboardSummary } from '../../types';
import { formatKES } from '../../utils/currency';

export const AnalyticsDashboard: React.FC = () => {
  const { currentBranchId, branches } = useBranch();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [cashierStats, setCashierStats] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [
        sumData,
        catData,
        topData,
        hourData,
        compData,
        cashierData,
        plData,
      ] = await Promise.all([
        api.getDashboardSummary({ branchId: currentBranchId || undefined }).catch(() => null),
        api.getSalesByCategory({ branchId: currentBranchId || undefined, days: 7 }).catch(() => []),
        api.getTopItems({ branchId: currentBranchId || undefined, limit: 7, days: 7 }).catch(() => []),
        api.getHourlySales({ branchId: currentBranchId || undefined }).catch(() => []),
        api.getBranchComparison().catch(() => []),
        api.getCashierPerformance({ branchId: currentBranchId || undefined }).catch(() => []),
        api.getProfitLoss({ branchId: currentBranchId || undefined }).catch(() => null),
      ]);

      setSummary(sumData || {
        todayGrossSales: 0,
        todayDiscounts: 0,
        todayOrderCount: 0,
        averageTicket: 0,
        todayCOGS: 0,
        totalTodayExpenses: 0,
        todayNetProfit: 0,
        cashSales: 0,
        mpesaSales: 0,
        cardSales: 0,
        lowStockCount: 0,
        date: new Date().toISOString(),
      });
      setCategorySales(Array.isArray(catData) ? catData : []);
      setTopItems(Array.isArray(topData) ? topData : []);
      setHourlySales(Array.isArray(hourData) ? hourData : []);
      setBranchComparison(Array.isArray(compData) ? compData : []);
      setCashierStats(Array.isArray(cashierData) ? cashierData : []);
      setProfitLoss(plData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBranchId]);

  const COLORS = ['#ea580c', '#00a859', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];

  const exportCSV = () => {
    if (!topItems || topItems.length === 0) return;
    const headers = ['Dish Name', 'Variant', 'Quantity Sold', 'Total Revenue (KES)'];
    const rows = topItems.map(i => [
      `"${i.name || i.itemName || 'Item'}"`,
      `"${i.variant || 'Standard'}"`,
      i.quantity || 0,
      i.revenue || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nani_frys_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500 shrink-0" />
            <span className="truncate">Sales Analytics & P&L</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            Real-time revenues, profit margins, peak hours & multi-branch metrics
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-brand-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-1.5 sm:p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700/80 transition active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {hasError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load some live server data. Using local stored data.</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Gross Sales</span>
          <div className="text-lg sm:text-2xl font-black text-white truncate">
            {formatKES(summary?.todayGrossSales)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 flex items-center space-x-1">
            <ShoppingBag className="w-3 h-3 text-brand-400 shrink-0" />
            <span className="truncate">{summary?.todayOrderCount || 0} orders</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Net Profit</span>
          <div
            className={`text-lg sm:text-2xl font-black truncate ${
              (summary?.todayNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatKES(summary?.todayNetProfit)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
            Exp: {formatKES(summary?.totalTodayExpenses)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">M-Pesa Sales</span>
          <div className="text-lg sm:text-2xl font-black text-safari-mpesa truncate">
            {formatKES(summary?.mpesaSales)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
            Cash: <span className="font-bold text-amber-400">{formatKES(summary?.cashSales)}</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Avg Ticket</span>
          <div className="text-lg sm:text-2xl font-black text-brand-400 truncate">
            {formatKES(summary?.averageTicket)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
            Per customer spend
          </div>
        </div>
      </div>

      {/* Multi-Branch Side-by-Side Comparison */}
      {branchComparison.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center space-x-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
              <span>Multi-Branch Performance</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {branchComparison.map(b => (
              <div
                key={b.branchId || b.id}
                className="bg-zinc-850 border border-zinc-750 rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-zinc-700/80 pb-2">
                  <span className="font-extrabold text-xs sm:text-sm text-white truncate">{b.branchName || b.name}</span>
                  <span className="font-mono text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-md font-bold shrink-0">
                    {b.branchCode || b.code || 'MAIN'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Sales:</span>
                    <span className="font-black text-white">{formatKES(b.totalSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Orders:</span>
                    <span className="font-bold text-zinc-200">{b.totalOrders || b.orderCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Expenses:</span>
                    <span className="font-bold text-red-400">- {formatKES(b.totalExpenses || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-750 font-black">
                    <span className="text-zinc-300">Est. Profit:</span>
                    <span className={(b.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatKES(b.netProfit || (b.totalSales || 0) - (b.totalExpenses || 0))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Hourly Peak Distribution Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
              <span>Peak Sales Hours</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">Revenue curve throughout the day</p>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="hour" stroke="#71717a" textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [formatKES(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#ea580c" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-safari-mpesa" />
              <span>Sales by Category</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">Fast foods vs Swahili meals vs Drinks</p>
          </div>

          <div className="h-56 sm:h-64 w-full flex items-center justify-center">
            {categorySales.length === 0 ? (
              <div className="text-zinc-500 text-xs">No category sales recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#3f3f46',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [formatKES(value), 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Dishes & Cashier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Selling Menu Items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3">
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span>Best-Selling Dishes</span>
          </h3>

          <div className="space-y-2">
            {topItems.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-4">No dish sales recorded yet</div>
            ) : (
              topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-850 border border-zinc-750 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-zinc-800 text-brand-400 font-extrabold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-zinc-100 truncate">{item.name || item.itemName}</div>
                      {item.variant && <div className="text-[10px] text-zinc-400 truncate">{item.variant}</div>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-zinc-100">{formatKES(item.revenue)}</div>
                    <div className="text-[10px] text-zinc-400 font-semibold">{item.quantity} sold</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-3">
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span>Cashier Accountability</span>
          </h3>

          <div className="space-y-2">
            {cashierStats.length === 0 ? (
              <div className="text-zinc-500 text-xs text-center py-4">No staff sales records yet</div>
            ) : (
              cashierStats.map((c, idx) => {
                const displayName = c.name || c.cashierName || `Cashier ${idx + 1}`;
                const initials = displayName.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={c.cashierId || idx}
                    className="bg-zinc-850 border border-zinc-750 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-400 font-black flex items-center justify-center text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-zinc-100 truncate">{displayName}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{c.branchName || 'Migadini'} • {c.role || 'CASHIER'}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-400">{formatKES(c.totalSales)}</div>
                      <div className="text-[10px] text-zinc-400">{c.orderCount || 0} orders</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
