import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Filter,
  RefreshCw,
  Carrot,
  Flame,
  Fuel,
  Users,
  Bike,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { Expense } from '../../types';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { AddExpenseModal } from './AddExpenseModal';

export const ExpenseTracker: React.FC = () => {
  const { currentBranchId } = useBranch();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await api.getExpenses({
        branchId: currentBranchId || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        date: dateFilter || undefined,
      });
      setExpenses(res.expenses);
      setTotalAmount(res.totalAmount);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [currentBranchId, categoryFilter, dateFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const getCategoryBadge = (cat: string) => {
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
        return { label: 'Repairs', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
      default:
        return { label: 'Other Operating', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2.5">
            <TrendingDown className="w-6 h-6 text-red-500" />
            <span>Daily Eatery Expense Tracker</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Log market produce, cooking oil, gas refills, and staff wages for real Net Profit calculation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-red-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
          <button
            onClick={fetchExpenses}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl border border-zinc-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400">Total Expenses Logged</span>
            <div className="text-2xl font-black text-red-400 mt-1">{formatKES(totalAmount)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400">Number of Entries</span>
            <div className="text-2xl font-black text-white mt-1">{expenses.length} Records</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400">Active Filter Date</span>
            <div className="text-sm font-black text-brand-400 mt-1">
              {dateFilter || 'All Dates'}
            </div>
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-zinc-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Bar & Expenses Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-2xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 font-semibold"
            >
              <option value="all">All Categories</option>
              <option value="MARKET_PRODUCE">Wakulima Produce (Tomatoes/Onions)</option>
              <option value="GAS_CHARCOAL">Gas Refill / Charcoal</option>
              <option value="COOKING_OIL">Cooking Oil Jerrycans</option>
              <option value="DAILY_WAGES">Casual Staff Wages</option>
              <option value="TRANSPORT_BODA">Boda Delivery / Transport</option>
              <option value="REPAIRS">Kitchen Equipment Repairs</option>
              <option value="OTHER">Other Operating Costs</option>
            </select>
          </div>
        </div>

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Paid To</th>
                <th className="py-3 px-4">Payment Source</th>
                <th className="py-3 px-4">Amount (KES)</th>
                <th className="py-3 px-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No expense records found for this period.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => {
                  const badge = getCategoryBadge(exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-zinc-800/40">
                      <td className="py-3 px-4 text-zinc-400">{formatKenyaDateTime(exp.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-white">{exp.branch?.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-200 font-medium">{exp.description}</td>
                      <td className="py-3 px-4 text-zinc-400">{exp.paidTo || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                            exp.paymentSource === 'CASH_DRAWER'
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-safari-mpesa/10 text-safari-mpesa'
                          }`}
                        >
                          {exp.paymentSource === 'CASH_DRAWER' ? 'Cash Drawer' : 'Bank / M-Pesa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-red-400 text-sm">
                        {formatKES(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 transition"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onExpenseAdded={fetchExpenses}
      />
    </div>
  );
};
