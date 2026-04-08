"use client";

import { useQuery } from "@tanstack/react-query";
import { UserService } from "@/services/user.service";

export const useProfileQuery = (options?: {
  enabled?: boolean;
  silent?: boolean;
}) =>
  useQuery({
    queryKey: ["profile"],
    queryFn: () => UserService.getProfile({ silent: options?.silent }),
    enabled: options?.enabled,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
