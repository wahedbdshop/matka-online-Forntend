"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminService } from "@/services/admin.service";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { refreshServerSession } from "@/lib/auth-session";

export function AuthBootstrap() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const hasAuthCookie =
    typeof document !== "undefined" && hasClientAuthCookie();
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      if (user) {
        setAuthReady(true);
        return;
      }

      if (!hasAuthCookie) {
        setAuthReady(true);
        return;
      }

      let refreshedAccessToken: string | null = null;

      try {
        const refreshed = await refreshServerSession();
        refreshedAccessToken = refreshed.data.accessToken ?? null;
      } catch {
        // If refresh fails, the axios client will handle redirect on the next protected request.
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
      } catch {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
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
  }, [hasAuthCookie, isAdminRoute, isAuthReady, pathname, setAuth, setAuthReady, user]);

  return null;
}
