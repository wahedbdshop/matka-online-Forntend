"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import {
  getClientAccessTokenCookie,
  hasClientAuthCookie,
} from "@/lib/auth-cookie";
import {
  logAuthBootstrapStart,
  requestSessionRefresh,
  resetClientSession,
} from "@/lib/auth-session";

let bootstrapPromise: Promise<void> | null = null;

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "AGENT";
}

export function AuthBootstrap() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    async function bootstrapAuth() {
      logAuthBootstrapStart({
        trigger: "AuthBootstrap",
        pathname,
        isAdminRoute,
      });

      if (user) {
        const isAdminUser = isAdminRole(user.role);
        if (isAdminRoute !== isAdminUser && typeof window !== "undefined") {
          window.location.replace(isAdminUser ? "/admin" : "/dashboard");
          return;
        }

        setAuthReady(true);
        return;
      }

      if (!hasClientAuthCookie()) {
        setAuthReady(true);
        return;
      }

      const existingAccessToken = token ?? getClientAccessTokenCookie();
      let resolvedAccessToken: string | null = existingAccessToken;
      let refreshFailedTerminal = false;

      if (existingAccessToken) {
        try {
          const profile = await UserService.getProfile({
            silent: true,
            accessToken: existingAccessToken,
          });

          if (profile.data) {
            const isAdminUser = isAdminRole(profile.data.role);
            setAuth(profile.data, existingAccessToken);

            if (isAdminRoute !== isAdminUser && typeof window !== "undefined") {
              window.location.replace(isAdminUser ? "/admin" : "/dashboard");
            }

            return;
          }
        } catch {
        }
      }

      try {
        const refreshed = await requestSessionRefresh("AuthBootstrap");
        resolvedAccessToken = refreshed.accessToken;
        refreshFailedTerminal = refreshed.blocked;
      } catch {
      }

      if (refreshFailedTerminal) {
        setAuthReady(true);
        return;
      }

      try {
        const profile = await UserService.getProfile({
          silent: true,
          accessToken: resolvedAccessToken,
        });

        if (profile.data) {
          const isAdminUser = isAdminRole(profile.data.role);
          setAuth(profile.data, resolvedAccessToken);

          if (isAdminRoute !== isAdminUser && typeof window !== "undefined") {
            window.location.replace(isAdminUser ? "/admin" : "/dashboard");
          }

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

        if (refreshFailedTerminal && isProfileUnauthorized) {
          await resetClientSession();
        }
      }

      setAuthReady(true);
    }

    if (!isAuthReady) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrapAuth().finally(() => {
          bootstrapPromise = null;
        });
      }

      void bootstrapPromise;
    }

  }, [isAdminRoute, isAuthReady, pathname, setAuth, setAuthReady, user]);

  return null;
}
