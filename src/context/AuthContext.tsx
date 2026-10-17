import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, UserRole } from '../types/index.ts';
import { api, setAuthToken, ApiError } from '../lib/api.ts';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isClerkConfigured: boolean;
  clerkPublishableKey: string | null;
  loginWithToken: (token: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  devSwitchRole: (targetRole: UserRole) => Promise<void>;
  devSimulateLogin: (role?: UserRole, customName?: string, customEmail?: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY ||
      import.meta.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) ||
  '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ridenova_session_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isClerkConfigured = Boolean(
    CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith('pk_')
  );

  const fetchCurrentUser = useCallback(async (authToken: string): Promise<AuthUser | null> => {
    setAuthToken(authToken);
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        return res.data;
      }
      return null;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        // Token expired or invalid
        setAuthToken(null);
        setToken(null);
        setUser(null);
        localStorage.removeItem('ridenova_session_token');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      if (token) {
        await fetchCurrentUser(token);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [token, fetchCurrentUser]);

  const loginWithToken = async (newToken: string): Promise<AuthUser> => {
    setIsLoading(true);
    setToken(newToken);
    localStorage.setItem('ridenova_session_token', newToken);
    setAuthToken(newToken);

    try {
      const res = await api.getMe();
      setUser(res.data);
      return res.data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('ridenova_session_token');
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    const res = await api.updateProfile(data);
    if (res.success && res.data) {
      setUser(res.data);
    }
  };

  const devSwitchRole = async (targetRole: UserRole) => {
    if (!user) return;
    try {
      const res = await api.devPromote(targetRole);
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.error('Failed to update role in dev mode:', err);
    }
  };

  const devSimulateLogin = async (
    role?: UserRole,
    customName?: string,
    customEmail?: string
  ): Promise<AuthUser> => {
    const email = customEmail || 'rider@example.ridenova.com';
    const normalizedEmail = email.toLowerCase().trim();
    const clerkId = `user_email_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const isDreambattle =
      normalizedEmail === 'projectwork3155@gmail.com' ||
      normalizedEmail === 'dreambattle@3155' ||
      normalizedEmail.includes('dreambattle');

    const name =
      customName ||
      (isDreambattle ? 'Dreambattle' : email.split('@')[0]);

    const assignedRole: UserRole =
      isDreambattle || normalizedEmail.includes('admin')
        ? 'admin'
        : normalizedEmail === 'dr.gaming342@gmail.com' || role === 'driver'
        ? 'driver'
        : role || 'rider';

    // Create deterministic dev token accepted by requireAuth
    const devToken = `dev_test_token_${clerkId}:${assignedRole}:${encodeURIComponent(email)}:${encodeURIComponent(name)}`;
    const loggedInUser = await loginWithToken(devToken);
    return loggedInUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        isClerkConfigured,
        clerkPublishableKey: CLERK_PUBLISHABLE_KEY || null,
        loginWithToken,
        logout,
        refreshUser,
        updateProfile,
        devSwitchRole,
        devSimulateLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthSession(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthSession must be used within an AuthProvider');
  }
  return context;
}
