import React from 'react';
import { Plus, Layers, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatKES } from '../../utils/currency';

interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
  onToggleStock?: (item: MenuItem, e: React.MouseEvent) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onClick, onToggleStock }) => {
  const isAvailable = item.isAvailable;

  return (
    <div
      onClick={() => isAvailable && onClick(item)}
      className={`group relative bg-zinc-900 border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between select-none ${
        isAvailable
          ? 'border-zinc-800 hover:border-brand-500/60 hover:shadow-xl hover:shadow-brand-500/10 cursor-pointer active:scale-[0.98]'
          : 'border-zinc-800/50 opacity-60 cursor-not-allowed bg-zinc-950/60'
      }`}
    >
      {/* Food Image / Header Banner */}
      <div className="relative h-24 sm:h-32 w-full bg-zinc-800 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-3xl">
            🍲
          </div>
        )}

        {/* High-Contrast Price Badge Overlay */}
        <div className="absolute bottom-2 left-2 bg-zinc-950/90 dark:bg-black/85 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-zinc-700/70 text-white font-black text-[11px] sm:text-xs shadow-lg tracking-tight">
          {item.hasVariants ? (
            <span>From {formatKES(item.basePrice)}</span>
          ) : (
            <span>{formatKES(item.basePrice)}</span>
          )}
        </div>

        {/* Variants Badge */}
        {item.hasVariants && item.variants && item.variants.length > 0 && (
          <div className="absolute top-2 right-2 bg-brand-500/90 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 rounded-full flex items-center space-x-1 shadow-md">
            <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>{item.variants.length} Opt</span>
          </div>
        )}

        {/* Out of stock banner */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-2 text-center">
            <div className="text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center space-x-1 bg-red-950/80 px-2 py-0.5 rounded-lg border border-red-800/80">
              <AlertCircle className="w-3 h-3" />
              <span>Out of Stock</span>
            </div>
          </div>
        )}

        {/* Quick Cashier Stock Toggle button */}
        {onToggleStock && (
          <button
            type="button"
            onClick={e => onToggleStock(item, e)}
            className="absolute top-2 left-2 p-1 sm:p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white backdrop-blur-sm transition border border-white/10"
            title={isAvailable ? 'Mark Out of Stock' : 'Mark In Stock'}
          >
            {isAvailable ? <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> : <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />}
          </button>
        )}
      </div>

      {/* Item Details */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-bold text-zinc-100 text-xs sm:text-sm line-clamp-1 group-hover:text-brand-400 transition">
            {item.name}
          </h4>
          {item.description && (
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-normal hidden sm:block">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-zinc-750">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-zinc-400 truncate max-w-[85px]">
              {item.category?.name || 'Dish'}
            </span>
            <span className="text-xs font-black text-brand-500 dark:text-brand-400">
              {formatKES(item.basePrice)}
            </span>
          </div>
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition shadow-sm ${
              isAvailable
                ? 'bg-brand-500/15 group-hover:bg-brand-500 text-brand-500 dark:text-brand-400 group-hover:text-white'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
