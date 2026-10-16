import React, { useState, useEffect } from 'react';
import {
  Store,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Menu as MenuIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../services/api';
import { offlineSync, OfflineOrder } from '../../services/offlineSync';
import { Shift } from '../../types';
import naniLogo from '../../assets/logo.jpg';

interface NavbarProps {
  onOpenShiftModal: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenShiftModal,
  onOpenMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const { branches, currentBranchId, currentBranch, setCurrentBranchId } = useBranch();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('nanifrys_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark', 'theme-dark');
    } else {
      document.documentElement.classList.remove('dark', 'theme-dark');
    }
    localStorage.setItem('nanifrys_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const fetchShiftStatus = async () => {
    try {
      const data = await api.getCurrentShift({ branchId: currentBranchId || undefined });
      setActiveShift(data.activeShift);
    } catch {
      setActiveShift(null);
    }
  };

  const updateOfflineStatus = () => {
    setIsOnline(navigator.onLine);
    setOfflineQueue(offlineSync.getQueue());
  };

  useEffect(() => {
    fetchShiftStatus();
    updateOfflineStatus();

    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    window.addEventListener('nanifrys_offline_queue_updated', updateOfflineStatus);

    const interval = setInterval(fetchShiftStatus, 15000);

    return () => {
      window.removeEventListener('online', updateOfflineStatus);
      window.removeEventListener('offline', updateOfflineStatus);
      window.removeEventListener('nanifrys_offline_queue_updated', updateOfflineStatus);
      clearInterval(interval);
    };
  }, [currentBranchId]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await offlineSync.syncPendingOrders();
      if (res.synced > 0) {
        alert(`Successfully synced ${res.synced} offline orders!`);
      }
      updateOfflineStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 text-zinc-100 px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Brand & Logo + Mobile Menu Button */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 rounded-xl active:scale-95 transition"
            title="Open Menu"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
        )}

        <img
          src={naniLogo}
          alt="Nani's Fry Nation"
          className="w-8 h-8 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-amber-400 shadow-md bg-black shrink-0"
        />
        <div className="shrink-0">
          <div className="flex items-center space-x-1">
            <span className="text-xs sm:text-base font-black tracking-tight text-zinc-100 hidden min-[360px]:inline">
              NANI'S <span className="text-brand-500">FRY</span>
            </span>
            <span className="text-xs sm:text-base font-black tracking-tight text-zinc-100 hidden sm:inline">
              NATION
            </span>
            <span className="text-[9px] sm:text-xs font-bold px-1 py-0.2 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              POS
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-zinc-300">
            <span className="text-amber-400 font-bold">📞 Order: <span className="font-mono text-white font-extrabold">0143285625</span></span>
            <span className="hidden xl:inline text-zinc-500">•</span>
            <span className="hidden xl:inline text-safari-mpesa font-semibold">Pochi: <span className="font-mono text-white font-extrabold">0143285625</span></span>
          </div>
        </div>
      </div>

      {/* Center Controls: Branch Selector & Active Shift */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Multi-Branch Selector */}
        <div className="relative flex items-center bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-1.5 sm:px-2.5 py-1">
          <Store className="w-3.5 h-3.5 text-brand-400 mr-1 shrink-0" />
          <select
            aria-label="Select Restaurant Branch"
            value={currentBranchId || 'all'}
            onChange={e => setCurrentBranchId(e.target.value === 'all' ? null : e.target.value)}
            disabled={user?.role === 'CASHIER'}
            className="bg-transparent text-[11px] sm:text-xs font-semibold text-zinc-200 outline-none cursor-pointer pr-1 max-w-[65px] min-[400px]:max-w-[100px] sm:max-w-[160px] md:max-w-[200px] truncate"
          >
            {branches.length > 1 && user?.role === 'OWNER' && (
              <option value="all" className="bg-zinc-900 text-zinc-100">All Branches</option>
            )}
            {branches.map(b => (
              <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Shift Status Button */}
        <button
          onClick={onOpenShiftModal}
          className={`flex items-center space-x-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition border shrink-0 ${
            activeShift
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }`}
          title={activeShift ? `Shift Open (${activeShift.cashier?.name})` : 'No Open Shift'}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">
            {activeShift ? `Shift Open (${activeShift.cashier?.name.split(' ')[0]})` : 'No Shift'}
          </span>
          <span className="md:hidden text-[10px] hidden min-[380px]:inline">
            {activeShift ? 'Open' : 'Shift'}
          </span>
        </button>

        {/* Offline Indicator & Sync */}
        {!isOnline || offlineQueue.length > 0 ? (
          <div className="flex items-center space-x-1 px-1.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
            <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400 shrink-0" />
            <span className="hidden sm:inline">{offlineQueue.length}</span>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !isOnline}
              className="p-0.5 hover:bg-amber-500/30 rounded transition"
              title="Sync offline orders now"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ) : (
          <div className="hidden 2xl:flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-medium text-emerald-400 bg-emerald-500/10">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>Online</span>
          </div>
        )}
      </div>

      {/* Right Controls: Theme Toggle, Quick PIN Switch, User Info & Logout */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Theme Toggle (White / Dark) */}
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition active:scale-95 shadow-sm"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to White Mode'}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden lg:inline">White</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">Dark</span>
            </>
          )}
        </button>



        {/* User Role Tag */}
        <div className="hidden xl:flex items-center space-x-2 pl-2 border-l border-zinc-800">
          <div className="text-right">
            <div className="text-xs font-bold text-zinc-200 leading-tight">{user?.name}</div>
            <div className="text-[10px] font-semibold text-brand-400 flex items-center justify-end space-x-0.5">
              <ShieldCheck className="w-3 h-3 inline" />
              <span>{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Privacy Logout Button */}
        <button
          onClick={logout}
          className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 transition active:scale-95 shadow-sm"
          title="Sign Out & Lock POS (Privacy)"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:text-white shrink-0" />
          <span className="hidden min-[480px]:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
