import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { PosCartProvider } from './context/PosCartContext';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { MobileBottomNav } from './components/Layout/MobileBottomNav';
import { LoginScreen } from './components/Auth/LoginScreen';
import { PosTerminal } from './components/Pos/PosTerminal';
import { InventoryManager } from './components/Inventory/InventoryManager';
import { MenuManager } from './components/MenuAdmin/MenuManager';
import { ShiftManager } from './components/Shifts/ShiftManager';
import { OpenShiftModal } from './components/Shifts/OpenShiftModal';
import { ExpenseTracker } from './components/Expenses/ExpenseTracker';
import { AnalyticsDashboard } from './components/Dashboard/AnalyticsDashboard';
import { StaffManager } from './components/Staff/StaffManager';
import naniLogo from './assets/logo.jpg';
import { ActivityLog } from './components/Activity/ActivityLog';

const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Strict role guard: Cashiers only have access to POS & Shifts. Only OWNER has access to Analytics & Staff.
  React.useEffect(() => {
    if (user?.role === 'CASHIER' && activeTab !== 'pos' && activeTab !== 'shifts') {
      setActiveTab('pos');
    } else if (user?.role === 'MANAGER' && (activeTab === 'analytics' || activeTab === 'staff' || activeTab === 'activity')) {
      setActiveTab('pos');
    }
  }, [activeTab, user?.role]);

  return (
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
          {activeTab === 'pos' && <PosTerminal />}
          {activeTab === 'shifts' && <ShiftManager />}
          {activeTab === 'inventory' && user?.role !== 'CASHIER' && <InventoryManager />}
          {activeTab === 'menu' && user?.role !== 'CASHIER' && <MenuManager />}
          {activeTab === 'expenses' && user?.role !== 'CASHIER' && <ExpenseTracker />}
          {activeTab === 'analytics' && user?.role === 'OWNER' && <AnalyticsDashboard />}
          {activeTab === 'staff' && user?.role === 'OWNER' && <StaffManager />}
          {activeTab === 'activity' && user?.role === 'OWNER' && <ActivityLog />}
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
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 space-y-4">
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-400 blur-lg opacity-85 animate-pulse"></div>
          <img
            src={naniLogo}
            alt="Nani's Fry Nation"
            className="relative w-32 h-32 rounded-full object-cover border-4 border-amber-400 bg-black shadow-2xl block mx-auto"
          />
        </div>
        <div className="text-base font-black text-zinc-100 tracking-wider uppercase">Loading Nani's Fry Nation POS...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <BranchProvider>
      <PosCartProvider>
        <AuthenticatedApp />
      </PosCartProvider>
    </BranchProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
