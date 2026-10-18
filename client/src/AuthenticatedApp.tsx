import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { PosCartProvider } from './context/PosCartContext';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { MobileBottomNav } from './components/Layout/MobileBottomNav';
const PosTerminal = lazy(() => import('./components/Pos/PosTerminal').then(module => ({ default: module.PosTerminal })));
const InventoryManager = lazy(() => import('./components/Inventory/InventoryManager').then(module => ({ default: module.InventoryManager })));
const MenuManager = lazy(() => import('./components/MenuAdmin/MenuManager').then(module => ({ default: module.MenuManager })));
const ShiftManager = lazy(() => import('./components/Shifts/ShiftManager').then(module => ({ default: module.ShiftManager })));
import { OpenShiftModal } from './components/Shifts/OpenShiftModal';
const ExpenseTracker = lazy(() => import('./components/Expenses/ExpenseTracker').then(module => ({ default: module.ExpenseTracker })));
const AnalyticsDashboard = lazy(() => import('./components/Dashboard/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));
const StaffManager = lazy(() => import('./components/Staff/StaffManager').then(module => ({ default: module.StaffManager })));

export const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Strict role guard: Cashiers only have access to POS & Shifts. Only OWNER has access to Analytics & Staff.
  React.useEffect(() => {
    if (user?.role === 'CASHIER' && activeTab !== 'pos' && activeTab !== 'shifts') {
      setActiveTab('pos');
    } else if (user?.role === 'MANAGER' && (activeTab === 'analytics' || activeTab === 'staff')) {
      setActiveTab('pos');
    }
  }, [activeTab, user?.role]);

  return (
    <BranchProvider><PosCartProvider>
    <div className="flex flex-col h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Top Navbar */}
      <Navbar
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onOpenShiftModal={() => {
          if (activeTab !== 'shifts') {
            setActiveTab('shifts');
          } else {
            setIsOpenShiftModalOpen(true);
          }
        }}
      />

      {/* Main Body: Sidebar + Active View */}
      <div className="flex-1 flex overflow-hidden pb-12 md:pb-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <Suspense fallback={<div role="status" className="p-6 text-zinc-400">Opening screen...</div>}>
          {activeTab === 'pos' && <PosTerminal />}
          {activeTab === 'shifts' && <ShiftManager />}
          {activeTab === 'inventory' && user?.role !== 'CASHIER' && <InventoryManager />}
          {activeTab === 'menu' && user?.role !== 'CASHIER' && <MenuManager />}
          {activeTab === 'expenses' && user?.role !== 'CASHIER' && <ExpenseTracker />}
          {activeTab === 'analytics' && user?.role === 'OWNER' && <AnalyticsDashboard />}
          {activeTab === 'staff' && user?.role === 'OWNER' && <StaffManager />}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phones & Small Tablets) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMore={() => setIsMobileDrawerOpen(true)}
      />

      {/* Global Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onShiftOpened={() => {}}
      />
    </div>
    </PosCartProvider></BranchProvider>
  );
};

