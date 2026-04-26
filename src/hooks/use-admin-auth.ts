"use client";

import { useAuthStore } from "@/store/auth.store";
import { isBackofficeRole } from "@/lib/auth-role";

export function useAdminAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  const isAdmin = isBackofficeRole(user?.role);
  const hasSessionToken = Boolean(token);

  return {
    user,
    token,
    isAdmin,
    isAuthenticated,
    isAuthReady,
    canRunAdminQuery:
      isAuthReady && (isAdmin || (isAuthenticated && hasSessionToken)),
  };
}
