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
  Receipt,
  Wallet,
  ArrowRight,
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
import { DashboardSummary, Expense } from '../../types';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';

export const AnalyticsDashboard: React.FC = () => {
  const { currentBranchId, branches } = useBranch();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [hourlySales, setHourlySales] = useState<any[]>([]);
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [cashierStats, setCashierStats] = useState<any[]>([]);
  const [profitLoss, setProfitLoss] = useState<any | null>(null);
  const [expensesData, setExpensesData] = useState<{ totalAmount: number; count: number; expenses: Expense[] }>({
    totalAmount: 0,
    count: 0,
    expenses: [],
  });
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
        expData,
      ] = await Promise.all([
        api.getDashboardSummary({ branchId: currentBranchId || undefined }).catch(() => null),
        api.getSalesByCategory({ branchId: currentBranchId || undefined, days: 7 }).catch(() => []),
        api.getTopItems({ branchId: currentBranchId || undefined, limit: 7, days: 7 }).catch(() => []),
        api.getHourlySales({ branchId: currentBranchId || undefined }).catch(() => []),
        api.getBranchComparison().catch(() => []),
        api.getCashierPerformance({ branchId: currentBranchId || undefined }).catch(() => []),
        api.getProfitLoss({ branchId: currentBranchId || undefined }).catch(() => null),
        api.getExpenses({ branchId: currentBranchId || undefined }).catch(() => ({ totalAmount: 0, count: 0, expenses: [] })),
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
      setExpensesData(expData || { totalAmount: 0, count: 0, expenses: [] });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpenseCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'MARKET_PRODUCE':
        return { label: 'Wakulima Market', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'GAS_CHARCOAL':
        return { label: 'Gas / Charcoal', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'COOKING_OIL':
        return { label: 'Cooking Oil', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
      case 'DAILY_WAGES':
        return { label: 'Casual Wages', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'TRANSPORT_BODA':
        return { label: 'Boda Transport', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'REPAIRS':
        return { label: 'Repairs & Maint.', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
      case 'UTILITIES':
        return { label: 'Utilities (Water/Power)', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      default:
        return { label: 'Other Operating', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBranchId]);

  const COLORS = ['#ea580c', '#00a859', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];

  const exportExecutiveReportCSV = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const branchName = branches.find(b => b.id === currentBranchId)?.name || 'Migadini Main Shop';

    // 1. Income Metrics
    const grossSales = profitLoss?.grossSales || summary?.todayGrossSales || 0;
    const foodCost = profitLoss?.cogs || summary?.todayCOGS || Math.round(grossSales * 0.42);
    const grossFoodProfit = grossSales - foodCost;
    const totalExpenses = profitLoss?.totalExpenses || expensesData.totalAmount || summary?.totalTodayExpenses || 0;
    const netProfit = profitLoss?.netOperatingProfit || summary?.todayNetProfit || (grossFoodProfit - totalExpenses);
    const netMargin = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : '0.0';

    // 2. Category Breakdown
    const categoriesMap: Record<string, { label: string; amount: number; count: number }> = {
      GAS_CHARCOAL: { label: 'Gas & Charcoal Refills', amount: 0, count: 0 },
      MARKET_PRODUCE: { label: 'Wakulima Market Produce', amount: 0, count: 0 },
      COOKING_OIL: { label: 'Cooking Oil (Drums & Refills)', amount: 0, count: 0 },
      DAILY_WAGES: { label: 'Casual & Kitchen Staff Wages', amount: 0, count: 0 },
      TRANSPORT_BODA: { label: 'Boda Transport & Deliveries', amount: 0, count: 0 },
      REPAIRS: { label: 'Repairs & Equipment Maintenance', amount: 0, count: 0 },
      UTILITIES: { label: 'Utilities (Water & Electricity)', amount: 0, count: 0 },
      OTHER: { label: 'Other Operating Expenses', amount: 0, count: 0 },
    };

    expensesData.expenses.forEach(e => {
      const catKey = e.category || 'OTHER';
      if (!categoriesMap[catKey]) {
        categoriesMap[catKey] = { label: getExpenseCategoryBadge(catKey).label, amount: 0, count: 0 };
      }
      categoriesMap[catKey].amount += Number(e.amount);
      categoriesMap[catKey].count += 1;
    });

    if (expensesData.expenses.length === 0 && profitLoss?.expensesByCategory) {
      Object.entries(profitLoss.expensesByCategory as Record<string, number>).forEach(([catKey, amt]) => {
        if (!categoriesMap[catKey]) {
          categoriesMap[catKey] = { label: getExpenseCategoryBadge(catKey).label, amount: 0, count: 0 };
        }
        categoriesMap[catKey].amount = amt;
      });
    }

    const lines: string[] = [];

    // Header
    lines.push('================================================================================');
    lines.push(`NANI'S FRY NATION - EXECUTIVE BUSINESS & FINANCIAL REPORT`);
    lines.push('================================================================================');
    lines.push(`Report Generated: ${new Date().toLocaleString()}`);
    lines.push(`Branch: "${branchName}"`);
    lines.push('');

    // SECTION 1: EXECUTIVE FINANCIAL OVERVIEW
    lines.push('--------------------------------------------------------------------------------');
    lines.push('1. EXECUTIVE SUMMARY: INCOME, EXPENSES & NET PROFIT');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('Financial Metric,Amount (KES),Description');
    lines.push(`"Total Food Sales (Gross Income)","${grossSales}","Total customer sales rung up on POS"`);
    lines.push(`"Estimated Food Ingredient Cost (COGS)","${foodCost}","Direct kitchen food ingredients & recipe cost"`);
    lines.push(`"Gross Profit from Food Sales","${grossFoodProfit}","Income from food sales minus ingredient costs"`);
    lines.push(`"Total Operating Expenditures","${totalExpenses}","Total operational expenses (Gas, Produce, Oil, Wages)"`);
    lines.push(`"NET TAKE-HOME PROFIT / (LOSS)","${netProfit}","Net profit after deducting all operating expenses"`);
    lines.push(`"Net Profit Margin %","${netMargin}%","Percentage of income retained as profit"`);
    lines.push('');

    // SECTION 2: EXPENSES SUMMARY BREAKDOWN
    lines.push('--------------------------------------------------------------------------------');
    lines.push('2. OPERATING EXPENSES - SUMMARY BREAKDOWN (BY CATEGORY)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('Expense Category,Total Amount (KES),% of Total Expenses,Entries Count');
    Object.values(categoriesMap)
      .sort((a, b) => b.amount - a.amount)
      .forEach(cat => {
        const pct = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100).toFixed(1) : '0.0';
        lines.push(`"${cat.label}","${cat.amount}","${pct}%","${cat.count}"`);
      });
    lines.push(`"TOTAL OPERATING EXPENDITURES","${totalExpenses}","100.0%","${expensesData.expenses.length}"`);
    lines.push('');

    // SECTION 3: DETAILED EXPENSES REGISTER
    lines.push('--------------------------------------------------------------------------------');
    lines.push('3. DETAILED EXPENSES REGISTER (WHAT WAS BOUGHT - LINE BY LINE)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('Date,Item / Expense Description,Category,Supplier / Paid To,Payment Source,Receipt / Voucher #,Amount (KES)');
    if (expensesData.expenses.length > 0) {
      expensesData.expenses.forEach(exp => {
        const d = exp.createdAt ? exp.createdAt.slice(0, 10) : todayStr;
        const catBadge = getExpenseCategoryBadge(exp.category).label;
        const desc = (exp.description || '').replace(/"/g, '""');
        const paidTo = (exp.paidTo || 'N/A').replace(/"/g, '""');
        const src = exp.paymentSource === 'CASH_DRAWER' ? 'Cash Drawer Float' : 'Bank / M-Pesa Till';
        const rcpt = exp.receiptNumber || 'N/A';
        lines.push(`"${d}","${desc}","${catBadge}","${paidTo}","${src}","${rcpt}","${exp.amount}"`);
      });
    } else {
      lines.push('"No detailed expense entries recorded yet","","","","","","0"');
    }
    lines.push('');

    // SECTION 4: FOOD SALES & PROFIT FROM SELLING FOODS
    lines.push('--------------------------------------------------------------------------------');
    lines.push('4. FOOD SALES & PROFIT MADE FROM SELLING FOODS');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('Dish Name,Portion / Variant,Quantity Sold,Total Revenue (KES),Estimated Cost (KES),PROFIT MADE (KES),Profit Margin %');
    if (topItems && topItems.length > 0) {
      topItems.forEach(item => {
        const name = (item.name || item.itemName || 'Dish').replace(/"/g, '""');
        const variant = (item.variant || 'Standard').replace(/"/g, '""');
        const qty = item.quantity || 0;
        const rev = item.revenue || 0;
        const cost = item.cost !== undefined ? item.cost : Math.round(rev * 0.42);
        const profit = item.profit !== undefined ? item.profit : Math.round(rev - cost);
        const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';
        lines.push(`"${name}","${variant}","${qty}","${rev}","${cost}","${profit}","${margin}%"`);
      });
      const totalFoodRev = topItems.reduce((s, i) => s + (i.revenue || 0), 0);
      const totalFoodCost = topItems.reduce((s, i) => s + (i.cost || Math.round((i.revenue || 0) * 0.42)), 0);
      const totalFoodProfit = totalFoodRev - totalFoodCost;
      const totalFoodMargin = totalFoodRev > 0 ? ((totalFoodProfit / totalFoodRev) * 100).toFixed(1) : '0.0';
      lines.push(`"TOTAL FOOD SALES","","${topItems.reduce((s, i) => s + (i.quantity || 0), 0)}","${totalFoodRev}","${totalFoodCost}","${totalFoodProfit}","${totalFoodMargin}%"`);
    } else {
      lines.push('"No food sales recorded yet","","0","0","0","0","0.0%"');
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nani_frys_executive_report_${todayStr}.csv`);
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
            onClick={exportExecutiveReportCSV}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm active:scale-95"
            title="Download complete income, operating expenses breakdown, detailed vouchers, and food profit analysis for Excel"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export Executive Report (Excel/CSV)</span>
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

      {/* Owner Expenditure & Cost Intelligence Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3 sm:pb-4">
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-red-500" />
              <span>Owner's Expenditure & Cost Intelligence</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Comprehensive report of operational costs, market produce, cooking oil, gas refills, and net margins
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400 font-semibold">Total Expenditures:</span>
            <span className="text-sm sm:text-base font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl">
              {formatKES(expensesData.totalAmount || summary?.totalTodayExpenses || 0)}
            </span>
          </div>
        </div>

        {/* 3 Core Intelligence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Profitability Equation */}
          <div className="bg-zinc-850/80 border border-zinc-750/80 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block">P&L Net Profit Reconciliation</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Gross Sales Revenue:</span>
                <span className="font-black text-white">{formatKES(profitLoss?.grossSales || summary?.todayGrossSales || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>− Cost of Goods (COGS):</span>
                <span className="font-bold">− {formatKES(profitLoss?.cogs || summary?.todayCOGS || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-red-400">
                <span>− Operational Expenditures:</span>
                <span className="font-bold">− {formatKES(profitLoss?.totalExpenses || expensesData.totalAmount || summary?.totalTodayExpenses || 0)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-700/80 flex justify-between items-center">
                <span className="font-bold text-zinc-200">Take-Home Net Profit:</span>
                <span className={`text-base font-black ${(profitLoss?.netOperatingProfit || summary?.todayNetProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatKES(profitLoss?.netOperatingProfit || summary?.todayNetProfit || 0)}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 flex justify-between">
                <span>Net Profit Margin:</span>
                <span className="font-bold text-zinc-400">{profitLoss?.netMargin || 0}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Cash Drawer vs Bank/M-Pesa Payouts */}
          <div className="bg-zinc-850/80 border border-zinc-750/80 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block">Payout Channels</span>
            <div className="space-y-2.5 text-xs">
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-zinc-400 text-[11px] font-semibold">Cash Drawer Payouts</div>
                  <div className="text-[10px] text-zinc-500">Paid out from till float</div>
                </div>
                <div className="font-black text-amber-400 text-sm">
                  {formatKES(expensesData.expenses.filter(e => e.paymentSource === 'CASH_DRAWER').reduce((s, e) => s + e.amount, 0))}
                </div>
              </div>
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-zinc-400 text-[11px] font-semibold">Bank / M-Pesa Payouts</div>
                  <div className="text-[10px] text-zinc-500">Paid via till/business paybill</div>
                </div>
                <div className="font-black text-safari-mpesa text-sm">
                  {formatKES(expensesData.expenses.filter(e => e.paymentSource !== 'CASH_DRAWER').reduce((s, e) => s + e.amount, 0))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Top Expense Categories */}
          <div className="bg-zinc-850/80 border border-zinc-750/80 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block">Top Expenditure Categories</span>
            <div className="space-y-2 text-xs">
              {Object.entries(
                expensesData.expenses.reduce((acc: Record<string, number>, e) => {
                  acc[e.category] = (acc[e.category] || 0) + e.amount;
                  return acc;
                }, (profitLoss?.expensesByCategory as Record<string, number>) || {})
              ).slice(0, 4).map(([cat, amt]) => {
                const badge = getExpenseCategoryBadge(cat);
                const pct = (expensesData.totalAmount || summary?.totalTodayExpenses)
                  ? Math.round((amt / (expensesData.totalAmount || summary?.totalTodayExpenses || 1)) * 100)
                  : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-zinc-300">{badge.label}</span>
                      <span className="font-bold text-zinc-100">{formatKES(amt)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              {expensesData.expenses.length === 0 && (!profitLoss?.expensesByCategory || Object.keys(profitLoss.expensesByCategory).length === 0) && (
                <div className="text-zinc-500 text-xs text-center py-4">No expense categories recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Recent Expenditure Vouchers Table */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300">
              Recent Expenditure Vouchers ({expensesData.expenses.length} entries):
            </span>
          </div>

          {expensesData.expenses.length > 0 ? (
            <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Paid To</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Source</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium bg-zinc-900/50">
                  {expensesData.expenses.slice(0, 8).map(exp => {
                    const badge = getExpenseCategoryBadge(exp.category);
                    return (
                      <tr key={exp.id} className="hover:bg-zinc-800/40">
                        <td className="py-2 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                          {formatKenyaDateTime(exp.createdAt).split(' ')[0]}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-200 max-w-[180px] truncate">
                          {exp.description}
                        </td>
                        <td className="py-2 px-3 text-zinc-400 hidden sm:table-cell">
                          {exp.paidTo || '—'}
                        </td>
                        <td className="py-2 px-3 hidden md:table-cell text-[11px]">
                          <span className={exp.paymentSource === 'CASH_DRAWER' ? 'text-amber-400 font-bold' : 'text-safari-mpesa font-bold'}>
                            {exp.paymentSource === 'CASH_DRAWER' ? 'Cash Drawer' : 'Bank / M-Pesa'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-red-400 font-mono whitespace-nowrap">
                          - {formatKES(exp.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 bg-zinc-950/40 border border-zinc-800/70 rounded-xl text-center text-xs text-zinc-500">
              No recent expenditures logged for this branch. Expenses added via the Expense Tracker will show up here.
            </div>
          )}
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
                    <div className="text-[10px] text-emerald-400 font-bold">
                      +{formatKES(item.profit !== undefined ? item.profit : Math.round(item.revenue * 0.58))} profit
                    </div>
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
