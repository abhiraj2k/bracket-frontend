import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  householdId: string | null;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  setAuth: (payload: { accessToken: string; userId: string; householdId: string; name: string; email: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      householdId: null,
      name: null,
      email: null,
      isAuthenticated: false,
      setAuth: ({ accessToken, userId, householdId, name, email }) =>
        set({ accessToken, userId, householdId, name, email, isAuthenticated: true }),
      clearAuth: () =>
        set({ accessToken: null, userId: null, householdId: null, name: null, email: null, isAuthenticated: false }),
    }),
    { name: 'et-auth' }
  )
);
