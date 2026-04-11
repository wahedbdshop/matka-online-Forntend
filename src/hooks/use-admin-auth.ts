"use client";

import { useAuthStore } from "@/store/auth.store";

export function useAdminAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  const isAdmin =
    user?.role === "ADMIN" || user?.role === "AGENT";

  return {
    user,
    isAdmin,
    isAuthenticated,
    isAuthReady,
    canRunAdminQuery: isAuthReady && isAuthenticated && isAdmin,
  };
}
