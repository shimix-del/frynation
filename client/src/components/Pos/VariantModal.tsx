import React, { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { MenuItem, MenuItemVariant } from '../../types';
import { formatKES } from '../../utils/currency';
import { menuPricing } from '../../utils/menuPricing';

interface VariantModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant: MenuItemVariant | null, qty: number, lineNote: string, sellingPrice?: number) => void;
}
export const VariantModal: React.FC<VariantModalProps> = ({ item, isOpen, onClose, onAddToCart }) => {
  const [variantId, setVariantId] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  useEffect(() => {
    setVariantId(item?.variants?.find(v => v.isAvailable)?.id || '');
    setPrice(''); setQuantity(1); setNote('');
  }, [item, isOpen]);
  if (!isOpen || !item) return null;
  const pricing = menuPricing(item.name);
  const variants = item.variants?.filter(v => v.isAvailable) || [];
  const variant = pricing === 'fixed' ? variants.find(v => v.id === variantId) || null
    : variants.find(v => Number(v.price) === Number(price)) || null;
  const unitPrice = pricing === 'fixed' ? Number(variant?.price ?? item.basePrice) : Number(price);
  const validPrice = Number.isFinite(unitPrice) && unitPrice > 0 && (pricing !== 'soda' || [50, 70].includes(unitPrice))
    && (pricing === 'fixed' || /^\d+(\.\d{1,2})?$/.test(price));
  const valid = validPrice && (pricing !== 'fixed' || !item.hasVariants || !!variant);
  return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${item.name} price`}>
    <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md p-5 space-y-5 text-white">
      <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{item.name}</h3><button onClick={onClose} aria-label="Close price options"><X /></button></div>
      {pricing === 'soda' && <div><p className="mb-3 text-sm text-zinc-300">Choose the selling price</p><div className="grid grid-cols-2 gap-3">{[50, 70].map(value => <button key={value} aria-pressed={price === String(value)} onClick={() => setPrice(String(value))} className={`rounded-xl p-4 font-bold border ${price === String(value) ? 'bg-brand-500 border-brand-400' : 'bg-zinc-800 border-zinc-600'}`}>{formatKES(value)}</button>)}</div></div>}
      {pricing === 'manual' && <label className="block text-sm font-bold">Amount sold per portion (KSh)<input autoFocus aria-label="Viazi Karai selling price" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 30, 40 or 70" className="block w-full mt-2 bg-zinc-800 border border-zinc-600 rounded-xl p-3 text-lg" /></label>}
      {pricing === 'fixed' && <div className="grid grid-cols-2 gap-3">{variants.map(v => <button key={v.id} onClick={() => setVariantId(v.id)} aria-pressed={variantId === v.id} className={`rounded-xl p-3 border ${variantId === v.id ? 'bg-brand-500 border-brand-400' : 'bg-zinc-800 border-zinc-600'}`}>{v.name}<br />{formatKES(v.price)}</button>)}</div>}
      {pricing !== 'soda' && <><div className="flex items-center justify-between"><span>Quantity</span><div className="flex items-center gap-4"><button aria-label="Decrease quantity" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus /></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(q => Math.min(10000, q + 1))}><Plus /></button></div></div>
      <label className="block text-sm">Kitchen note (optional)<input value={note} onChange={e => setNote(e.target.value)} className="block w-full mt-2 bg-zinc-800 border border-zinc-600 rounded-xl p-3" placeholder="e.g. no pili pili, pack separately" /></label>
      <div className="flex flex-wrap gap-2">{['No Pili Pili / Chili', 'Extra Kachumbari', 'Extra Gravy / Soup', 'Pack for Takeaway', 'Crispy / Well Done', 'Separate Plate'].map(value => <button key={value} onClick={() => setNote(previous => previous ? `${previous}, ${value}` : value)} className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1">+ {value}</button>)}</div></>}
      <div className="flex items-center justify-between gap-3"><span className="font-bold">{validPrice ? formatKES(unitPrice * quantity) : 'Enter or choose a price'}</span><button disabled={!valid} onClick={() => { onAddToCart(item, variant, pricing === 'soda' ? 1 : quantity, pricing === 'soda' ? '' : note, pricing === 'fixed' ? undefined : unitPrice); onClose(); }} className="bg-brand-500 rounded-xl p-3 font-bold disabled:opacity-40">Add to Order</button></div>
    </div>
  </div>;
};
