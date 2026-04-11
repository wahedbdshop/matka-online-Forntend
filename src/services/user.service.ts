/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const UserService = {
  getProfile: async (options?: {
    silent?: boolean;
    accessToken?: string | null;
  }) => {
    const res = await api.get<ApiResponse<any>>("/user/profile", {
      skipAuthRedirect: options?.silent,
      headers: options?.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`,
          }
        : undefined,
    } as any);
    return res.data;
  },

  updateProfile: async (payload: any) => {
    const res = await api.patch<ApiResponse<any>>("/user/profile", payload);
    return res.data;
  },

  getUserStats: async () => {
    const res = await api.get<ApiResponse<any>>("/user/stats");
    return res.data;
  },

  getTransactions: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/user/transactions?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  getBonusHistory: async () => {
    const res = await api.get<ApiResponse<any>>("/user/bonus-history");
    return res.data;
  },
};
