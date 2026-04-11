"use client";

import { useEffect } from "react";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { refreshServerSession } from "@/lib/auth-session";

export function AuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);
  const hasAuthCookie =
    typeof document !== "undefined" && hasClientAuthCookie();

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

      try {
        await refreshServerSession();
      } catch {
        // If refresh fails, the axios client will handle redirect on the next protected request.
      }

      try {
        const profile = await UserService.getProfile({ silent: true });

        if (!cancelled && profile.data) {
          hydrateUser(profile.data);
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
  }, [hasAuthCookie, hydrateUser, isAuthReady, setAuthReady, user]);

  return null;
}
