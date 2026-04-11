"use client";

import { useLayoutEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import type { InitialSession } from "@/lib/server-session";

export function AuthHydrator({
  initialSession,
}: {
  initialSession: InitialSession;
}) {
  const setAuth = useAuthStore((state) => state.setAuth);

  useLayoutEffect(() => {
    if (!initialSession.user) return;

    setAuth(initialSession.user, initialSession.accessToken);
  }, [initialSession.accessToken, initialSession.user, setAuth]);

  return null;
}
