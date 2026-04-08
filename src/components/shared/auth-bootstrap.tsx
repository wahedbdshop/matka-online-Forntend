"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { hasClientAuthCookie } from "@/lib/auth-cookie";

export function AuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);
  const [hasAuthCookie, setHasAuthCookie] = useState(() => {
    if (typeof document === "undefined") return false;
    return hasClientAuthCookie();
  });

  useEffect(() => {
    setHasAuthCookie(hasClientAuthCookie());
  }, []);

  const { data } = useQuery({
    queryKey: ["auth-bootstrap-profile"],
    queryFn: () => UserService.getProfile({ silent: true }),
    enabled: !user && hasAuthCookie,
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.data && !user) {
      hydrateUser(data.data);
    }
  }, [data, hydrateUser, user]);

  return null;
}
