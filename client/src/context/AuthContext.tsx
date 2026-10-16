import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logoutReason: string | null;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithPin: (pinCode: string, branchId?: string) => Promise<void>;
  logout: (reason?: any) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always launch system to the login PIN page - do not auto-login on startup
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activeUserRef = useRef<User | null>(null);
  activeUserRef.current = user;

  // On initial application launch: ensure clean state so user enters PIN
  useEffect(() => {
    localStorage.removeItem('nanifrys_pos_token');
    localStorage.removeItem('simba_pos_token');
  }, []);

  const logout = (reason?: any) => {
    localStorage.removeItem('nanifrys_pos_token');
    localStorage.removeItem('simba_pos_token');
    if (activeUserRef.current) {
      localStorage.removeItem(`nanifrys_active_session_${activeUserRef.current.id}`);
    }
    sessionIdRef.current = null;
    setToken(null);
    setUser(null);
    if (typeof reason === 'string') {
      setLogoutReason(reason);
    }
  };

  // 1. Single Terminal Enforcement: If user logs in on Terminal B, Terminal A logs out
  useEffect(() => {
    if (!user) return;

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('nanifrys_session_sync');
        channel.onmessage = (event) => {
          if (
            event.data?.userId === user.id &&
            event.data?.sessionId &&
            event.data?.sessionId !== sessionIdRef.current
          ) {
            logout('Logged out: Your account was logged in from another terminal.');
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // Storage event for other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `nanifrys_active_session_${user.id}`) {
        if (e.newValue && e.newValue !== sessionIdRef.current) {
          logout('Logged out: Your account was logged in from another terminal.');
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic check (every 2.5 seconds) in case of same-machine or storage changes
    const pollInterval = setInterval(() => {
      if (sessionIdRef.current && user) {
        const stored = localStorage.getItem(`nanifrys_active_session_${user.id}`);
        if (stored && stored !== sessionIdRef.current) {
          logout('Logged out: Your account was logged in from another terminal.');
        }
      }
    }, 2500);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [user]);

  // 2. Inactivity Auto-Logout Timer:
  // Cashiers & Manager: 20 seconds of inactivity
  // Owner: 2 minutes (120 seconds) of inactivity
  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    const timeoutDuration = user.role === 'OWNER' ? 120 * 1000 : 20 * 1000;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleTransactionCompleted = () => {
      // Receipt finished: reset activity timer to start active 20s countdown
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));
    window.addEventListener('nanifrys_transaction_completed', handleTransactionCompleted);

    const checkInactivity = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutDuration) {
        const roleLabel = user.role === 'OWNER' ? 'Owner (2 min)' : 'Staff (20s)';
        logout(`Auto-lock: Logged out due to ${roleLabel} inactivity for security.`);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetActivity));
      window.removeEventListener('nanifrys_transaction_completed', handleTransactionCompleted);
      clearInterval(checkInactivity);
    };
  }, [user]);

  const establishSession = (loggedInUser: User, receivedToken: string) => {
    const newSessionId = `${loggedInUser.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionIdRef.current = newSessionId;
    localStorage.setItem(`nanifrys_active_session_${loggedInUser.id}`, newSessionId);

    // Broadcast new login to terminate any previous terminal
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('nanifrys_session_sync');
        channel.postMessage({
          type: 'NEW_LOGIN',
          userId: loggedInUser.id,
          sessionId: newSessionId,
        });
        channel.close();
      }
    } catch {}

    localStorage.setItem('nanifrys_pos_token', receivedToken);
    setToken(receivedToken);
    setUser(loggedInUser);
    setLogoutReason(null);
    lastActivityRef.current = Date.now();

    if (loggedInUser.branchId) {
      localStorage.setItem('nanifrys_pos_branch_id', loggedInUser.branchId);
    }
  };

  const loginWithCredentials = async (email: string, password: string) => {
    setIsLoading(true);
    setLogoutReason(null);
    try {
      const res = await api.login({ email, password });
      establishSession(res.user, res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (pinCode: string, branchId?: string) => {
    setIsLoading(true);
    setLogoutReason(null);
    try {
      const res = await api.login({ pinCode, branchId });
      establishSession(res.user, res.token);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const data = await api.getMe();
        if (data) setUser(data);
      } catch (err) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        logoutReason,
        loginWithCredentials,
        loginWithPin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
