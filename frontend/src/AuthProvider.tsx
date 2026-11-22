import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';
import { AuthContext, type AuthState } from './auth';
import type { AuthResponse, User } from './types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" when there's a saved token to check.
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  // On page load, swap the saved token for a fresh one. This checks it's still valid AND
  // picks up new roles (e.g. an admin just approved this user as an Owner or Driver).
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.post<AuthResponse>('/auth/refresh')
      .then((res) => { tokenStore.set(res.token); setUser(res.user); })
      .catch(() => tokenStore.clear()) // expired or invalid: forget it
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    login: async (email, password) => signIn(await api.post<AuthResponse>('/auth/login', { email, password })),
    register: async (fullName, email, phoneNumber, password) =>
      signIn(await api.post<AuthResponse>('/auth/register', {
        fullName, email, phoneNumber: phoneNumber || null, password,
      })),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
    startViewAs: (session) => {
      const own = tokenStore.get();
      if (own && !tokenStore.getSuper()) tokenStore.setSuper(own); // keep the super admin's own login aside
      signIn(session);
    },
    stopViewAs: async () => {
      const own = tokenStore.getSuper();
      tokenStore.clearSuper();
      if (!own) { tokenStore.clear(); setUser(null); return; }
      tokenStore.set(own);
      try {
        signIn(await api.post<AuthResponse>('/auth/refresh'));
      } catch {
        tokenStore.clear(); // the super admin's own session expired: log in again
        setUser(null);
      }
    },
  }), [user, loading, signIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
