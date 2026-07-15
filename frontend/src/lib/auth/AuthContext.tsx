'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { attemptSilentRefresh } from '../api/client';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import { setAccessToken, subscribeAccessToken } from './tokenStore';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Restores a session on hard reload: the access token lives only in
    // memory, but the httpOnly refresh cookie (7d default validity) survives
    // page loads, so a silent refresh can mint a fresh access token without
    // asking the user to log in again.
    let cancelled = false;
    (async () => {
      const token = await attemptSilentRefresh();
      if (cancelled) return;
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    // If the axios interceptor ever clears the token (failed refresh on a
    // background request), reflect that immediately in the UI.
    return subscribeAccessToken((token) => {
      if (!token) setUser(null);
    });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await authApi.login(email, password);
      setAccessToken(accessToken);
      await refreshUser();
      router.push('/dashboard');
    },
    [refreshUser, router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
