import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  balance: number;
  bonusBalance: number;
  currency: string;
  referralCode: string;
  emailVerified: boolean;
  image?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  setAuth: (user: User, token?: string | null) => void;
  setToken: (token?: string | null) => void;
  setAuthReady: (value: boolean) => void;
  hydrateUser: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isAuthReady: false,

  setAuth: (user, token = null) => {
    set({ user, token, isAuthenticated: true, isAuthReady: true });
  },

  setToken: (token = null) => {
    set((state) => ({
      user: state.user,
      token,
      isAuthenticated: Boolean(state.user || token),
      isAuthReady: state.isAuthReady,
    }));
  },

  setAuthReady: (value) => {
    set({ isAuthReady: value });
  },

  hydrateUser: (user) => {
    set((state) => ({
      user,
      token: state.token,
      isAuthenticated: true,
      isAuthReady: true,
    }));
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  clearAuth: () => {
    set({ user: null, token: null, isAuthenticated: false, isAuthReady: true });
  },
}));
