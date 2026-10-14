import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  Package,
  Trash2,
  Edit2,
} from 'lucide-react';
import { StockItem } from '../../types';
import { api } from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { formatKES } from '../../utils/currency';
import { RestockModal } from './RestockModal';
import { AddEditStockModal } from './AddEditStockModal';

export const InventoryManager: React.FC = () => {
  const { currentBranchId, branches } = useBranch();

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedStockForRestock, setSelectedStockForRestock] = useState<StockItem | null>(null);
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
      const stockData = await api.getInventory({ branchId: currentBranchId || undefined });
      setStockItems(stockData);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [currentBranchId]);

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
            Raw ingredients, packaged drinks, and current inventory stock levels
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* STOCK LEVELS LIST */}
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
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stock Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4 hidden lg:table-cell">Alert Threshold</th>
                <th className="py-3 px-4 hidden sm:table-cell">Unit Cost</th>
                <th className="py-3 px-4 hidden md:table-cell">Total Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    {isLoading ? 'Loading stock inventory...' : 'No inventory items match your search.'}
                  </td>
                </tr>
              ) : (
                filteredStock.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-800/40">
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                      <div className="font-bold text-white text-xs sm:text-sm">{item.name}</div>
                      <div className="text-[10px] sm:text-xs text-zinc-400">
                        {item.supplierName || 'Migadini Local Market'} {item.sku ? `• SKU: ${item.sku}` : ''}
                      </div>
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.type === 'RAW_INGREDIENT'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {item.type === 'RAW_INGREDIENT' ? 'Raw Ingredient' : 'Packaged Drink/Unit'}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-black text-xs sm:text-sm">
                      <span className={item.isLowStock ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-400 font-semibold hidden lg:table-cell">
                      {item.minStockAlert} {item.unit}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-zinc-300 hidden sm:table-cell">
                      {formatKES(item.unitCost)}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-bold text-zinc-100 hidden md:table-cell">
                      {formatKES(item.stockValue)}
                    </td>
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">
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
                          onClick={() => handleDeleteStock(item.id, item.name)}
                          className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl border border-zinc-700 hover:border-red-500/30 transition"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <RestockModal
        item={selectedStockForRestock}
        isOpen={!!selectedStockForRestock}
        onClose={() => setSelectedStockForRestock(null)}
        onRestocked={fetchInventoryData}
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
