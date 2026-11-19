import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, clearSessionToken, setSessionToken } from '../lib/api';

export interface PortalUser {
  id: number;
  uid: string | null;
  email: string;
  fullName: string;
  role: 'admin' | 'staff' | 'student';
}

interface AuthContextValue {
  user: PortalUser | null;
  loading: boolean;
  siteSettings: Record<string, string>;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  signInWithCredentials: (email: string, password: string) => Promise<PortalUser>;
  registerStudent: (fullName: string, email: string, password: string) => Promise<PortalUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  const refreshSettings = useCallback(async () => {
    try {
      const data = await apiFetch<{ settings: Record<string, string> }>('/api/site-settings');
      setSiteSettings(data.settings || {});
    } catch {
      // keep default copy if offline
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: PortalUser | null }>('/api/auth/me');
      if (!data.user) {
        clearSessionToken();
      }
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshUser();
  }, [refreshUser, refreshSettings]);

  const signInWithCredentials = async (email: string, password: string): Promise<PortalUser> => {
    const data = await apiFetch<{ user: PortalUser; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setSessionToken(data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const registerStudent = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<PortalUser> => {
    const data = await apiFetch<{ user: PortalUser; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    });
    if (data.token) {
      setSessionToken(data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    clearSessionToken();
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        siteSettings,
        refreshUser,
        refreshSettings,
        signInWithCredentials,
        registerStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
