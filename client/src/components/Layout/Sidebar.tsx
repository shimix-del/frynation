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
  LogOut,
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
    label: 'Dishes & Menu',
    shortLabel: 'Menu',
    icon: Utensils,
    desc: 'Menu & Categories',
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
    roles: ['OWNER'],
  },
  {
    id: 'staff' as NavTab,
    label: 'Staff & Branches',
    shortLabel: 'Staff',
    icon: Users,
    desc: 'Roles, PINs & Till #',
    roles: ['OWNER'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const { user, logout } = useAuth();

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

        {/* Bottom info banner & Log Out for Privacy */}
        <div className="px-2.5 pt-2 border-t border-zinc-800/80 space-y-2">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-extrabold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 transition active:scale-95 shadow-sm"
            title="Log Out & Lock POS"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out / Lock POS</span>
          </button>

          <div className="px-3 py-2 bg-zinc-800/60 rounded-xl border border-zinc-800/80 flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="truncate text-xs">
              <span className="text-zinc-200 font-bold">{user?.name}</span>
              <span className="text-brand-400 text-[10px] block font-semibold">{user?.role}</span>
            </div>
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

            <div className="pt-3 border-t border-zinc-800 space-y-2.5">
              <div className="p-2.5 bg-zinc-800/80 rounded-xl border border-zinc-750 text-xs text-zinc-400 flex items-center justify-between">
                <div>
                  <div className="font-bold text-zinc-100">{user?.name}</div>
                  <div className="text-[10px] text-brand-400 font-semibold">{user?.role}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <button
                onClick={() => {
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                  logout();
                }}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out / Lock POS</span>
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={onCloseMobileDrawer} />
        </div>
      )}
    </>
  );
};
