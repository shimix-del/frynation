import React, { useState, useEffect, useMemo } from 'react';
import { Search, Sparkles, Filter, RefreshCw, AlertCircle, ShoppingBag, ArrowRight, Smartphone, Wallet, Plus, Printer, Receipt } from 'lucide-react';
import { MenuCategoryBar } from './MenuCategoryBar';
import { MenuItemCard } from './MenuItemCard';
import { VariantModal } from './VariantModal';
import { CartSidebar } from './CartSidebar';
import { PaymentModal } from './PaymentModal';
import { HeldOrdersModal } from './HeldOrdersModal';
import { PastOrdersModal } from './PastOrdersModal';
import { ThermalReceipt } from './ThermalReceipt';
import { OfflineBanner } from './OfflineBanner';
import { OpenShiftModal } from '../Shifts/OpenShiftModal';
import { usePosCart } from '../../context/PosCartContext';
import { useBranch } from '../../context/BranchContext';
import { api } from '../../services/api';
import { Category, MenuItem, MenuItemVariant, Order } from '../../types';
import { formatKES } from '../../utils/currency';

export const PosTerminal: React.FC = () => {
  const { currentBranchId } = useBranch();
  const { addToCart, cartItems, totalAmount } = usePosCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);

  // Modals state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<MenuItem | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState<boolean>(false);
  const [isPastOrdersModalOpen, setIsPastOrdersModalOpen] = useState<boolean>(false);

  // Completed order receipt state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const fetchShiftStatus = async () => {
    try {
      const shiftRes = await api.getCurrentShift({ branchId: currentBranchId || undefined });
      setActiveShift(shiftRes?.activeShift || null);
    } catch {
      setActiveShift(null);
    }
  };

  const fetchMenuData = async () => {
    setIsLoading(true);
    try {
      const [catsData, menuData, shiftRes] = await Promise.all([
        api.getCategories(),
        api.getMenu(),
        api.getCurrentShift({ branchId: currentBranchId || undefined }).catch(() => ({ activeShift: null })),
      ]);
      setCategories(catsData);
      setMenuItems(menuData);
      setActiveShift(shiftRes?.activeShift || null);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();

    // Periodically sync shift status so changes made on phone/laptop reflect instantly
    const interval = setInterval(() => {
      fetchShiftStatus();
    }, 15000);

    const onFocus = () => {
      fetchShiftStatus();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentBranchId]);

  const handleOpenPayment = () => {
    if (!activeShift) {
      setIsOpenShiftModalOpen(true);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleCardClick = (item: MenuItem) => {
    if (item.hasVariants && item.variants && item.variants.length > 0) {
      setSelectedItemForVariant(item);
      setIsVariantModalOpen(true);
    } else {
      addToCart(item, null, 1, '');
    }
  };

  const handleToggleStock = async (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.toggleStock(item.id);
      setMenuItems(prev => prev.map(m => (m.id === item.id ? { ...m, isAvailable: updated.isAvailable } : m)));
    } catch (err) {
      console.error('Failed to toggle stock status:', err);
    }
  };

  const handleVariantAddToCart = (
    item: MenuItem,
    variant: MenuItemVariant | null,
    qty: number,
    lineNote: string
  ) => {
    addToCart(item, variant, qty, lineNote);
  };

  const handleOrderCompleted = (order: Order, warnings: string[]) => {
    setCompletedOrder(order);
    setStockWarnings(warnings);
    setIsReceiptOpen(true);
    setIsMobileCartOpen(false);
    fetchMenuData(); // Refresh stock/availability
    window.dispatchEvent(new CustomEvent('nanifrys_transaction_completed'));
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory =
        selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const totalCartItemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-52px)] sm:h-[calc(100vh-57px)] overflow-hidden bg-zinc-950 relative">
      {/* Offline Status Warning Banner */}
      <OfflineBanner />

      {/* Main Split Layout: Left = Menu Grid, Right = Cart Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* Left Side: Category bar, Search, and Food Tiles (Hidden on mobile when cart drawer is active) */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 ${
            isMobileCartOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Active Shift Warning Banner if not started */}
          {!activeShift && !isLoading && (
            <div className="bg-amber-500/15 border border-amber-500/40 text-amber-200 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-xs sm:text-sm">No Shift Currently Open</div>
                  <div className="text-[11px] text-amber-300/80">Cashier must start shift to record drawer float &amp; process orders.</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-emerald-950/40 flex items-center justify-center space-x-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Start Shift (Float: KES 0)</span>
              </button>
            </div>
          )}

          {/* Top Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5">
            {/* Category Selector Bar */}
            <div className="flex-1 overflow-hidden">
              <MenuCategoryBar
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />
            </div>

            {/* Quick Search Input & Reprint Button */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="relative w-full sm:w-56 md:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 sm:top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search chips, kuku, pilau..."
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl py-1.5 sm:py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPastOrdersModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl border border-zinc-700/80 text-xs font-bold transition shadow-sm shrink-0 active:scale-95"
                title="View past orders & reprint receipt"
              >
                <Printer className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Reprint</span>
              </button>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1 pb-20 lg:pb-6">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-400 space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin text-brand-500" />
                <span className="text-xs font-semibold">Loading dishes...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-2 text-center p-6">
                <div className="text-3xl">🍲</div>
                <div className="text-sm font-bold text-zinc-400">No menu items found</div>
                <p className="text-xs text-zinc-500">
                  Try clearing search filters or add items under Menu & Recipes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {filteredItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onClick={handleCardClick}
                    onToggleStock={handleToggleStock}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active POS Cart Sidebar */}
        <div
          className={`lg:block h-full shrink-0 ${
            isMobileCartOpen ? 'block w-full fixed inset-0 z-40 bg-zinc-900' : 'hidden lg:flex'
          }`}
        >
          <CartSidebar
            onOpenPaymentModal={handleOpenPayment}
            onOpenHeldOrders={() => setIsHeldOrdersModalOpen(true)}
            onOpenPastOrders={() => setIsPastOrdersModalOpen(true)}
            onClose={() => setIsMobileCartOpen(false)}
          />
        </div>
      </div>

      {/* Mobile Floating Bottom Bar with Direct Pay on Phone Option */}
      {!isMobileCartOpen && cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 p-2.5 z-30 pointer-events-none">
          <div className="pointer-events-auto w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-750 p-2 rounded-2xl shadow-2xl flex items-center justify-between space-x-2">
            {/* View / Edit Cart items */}
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold rounded-xl text-xs flex items-center space-x-2 transition border border-zinc-700"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                {totalCartItemCount}
              </div>
              <div className="text-left truncate">
                <div className="text-[10px] text-zinc-400">View Items</div>
                <div className="text-xs font-black text-white">{formatKES(totalAmount)}</div>
              </div>
            </button>

            {/* Direct Pay on Phone */}
            <button
              onClick={handleOpenPayment}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-safari-mpesa hover:from-emerald-500 hover:to-safari-mpesaDark active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition border border-emerald-400/30"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Pay Now ({formatKES(totalAmount)})</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <VariantModal
        item={selectedItemForVariant}
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setSelectedItemForVariant(null);
        }}
        onAddToCart={handleVariantAddToCart}
      />

      <PaymentModal
        shiftId={activeShift?.id || ''}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onOrderCompleted={handleOrderCompleted}
      />

      <HeldOrdersModal
        isOpen={isHeldOrdersModalOpen}
        onClose={() => setIsHeldOrdersModalOpen(false)}
      />

      <PastOrdersModal
        isOpen={isPastOrdersModalOpen}
        onClose={() => setIsPastOrdersModalOpen(false)}
        onSelectOrderForReprint={(orderToReprint) => {
          setCompletedOrder(orderToReprint);
          setStockWarnings([]);
          setIsReceiptOpen(true);
          setIsPastOrdersModalOpen(false);
        }}
      />

      <ThermalReceipt
        order={completedOrder}
        warnings={stockWarnings}
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setCompletedOrder(null);
        }}
      />

      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onShiftOpened={async () => {
          await fetchShiftStatus();
          setIsPaymentModalOpen(true);
        }}
      />
    </div>
  );
};
