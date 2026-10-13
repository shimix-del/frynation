import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { StockItem, Branch } from '../../types';
import { api } from '../../services/api';

interface AddEditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  itemToEdit?: StockItem | null;
  branches: Branch[];
  currentBranchId?: string | null;
}

export const AddEditStockModal: React.FC<AddEditStockModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  itemToEdit,
  branches,
  currentBranchId,
}) => {
  const isEditing = Boolean(itemToEdit);

  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [type, setType] = useState<'RAW_INGREDIENT' | 'PACKAGED_UNIT'>('RAW_INGREDIENT');
  const [unit, setUnit] = useState<string>('kg');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minStockAlert, setMinStockAlert] = useState<string>('5');
  const [unitCost, setUnitCost] = useState<string>('0');
  const [supplierName, setSupplierName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setSku(itemToEdit.sku || '');
      setType(itemToEdit.type || 'RAW_INGREDIENT');
      setUnit(itemToEdit.unit || 'kg');
      setCurrentStock(itemToEdit.currentStock.toString());
      setMinStockAlert(itemToEdit.minStockAlert.toString());
      setUnitCost(itemToEdit.unitCost.toString());
      setSupplierName(itemToEdit.supplierName || '');
      setBranchId(itemToEdit.branchId);
    } else {
      setName('');
      setSku('');
      setType('RAW_INGREDIENT');
      setUnit('kg');
      setCurrentStock('0');
      setMinStockAlert('5');
      setUnitCost('0');
      setSupplierName('');
      setBranchId(currentBranchId || (branches.length > 0 ? branches[0].id : ''));
    }
    setErrorMsg('');
  }, [itemToEdit, isOpen, currentBranchId, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Item name is required');
      return;
    }
    if (!branchId) {
      setErrorMsg('Branch is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        type,
        unit: unit.trim() || 'kg',
        currentStock: parseFloat(currentStock) || 0,
        minStockAlert: parseFloat(minStockAlert) || 5,
        unitCost: parseFloat(unitCost) || 0,
        supplierName: supplierName.trim() || undefined,
        branchId,
      };

      if (isEditing && itemToEdit) {
        await api.updateStockItem(itemToEdit.id, payload);
      } else {
        await api.createStockItem(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save stock item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToEdit) return;
    if (!confirm(`Are you sure you want to permanently delete "${itemToEdit.name}" from inventory?`)) return;

    setIsSubmitting(true);
    try {
      await api.deleteStockItem(itemToEdit.id);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete stock item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-500">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {isEditing ? 'Edit Stock & Inventory Item' : 'Add New Stock Item'}
              </h3>
              <p className="text-xs text-zinc-400">
                {isEditing ? 'Update item details, cost price, and alerts' : 'Register a new raw ingredient or packaged product'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-xs text-red-400 font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Item Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Potatoes (Shangi), Cooking Oil, Chicken Breast"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 font-semibold"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Inventory Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="RAW_INGREDIENT">Raw Ingredient (for recipes)</option>
                <option value="PACKAGED_UNIT">Packaged Unit (bottles, drinks, snacks)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 font-semibold"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="litre">litre (Litres)</option>
                <option value="piece">piece (Pieces)</option>
                <option value="bottle">bottle (Bottles)</option>
                <option value="packet">packet (Packets)</option>
                <option value="crate">crate (Crates)</option>
                <option value="portion">portion (Portions)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Current Stock Qty</label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentStock}
                onChange={e => setCurrentStock(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Min Stock Alert</label>
              <input
                type="number"
                step="any"
                min="0"
                value={minStockAlert}
                onChange={e => setMinStockAlert(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Unit Cost Price (KES)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-brand-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Supplier / Vendor</label>
              <input
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="e.g. Kenchic, Bidco, Farmers Market"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3.5 py-2.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Stock</span>
              </button>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-xs font-extrabold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25 disabled:opacity-50"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Stock' : 'Add Stock Item'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
