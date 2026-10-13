import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowRightLeft,
  ClipboardCheck,
  Search,
  AlertTriangle,
  RefreshCw,
  PackagePlus,
  Package,
  Layers,
  History,
  TrendingDown,
  Trash2,
  Edit2,
} from 'lucide-react';
import { StockItem, Branch, MenuItem, StockTransfer, StockAudit } from '../../types';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { formatKES, formatKenyaDateTime } from '../../utils/currency';
import { RestockModal } from './RestockModal';
import { StockTransferModal } from './StockTransferModal';
import { StockAuditModal } from './StockAuditModal';
import { RecipeManager } from './RecipeManager';
import { AddEditStockModal } from './AddEditStockModal';

export const InventoryManager: React.FC = () => {
  const { currentBranchId, branches } = useBranch();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECIPES' | 'TRANSFERS' | 'AUDITS'>('STOCK');

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [audits, setAudits] = useState<StockAudit[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedStockForRestock, setSelectedStockForRestock] = useState<StockItem | null>(null);
  const [selectedStockForTransfer, setSelectedStockForTransfer] = useState<StockItem | null>(null);
  const [selectedStockForAudit, setSelectedStockForAudit] = useState<StockItem | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [stockItemToEdit, setStockItemToEdit] = useState<StockItem | null>(null);

  const handleDeleteStock = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from stock?`)) return;
    try {
      await api.deleteStockItem(id);
      fetchInventoryData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stock item');
    }
  };

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const [stockData, menuData] = await Promise.all([
        api.getInventory({ branchId: currentBranchId || undefined }),
        api.getMenu(),
      ]);
      setStockItems(stockData);
      setMenuItems(menuData);

      if (activeTab === 'TRANSFERS') {
        const trData = await api.getStockTransfers({ branchId: currentBranchId || undefined });
        setTransfers(trData);
      } else if (activeTab === 'AUDITS') {
        const auData = await api.getStockAudits({ branchId: currentBranchId || undefined });
        setAudits(auData);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [currentBranchId, activeTab]);

  const filteredStock = useMemo(() => {
    return stockItems.filter(item => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesLowStock = !lowStockFilter || item.isLowStock;
      return matchesSearch && matchesType && matchesLowStock;
    });
  }, [stockItems, searchQuery, typeFilter, lowStockFilter]);

  const lowStockCount = stockItems.filter(s => s.isLowStock).length;
  const totalStockValue = stockItems.reduce((sum, s) => sum + (s.stockValue || 0), 0);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-950">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2.5">
            <Boxes className="w-6 h-6 text-brand-500" />
            <span>Stock & Inventory Engine</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Raw ingredients, packaged drinks, recipes, and multi-branch transfer logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Stock Button */}
          <button
            onClick={() => {
              setStockItemToEdit(null);
              setShowAddStockModal(true);
            }}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'STOCK' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Stock Levels
            </button>
            <button
              onClick={() => setActiveTab('RECIPES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'RECIPES' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Recipes (BOM)
            </button>
            <button
              onClick={() => setActiveTab('TRANSFERS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'TRANSFERS' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Transfers
            </button>
            <button
              onClick={() => setActiveTab('AUDITS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'AUDITS' ? 'bg-brand-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Audits & Shrinkage
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400">Total Tracked Items</span>
            <div className="text-2xl font-black text-white mt-1">{stockItems.length}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400">Total Inventory Valuation</span>
            <div className="text-2xl font-black text-brand-400 mt-1">{formatKES(totalStockValue)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setLowStockFilter(prev => !prev)}
          className={`cursor-pointer bg-zinc-900 border rounded-3xl p-4 flex items-center justify-between transition ${
            lowStockCount > 0 ? 'border-amber-500/40 hover:bg-zinc-850' : 'border-zinc-800'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-zinc-400">Low Stock Alerts</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{lowStockCount} Items</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === 'STOCK' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center space-x-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search potatoes, chicken, sodas..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-2xl py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="all">All Item Types</option>
                <option value="RAW_INGREDIENT">Raw Ingredients (kg/L)</option>
                <option value="PACKAGED_UNIT">Packaged Units (Drinks/Snacks)</option>
              </select>
            </div>

            <button
              onClick={() => fetchInventoryData()}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl border border-zinc-700 transition"
              title="Refresh inventory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Stock Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Min Alert</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredStock.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-bold text-zinc-100 flex items-center space-x-2">
                      <span>{item.name}</span>
                      {item.isLowStock && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                          LOW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{item.branch?.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                          item.type === 'RAW_INGREDIENT'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                            : 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
                        }`}
                      >
                        {item.type === 'RAW_INGREDIENT' ? 'Raw Ingredient' : 'Packaged Unit'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-sm">
                      <span className={item.isLowStock ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-emerald-700 dark:text-emerald-400 font-extrabold'}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-semibold">
                      {item.minStockAlert} {item.unit}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-300">{formatKES(item.unitCost)}</td>
                    <td className="py-3 px-4 font-bold text-zinc-100">
                      {formatKES(item.stockValue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedStockForRestock(item)}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold rounded-xl text-xs transition shadow-sm"
                          title="Restock Intake"
                        >
                          + Restock
                        </button>
                        <button
                          onClick={() => {
                            setStockItemToEdit(item);
                            setShowAddStockModal(true);
                          }}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-brand-400 rounded-xl border border-zinc-700 transition"
                          title="Edit Stock Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedStockForTransfer(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition"
                          title="Transfer to another branch"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedStockForAudit(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 rounded-xl border border-zinc-700 transition"
                          title="Stock Audit & Reconciliation"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStock(item.id, item.name)}
                          className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-700 hover:border-red-500/30 transition"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPE BUILDER */}
      {activeTab === 'RECIPES' && (
        <RecipeManager menuItems={menuItems} stockItems={stockItems} />
      )}

      {/* TAB 3: TRANSFERS */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Inter-Branch Stock Transfer Audit Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item Transferred</th>
                  <th className="py-3 px-4">Source Branch</th>
                  <th className="py-3 px-4">Destination Branch</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {transfers.map(tr => (
                  <tr key={tr.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-4 text-zinc-400">{formatKenyaDateTime(tr.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-white">{tr.stockItem?.name}</td>
                    <td className="py-3 px-4 text-amber-400">{tr.sourceBranch?.name}</td>
                    <td className="py-3 px-4 text-emerald-400">{tr.destBranch?.name}</td>
                    <td className="py-3 px-4 font-black">
                      {tr.quantity} {tr.stockItem?.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {tr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{tr.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITS & SHRINKAGE */}
      {activeTab === 'AUDITS' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Physical Stock Reconciliation & Wastage Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Expected</th>
                  <th className="py-3 px-4">Counted</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Audited By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {audits.map(au => (
                  <tr key={au.id} className="hover:bg-zinc-800/40">
                    <td className="py-3 px-4 text-zinc-400">{formatKenyaDateTime(au.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-white">{au.stockItem?.name}</td>
                    <td className="py-3 px-4 text-zinc-400">{au.branch?.name}</td>
                    <td className="py-3 px-4">{au.systemStock}</td>
                    <td className="py-3 px-4 font-bold text-zinc-100">{au.countedStock}</td>
                    <td className="py-3 px-4 font-black">
                      <span className={au.variance < 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {au.variance > 0 ? `+${au.variance}` : au.variance}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {au.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{au.auditedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <RestockModal
        item={selectedStockForRestock}
        isOpen={!!selectedStockForRestock}
        onClose={() => setSelectedStockForRestock(null)}
        onRestocked={fetchInventoryData}
      />

      <StockTransferModal
        item={selectedStockForTransfer}
        branches={branches}
        isOpen={!!selectedStockForTransfer}
        onClose={() => setSelectedStockForTransfer(null)}
        onTransferred={fetchInventoryData}
      />

      <StockAuditModal
        item={selectedStockForAudit}
        isOpen={!!selectedStockForAudit}
        onClose={() => setSelectedStockForAudit(null)}
        onAudited={fetchInventoryData}
      />

      <AddEditStockModal
        isOpen={showAddStockModal}
        itemToEdit={stockItemToEdit}
        branches={branches}
        currentBranchId={currentBranchId}
        onClose={() => {
          setShowAddStockModal(false);
          setStockItemToEdit(null);
        }}
        onSaved={fetchInventoryData}
      />
    </div>
  );
};
