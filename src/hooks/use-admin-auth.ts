"use client";

import { useAuthStore } from "@/store/auth.store";

export function useAdminAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  const roleUpper = user?.role?.toUpperCase();
  const isAdmin = roleUpper === "ADMIN" || roleUpper === "AGENT";
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
