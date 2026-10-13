import React from 'react';
import {
  Flame,
  Drumstick,
  Soup,
  CupSoda,
  Cookie,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { Category } from '../../types';

interface MenuCategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const MenuCategoryBar: React.FC<MenuCategoryBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const getCategoryIcon = (code?: string) => {
    switch (code) {
      case 'fast_foods':
        return Flame;
      case 'meat_chicken':
        return Drumstick;
      case 'cooked_meals':
        return Soup;
      case 'drinks_juices':
        return CupSoda;
      case 'snacks_sides':
        return Cookie;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar select-none">
      <button
        onClick={() => onSelectCategory('all')}
        className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
          selectedCategoryId === 'all'
            ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
            : 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/70 text-zinc-300'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>All Items</span>
      </button>

      {categories.map(cat => {
        const Icon = getCategoryIcon(cat.code);
        const isSelected = selectedCategoryId === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
              isSelected
                ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                : 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/70 text-zinc-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{cat.name}</span>
            {cat._count?.menuItems !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {cat._count.menuItems}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
