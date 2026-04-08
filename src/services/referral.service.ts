/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const ReferralService = {
  // User
  getMyReferrals: async () => {
    const res = await api.get<ApiResponse<any>>("/referral/my");
    return res.data;
  },

  getMyEarnings: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/referral/my/earnings?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  // Admin
  getConfig: async () => {
    const res = await api.get<ApiResponse<any>>("/referral/config");
    return res.data;
  },

  bulkUpdateConfig: async (
    configs: { level: number; commissionPct: number; isActive: boolean }[],
  ) => {
    const res = await api.put<ApiResponse<any>>("/referral/config/bulk", {
      configs,
    });
    return res.data;
  },

  getAllEarnings: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/referral/earnings?page=${page}&limit=${limit}`,
    );
    return res.data;
  },
};
