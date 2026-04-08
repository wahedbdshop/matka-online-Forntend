/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const DepositService = {
  // User — available payment methods
  getAvailableMethods: async () => {
    const res = await api.get<ApiResponse<any>>("/deposit/methods");
    return res.data;
  },

  // User — deposit request submit
  create: async (payload: {
    paymentMethod: string;
    amount: number;
    transactionId: string;
    senderNumber: string;
  }) => {
    const res = await api.post<ApiResponse<any>>("/deposit", payload);
    return res.data;
  },

  // User — my history
  getMyDeposits: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/deposit/my?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  // User — single detail
  getMyDepositById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/deposit/my/${id}`);
    return res.data;
  },

  // User — commission
  previewBonus: async (amount: number) => {
    const res = await api.get<ApiResponse<any>>(
      `/deposit/preview-bonus?amount=${amount}`,
    );
    return res.data;
  },
  // ─── New ──────────────────────────────────────────────────────────────────
  getGlobalAgents: async (): Promise<{ data: any[] }> => {
    const res = await api.get("/deposit/global-agents");
    return res.data;
  },

  getPublicCommission: async (): Promise<{ data: any | null }> => {
    const res = await api.get("/deposit/commission/public");
    return res.data;
  },
};
