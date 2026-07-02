import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  householdId: string | null;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
  setAuth: (payload: { accessToken: string; userId: string; householdId: string; name: string; email: string }) => void;
  clearAuth: () => void;
  isExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userId: null,
      householdId: null,
      name: null,
      email: null,
      isAuthenticated: false,
      expiresAt: null,
      setAuth: ({ accessToken, userId, householdId, name, email }) =>
        set({ accessToken, userId, householdId, name, email, isAuthenticated: true, expiresAt: decodeJwtExp(accessToken) }),
      clearAuth: () =>
        set({ accessToken: null, userId: null, householdId: null, name: null, email: null, isAuthenticated: false, expiresAt: null }),
      isExpired: () => {
        const { accessToken, expiresAt } = get();
        if (!accessToken) return false;
        const exp = expiresAt ?? decodeJwtExp(accessToken);
        if (exp === null) return false;
        return Date.now() / 1000 > exp;
      },
    }),
    { name: 'et-auth' }
  )
);
