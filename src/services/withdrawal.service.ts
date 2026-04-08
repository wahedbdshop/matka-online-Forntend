/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const WithdrawalService = {
  getMethods: async () => {
    const res = await api.get<ApiResponse<any>>("/withdrawal/methods");
    return res.data;
  },

  create: async (payload: {
    paymentMethod: string;
    accountNumber: string;
    accountHolderName?: string;
    bankName?: string;
    branchName?: string;
    swiftCode?: string;
    amount: number;
  }) => {
    const res = await api.post<ApiResponse<any>>("/withdrawal", payload);
    return res.data;
  },

  getMyWithdrawals: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/withdrawal/my?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  getSavedAccounts: async () => {
    const res = await api.get<ApiResponse<any>>("/withdrawal/saved-accounts");
    return res.data;
  },

  saveAccount: async (data: {
    paymentMethod: string;
    accountNumber: string;
  }) => {
    const res = await api.post<ApiResponse<any>>(
      "/withdrawal/saved-accounts",
      data,
    );
    return res.data;
  },

  deleteSavedAccount: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(
      `/withdrawal/saved-accounts/${id}`,
    );
    return res.data;
  },
};
