import { createContext, useContext } from 'react';
import type { AuthResponse, User } from './types';

/**
 * "Context" lets any component read the signed-in user without passing it
 * down through every level. AuthProvider (AuthProvider.tsx) fills it in.
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phoneNumber: string, password: string) => Promise<void>;
  logout: () => void;
  /** Super admin: switch to the "view as" session the server returned. */
  startViewAs: (session: AuthResponse) => void;
  /** Leave "view as" and become the super admin again. */
  stopViewAs: () => Promise<void>;
}

/** Super admins also have the Admin role, so they can use every Admin page. */
export const isAdmin = (user: User | null) => user?.role === 'Admin' || user?.role === 'SuperAdmin';

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
