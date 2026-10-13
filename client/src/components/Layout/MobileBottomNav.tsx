import React from 'react';
import {
  LayoutGrid,
  WalletCards,
  Utensils,
  BarChart3,
  Menu,
  LogOut,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMore,
}) => {
  const { user, logout } = useAuth();
  const isOwnerOrManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <div className="md:hidden bg-zinc-900 border-t border-zinc-800 fixed bottom-0 left-0 right-0 z-40 px-2 py-1 flex items-center justify-around select-none shadow-2xl safe-area-inset-bottom">
      {/* 1. Touch POS */}
      <button
        onClick={() => onSelectTab('pos')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
          activeTab === 'pos'
            ? 'text-brand-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <LayoutGrid className={`w-5 h-5 ${activeTab === 'pos' ? 'text-brand-500 scale-110' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">POS</span>
      </button>

      {/* 2. Shift & Cash */}
      <button
        onClick={() => onSelectTab('shifts')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
          activeTab === 'shifts'
            ? 'text-brand-400 font-bold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <WalletCards className={`w-5 h-5 ${activeTab === 'shifts' ? 'text-brand-500 scale-110' : ''}`} />
        <span className="text-[10px] mt-0.5 font-medium">Shift</span>
      </button>

      {/* 3. Menu & Stock */}
      {isOwnerOrManager && (
        <button
          onClick={() => onSelectTab('menu')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'menu' || activeTab === 'inventory'
              ? 'text-brand-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Utensils className={`w-5 h-5 ${activeTab === 'menu' || activeTab === 'inventory' ? 'text-brand-500 scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 font-medium">Menu</span>
        </button>
      )}

      {/* 4. Sales Analytics */}
      {isOwnerOrManager && (
        <button
          onClick={() => onSelectTab('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            activeTab === 'analytics'
              ? 'text-brand-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-brand-500 scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 font-medium">Analytics</span>
        </button>
      )}

      {/* 5. More Menu Drawer */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 transition"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">More</span>
      </button>

      {/* 6. Privacy Lock / Logout */}
      <button
        onClick={logout}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-red-400 hover:text-red-300 active:scale-95 transition"
        title="Log Out & Lock POS"
      >
        <LogOut className="w-4 h-4 text-red-400" />
        <span className="text-[10px] mt-0.5 font-bold">Lock</span>
      </button>
    </div>
  );
};
