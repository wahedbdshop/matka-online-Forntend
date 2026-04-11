"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminService } from "@/services/admin.service";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import {
  AuthSessionRequestError,
  refreshServerSession,
  resetClientSession,
} from "@/lib/auth-session";

export function AuthBootstrap() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (user) {
        setAuthReady(true);
        return;
      }

      if (!hasClientAuthCookie()) {
        setAuthReady(true);
        return;
      }

      let refreshedAccessToken: string | null = null;
      let refreshUnauthorized = false;

      try {
        const refreshed = await refreshServerSession();
        refreshedAccessToken = refreshed.data.accessToken ?? null;
      } catch (error) {
        refreshUnauthorized =
          error instanceof AuthSessionRequestError && error.status === 401;
      }

      try {
        const profile = isAdminRoute
          ? await AdminService.getAdminProfile({
              silent: true,
              accessToken: refreshedAccessToken,
            })
          : await UserService.getProfile({
              silent: true,
              accessToken: refreshedAccessToken,
            });

        if (!cancelled && profile.data) {
          setAuth(profile.data, refreshedAccessToken);
          return;
        }
      } catch (error) {
        const isProfileUnauthorized =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "status" in error.response &&
          error.response.status === 401;

        if (refreshUnauthorized && isProfileUnauthorized) {
          await resetClientSession();
        }
      }

      if (!cancelled) {
        setAuthReady(true);
      }
    }

    if (!isAuthReady) {
      void bootstrapAuth();
    }

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute, isAuthReady, pathname, setAuth, setAuthReady, user]);

  return null;
}
