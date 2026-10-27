import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  X,
  Layers,
} from 'lucide-react';
import { MenuItem, Category } from '../../types';
import { api } from '../../services/api';
import { formatKES } from '../../utils/currency';

export const MenuManager: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [basePrice, setBasePrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variantsList, setVariantsList] = useState<Array<{ id?: string; name: string; price: string; costPrice: string }>>([
    { name: 'Regular Portion', price: '', costPrice: '' },
  ]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchMenu = async () => {
    setIsLoading(true);
    try {
      const [items, cats] = await Promise.all([api.getMenu(), api.getCategories()]);
      setMenuItems(items);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setBasePrice('');
    setCostPrice('');
    setDescription('');
    setImageUrl('');
    setHasVariants(false);
    setVariantsList([{ name: 'Small / Quarter', price: '', costPrice: '' }]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setBasePrice(item.basePrice.toString());
    setCostPrice(item.costPrice.toString());
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setHasVariants(item.hasVariants);
    if (item.variants && item.variants.length > 0) {
      setVariantsList(
        item.variants.map(v => ({
          id: v.id,
          name: v.name,
          price: v.price.toString(),
          costPrice: v.costPrice.toString(),
        }))
      );
    } else {
      setVariantsList([{ name: 'Standard', price: item.basePrice.toString(), costPrice: item.costPrice.toString() }]);
    }
    setIsModalOpen(true);
  };

  const handleToggleStock = async (item: MenuItem) => {
    try {
      const updated = await api.toggleStock(item.id);
      setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, isAvailable: updated.isAvailable } : m)));
    } catch (err) {
      console.error('Failed to toggle stock:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu dish?')) return;
    try {
      await api.deleteMenuItem(id);
      fetchMenu();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        categoryId,
        name,
        description,
        basePrice: parseFloat(basePrice),
        costPrice: parseFloat(costPrice) || 0,
        imageUrl: imageUrl || null,
        hasVariants,
        variants: hasVariants
          ? variantsList
              .filter(v => v.name && v.price)
              .map(v => ({
                id: v.id,
                name: v.name,
                price: parseFloat(v.price),
                costPrice: parseFloat(v.costPrice) || 0,
              }))
          : undefined,
      };

      if (editingItem) {
        await api.updateMenuItem(editingItem.id, payload);
      } else {
        await api.createMenuItem(payload);
      }

      setIsModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = menuItems.filter(
    i =>
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2.5">
            <Utensils className="w-6 h-6 text-brand-500" />
            <span>Menu & Product Management</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure dishes, portions, selling prices, cost prices, and instant out-of-stock toggles
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
          <button
            onClick={fetchMenu}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl border border-zinc-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar & Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dish or category..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Dish</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Cost Price (COGS)</th>
                <th className="py-3 px-4">Profit Margin</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filtered.map(item => {
                const margin =
                  item.basePrice > 0
                    ? (((item.basePrice - item.costPrice) / item.basePrice) * 100).toFixed(0)
                    : 0;

                return (
                  <tr key={item.id} className="hover:bg-zinc-850/60 transition">
                    <td className="py-3 px-4 font-bold text-zinc-100 flex items-center space-x-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-sm">
                          🍲
                        </div>
                      )}
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{item.category?.name}</td>
                    <td className="py-3 px-4 font-black text-brand-400">
                      {formatKES(item.basePrice)}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{formatKES(item.costPrice)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{margin}% margin</td>
                    <td className="py-3 px-4">
                      {item.hasVariants && item.variants ? (
                        <span className="text-[10px] bg-brand-500/15 text-brand-300 px-2 py-0.5 rounded-full font-bold">
                          {item.variants.length} Portions
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Single</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-extrabold flex items-center space-x-1.5 transition border shadow-sm ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                            : 'bg-red-100 text-red-800 border-red-400 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40'
                        }`}
                      >
                        {item.isAvailable ? <Eye className="w-3.5 h-3.5 stroke-[2.5]" /> : <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>{item.isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-400 rounded-xl border border-zinc-700"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <h3 className="font-bold text-white text-base">
                {editingItem ? 'Edit Dish Details' : 'Add New Menu Dish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Swahili Beef Pilau"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 font-bold focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Selling Price (KES) *
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={e => setBasePrice(e.target.value)}
                    placeholder="e.g. 320"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-brand-400 font-black focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Cost Price / COGS (KES)
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    placeholder="e.g. 140"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Description / Ingredients Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Fragrant basmati rice slow-cooked with tender beef"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Has Variants Toggle */}
              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={e => setHasVariants(e.target.checked)}
                    className="rounded text-brand-500 focus:ring-0"
                  />
                  <span>This dish has portions / variants (e.g. 1/4, 1/2, Full Kuku)</span>
                </label>
              </div>

              {hasVariants && (
                <div className="space-y-2 bg-zinc-800/60 p-3 rounded-2xl border border-zinc-750">
                  <span className="text-xs font-bold text-zinc-300">Portions / Variants:</span>
                  {variantsList.map((v, idx) => (
                    <div key={idx} className="flex space-x-2 items-center">
                      <input
                        type="text"
                        value={v.name}
                        onChange={e => {
                          const updated = [...variantsList];
                          updated[idx].name = e.target.value;
                          setVariantsList(updated);
                        }}
                        placeholder="e.g. 1/4 Kuku Choma"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100"
                      />
                      <input
                        type="number"
                        value={v.price}
                        onChange={e => {
                          const updated = [...variantsList];
                          updated[idx].price = e.target.value;
                          setVariantsList(updated);
                        }}
                        placeholder="Price"
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 text-xs text-brand-400 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setVariantsList(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setVariantsList(prev => [...prev, { name: '', price: '', costPrice: '' }])
                    }
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold mt-1"
                  >
                    + Add Another Variant
                  </button>
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition"
                >
                  {isSaving ? 'Saving...' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
