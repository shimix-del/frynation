import React, { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/Auth/LoginScreen';

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp').then(module => ({ default: module.AuthenticatedApp })));

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Keep the PIN screen mounted during authentication so its progress,
  // error message, and retry controls survive a slow or failed request.
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
