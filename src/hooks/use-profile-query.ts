"use client";

import { useQuery } from "@tanstack/react-query";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";

export const useProfileQuery = (options?: {
  enabled?: boolean;
  silent?: boolean;
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  return useQuery({
    queryKey: ["profile"],
    queryFn: () => UserService.getProfile({ silent: options?.silent }),
    enabled: options?.enabled ?? (isAuthReady && isAuthenticated),
    refetchInterval: isAuthReady && isAuthenticated ? 10000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: isAuthReady && isAuthenticated,
  });
};
