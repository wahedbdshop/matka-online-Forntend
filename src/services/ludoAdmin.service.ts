/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

const BASE = "/ludo/admin";

export const LudoAdminService = {
  getSettings: async () => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/settings`);
    return res.data;
  },

  updateSettings: async (payload: {
    isEnabled?: boolean;
    isFreeMode?: boolean;
    freeMode?: boolean;
    allowedStakes?: number[];
    commissionPct?: number;
    queueTimeoutMin?: number;
    turnTimeoutSec?: number;
  }) => {
    const res = await api.patch<ApiResponse<any>>(`${BASE}/settings`, payload);
    return res.data;
  },

  getStats: async () => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/stats`);
    return res.data;
  },

  getMatches: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }) => {
    const q = new URLSearchParams({
      page: String(params?.page ?? 1),
      limit: String(params?.limit ?? 20),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.userId ? { userId: params.userId } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`${BASE}/matches?${q}`);
    return res.data;
  },

  getMatchById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/matches/${id}`);
    return res.data;
  },

  cancelMatch: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`${BASE}/matches/${id}/cancel`);
    return res.data;
  },
};
