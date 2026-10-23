import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, MessageSquare, Sparkles } from 'lucide-react';
import { MenuItem, MenuItemVariant } from '../../types';
import { formatKES } from '../../utils/currency';

interface VariantModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant: MenuItemVariant | null, qty: number, lineNote: string) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!isOpen || !item) return null;

  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(
    item.variants && item.variants.length > 0 ? item.variants[0] : null
  );
  const [customAmount, setCustomAmount] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  // Reset state when modal opens with a new item
  useEffect(() => {
    if (item) {
      setSelectedVariant(item.variants && item.variants.length > 0 ? item.variants[0] : null);
      setCustomAmount('');
      setQuantity(1);
      setNote('');
    }
  }, [item]);

  const quickNotes = [
    'No Pili Pili / Chili',
    'Extra Kachumbari',
    'Extra Gravy / Soup',
    'Pack for Takeaway',
    'Crispy / Well Done',
    'Separate Plate',
  ];

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const customVar: MenuItemVariant = {
        id: `custom-${num}`,
        menuItemId: item.id,
        name: `KES ${num} Portion`,
        price: num,
        costPrice: Math.round(num * 0.4),
        isAvailable: true,
      };
      setSelectedVariant(customVar);
    } else if (item.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0]);
    }
  };

  const handleSelectPresetVariant = (v: MenuItemVariant) => {
    setSelectedVariant(v);
    setCustomAmount('');
  };

  const handleAdd = () => {
    onAddToCart(item, selectedVariant, quantity, note);
    setQuantity(1);
    setNote('');
    setCustomAmount('');
    onClose();
  };

  const currentPrice = selectedVariant ? selectedVariant.price : item.basePrice;
  const totalPrice = currentPrice * quantity;
  const isSodasOrTwoVariants = item.variants && item.variants.length === 2;
  const hasManyVariants = item.variants && item.variants.length > 4;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div>
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">
              {item.category?.name || 'Menu Option'}
            </span>
            <h3 className="text-base font-extrabold text-zinc-100 flex items-center space-x-1.5">
              <span>{item.name}</span>
              {customAmount && (
                <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-bold">
                  KES {customAmount}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Variants Selector */}
          {item.variants && item.variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-300">
                  Select Portion / Size:
                </label>
                <span className="text-[10px] text-zinc-500">
                  {item.variants.length} available
                </span>
              </div>

              {/* Grid Layout depending on number of variants */}
              <div
                className={`grid gap-2 ${
                  isSodasOrTwoVariants
                    ? 'grid-cols-2'
                    : hasManyVariants
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                }`}
              >
                {item.variants.map(v => {
                  const isSelected = selectedVariant?.id === v.id && !customAmount;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectPresetVariant(v)}
                      className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-brand-500/15 border-brand-500 text-white shadow-md'
                          : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs truncate">{v.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 ml-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="font-black text-brand-400 text-xs sm:text-sm mt-1">
                        {formatKES(v.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Amount Input (especially for Viazi Karai & flexible pricing) */}
          <div className="bg-zinc-800/40 p-3 rounded-2xl border border-zinc-800">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Custom Price / Amount</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                E.g. 10, 30, 60, 70, 90...
              </span>
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-xs font-bold text-zinc-500">KES</span>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={customAmount}
                  onChange={e => handleCustomAmountChange(e.target.value)}
                  placeholder="Type any amount (e.g. 60, 70)..."
                  className="w-full bg-zinc-900 border border-zinc-750 rounded-xl py-2 pl-12 pr-3 text-xs text-amber-300 font-bold placeholder-zinc-600 focus:outline-none focus:border-brand-500"
                />
              </div>
              {customAmount && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomAmount('');
                    if (item.variants && item.variants.length > 0) {
                      setSelectedVariant(item.variants[0]);
                    }
                  }}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quantity Adjuster */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-2">Quantity</label>
            <div className="flex items-center justify-center space-x-4 bg-zinc-800/60 p-2 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-white flex items-center justify-center font-black"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-black text-xl text-white w-12 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(prev => prev + 1)}
                className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white flex items-center justify-center font-black shadow-md shadow-brand-500/25"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Item Notes / Custom Kitchen Instructions */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>Special Kitchen Instructions (Optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. no pili pili, extra gravy, pack separate..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 mb-2"
            />
            {/* Quick Note Pills */}
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map(qn => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNote(prev => (prev ? `${prev}, ${qn}` : qn))}
                  className="text-[10px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2 py-1 rounded-lg border border-zinc-700/60 transition"
                >
                  + {qn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer / Add Button */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-medium">Total Item Price</span>
            <div className="text-lg font-black text-brand-400">{formatKES(totalPrice)}</div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 transition flex items-center space-x-2 text-xs sm:text-sm"
          >
            <span>Add to Order</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
