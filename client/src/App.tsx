import React, { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/Auth/LoginScreen';
import naniLogo from './assets/logo.jpg';

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp').then(module => ({ default: module.AuthenticatedApp })));

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
    <Suspense fallback={<div role="status" className="min-h-screen bg-zinc-950 p-6 text-zinc-400">Opening your workspace...</div>}>
      <AuthenticatedApp />
    </Suspense>
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
