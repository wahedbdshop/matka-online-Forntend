"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminService } from "@/services/admin.service";
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

export function AuthBootstrap() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      logAuthBootstrapStart({
        trigger: "AuthBootstrap",
        pathname,
        isAdminRoute,
      });

      if (user) {
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
          const profile = isAdminRoute
            ? await AdminService.getAdminProfile({
                silent: true,
                accessToken: existingAccessToken,
              })
            : await UserService.getProfile({
                silent: true,
                accessToken: existingAccessToken,
              });

          if (!cancelled && profile.data) {
            console.info("[auth] bootstrap recovered session from existing token", {
              trigger: "AuthBootstrap",
              pathname,
              isAdminRoute,
            });
            setAuth(profile.data, existingAccessToken);
            return;
          }
        } catch (error) {
          console.error("[auth] bootstrap profile fetch failed before refresh", {
            trigger: "AuthBootstrap",
            error,
          });
        }
      }

      try {
        const refreshed = await requestSessionRefresh("AuthBootstrap");
        resolvedAccessToken = refreshed.accessToken;
        refreshFailedTerminal = refreshed.blocked;
      } catch (error) {
        console.error("[auth] auth bootstrap refresh failed", {
          trigger: "AuthBootstrap",
          error,
        });
      }

      if (refreshFailedTerminal) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      try {
        const profile = isAdminRoute
          ? await AdminService.getAdminProfile({
              silent: true,
              accessToken: resolvedAccessToken,
            })
          : await UserService.getProfile({
              silent: true,
              accessToken: resolvedAccessToken,
            });

        if (!cancelled && profile.data) {
          setAuth(profile.data, resolvedAccessToken);
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

      if (!cancelled) {
        setAuthReady(true);
      }
    }

    if (!isAuthReady) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrapAuth().finally(() => {
          bootstrapPromise = null;
        });
      }

      void bootstrapPromise;
    }

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute, isAuthReady, pathname, setAuth, setAuthReady, token, user]);

  return null;
}
