import { create } from "zustand";

interface User {
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
  setAuth: (user: User, token?: string | null) => void;
  hydrateUser: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token = null) => {
    set({ user, token, isAuthenticated: true });
  },

  hydrateUser: (user) => {
    set((state) => ({
      user,
      token: state.token,
      isAuthenticated: true,
    }));
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  clearAuth: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
