import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ADMIN_SESSION_EXPIRED_EVENT,
  adminApiFetch,
  clearAdminSessionToken,
  setAdminSessionToken,
} from './adminApi';

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  roleTitle: string;
  roleCode: 'SUPER_ADMIN' | 'ADMIN';
}

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  sessionExpired: boolean;
  clearSessionExpiredNotice: () => void;
  refreshAdmin: () => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<AdminUser>;
  logoutAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refreshAdmin = useCallback(async () => {
    try {
      const res = await adminApiFetch<{ admin: AdminUser }>(
        '/api/admin/auth/me',
        {},
        { suppressExpiredRedirect: true }
      );
      setAdmin(res.admin);
      setSessionExpired(false);
    } catch {
      clearAdminSessionToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  useEffect(() => {
    const onExpired = () => {
      setAdmin(null);
      setSessionExpired(true);
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const loginAdmin = async (email: string, password: string): Promise<AdminUser> => {
    const res = await adminApiFetch<{
      token?: string;
      admin: AdminUser;
    }>(
      '/api/admin/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      { suppressExpiredRedirect: true }
    );
    if (res.token) {
      setAdminSessionToken(res.token);
    }
    setAdmin(res.admin);
    setSessionExpired(false);
    return res.admin;
  };

  const logoutAdmin = async () => {
    try {
      await adminApiFetch(
        '/api/admin/auth/logout',
        { method: 'POST' },
        { suppressExpiredRedirect: true }
      );
    } catch {
      // ensure local token is cleared regardless of network state
    } finally {
      clearAdminSessionToken();
      setAdmin(null);
      setSessionExpired(false);
    }
  };

  const clearSessionExpiredNotice = useCallback(() => {
    setSessionExpired(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        sessionExpired,
        clearSessionExpiredNotice,
        refreshAdmin,
        loginAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
