import React, { useState } from 'react';
import {
  LayoutGrid,
  Boxes,
  Utensils,
  WalletCards,
  TrendingDown,
  BarChart3,
  Users,
  Building2,
  Menu as MenuIcon,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import naniLogo from '../../assets/logo.jpg';

export type NavTab = 'pos' | 'inventory' | 'menu' | 'shifts' | 'expenses' | 'analytics' | 'staff';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const navItems = [
  {
    id: 'pos' as NavTab,
    label: 'Touch POS',
    shortLabel: 'POS',
    icon: LayoutGrid,
    desc: 'Cashier Checkout',
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
  },
  {
    id: 'shifts' as NavTab,
    label: 'Shift & Cash',
    shortLabel: 'Shift',
    icon: WalletCards,
    desc: 'Float & Z-Reports',
    roles: ['OWNER', 'MANAGER', 'CASHIER'],
  },
  {
    id: 'inventory' as NavTab,
    label: 'Stock & Inventory',
    shortLabel: 'Stock',
    icon: Boxes,
    desc: 'Raw Goods & Units',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'menu' as NavTab,
    label: 'Menu & Recipes',
    shortLabel: 'Menu',
    icon: Utensils,
    desc: 'BOM & Dishes',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'expenses' as NavTab,
    label: 'Daily Expenses',
    shortLabel: 'Expenses',
    icon: TrendingDown,
    desc: 'Gas, Veggies & Wages',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'analytics' as NavTab,
    label: 'Sales Analytics',
    shortLabel: 'Analytics',
    icon: BarChart3,
    desc: 'Net Profit & Rollups',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'staff' as NavTab,
    label: 'Staff & Branches',
    shortLabel: 'Staff',
    icon: Users,
    desc: 'Roles, PINs & Till #',
    roles: ['OWNER', 'MANAGER'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const { user } = useAuth();

  const userNavItems = navItems.filter(item =>
    item.roles.includes(user?.role || 'CASHIER')
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar (Hidden on mobile phones < md) */}
      <aside className="hidden md:flex md:w-56 lg:w-60 bg-zinc-900 border-r border-zinc-800 flex-col justify-between shrink-0 select-none py-3">
        <nav className="space-y-1 px-2.5">
          {userNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all font-medium text-left ${
                  isActive
                    ? 'bg-brand-500 text-white font-bold shadow-lg shadow-brand-500/25'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <div className="truncate">
                  <div className="text-xs leading-tight">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-orange-100' : 'text-zinc-500'
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom info banner */}
        <div className="px-3.5 py-3 mx-2.5 bg-zinc-800/60 rounded-xl border border-zinc-800/80 flex items-center space-x-2.5">
          <img
            src={naniLogo}
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 bg-black shrink-0"
          />
          <div className="truncate">
            <div className="font-extrabold text-xs text-zinc-100 truncate">NANI'S FRY NATION</div>
            <div className="text-[10px] text-zinc-400 font-medium truncate">Crispy • Golden</div>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer for All Tabs */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs bg-zinc-900 h-full border-r border-zinc-800 p-4 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-zinc-800">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={naniLogo}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 bg-black shrink-0"
                  />
                  <div>
                    <h3 className="font-black text-sm text-zinc-100">NANI'S FRY NATION</h3>
                    <p className="text-[10px] text-zinc-400">Crispy • Golden • Irresistible</p>
                  </div>
                </div>
                <button
                  onClick={onCloseMobileDrawer}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {userNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobileDrawer) onCloseMobileDrawer();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition text-left ${
                        isActive
                          ? 'bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20'
                          : 'text-zinc-300 hover:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                        <div>
                          <div className="text-xs font-bold">{item.label}</div>
                          <div className={`text-[10px] ${isActive ? 'text-orange-100' : 'text-zinc-400'}`}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3 bg-zinc-800/80 rounded-xl border border-zinc-700/60 text-xs text-zinc-400">
              <div className="font-bold text-zinc-200">Logged in as: {user?.name}</div>
              <div className="text-[10px] text-brand-400 font-semibold">{user?.role}</div>
            </div>
          </div>

          <div className="flex-1" onClick={onCloseMobileDrawer} />
        </div>
      )}
    </>
  );
};
