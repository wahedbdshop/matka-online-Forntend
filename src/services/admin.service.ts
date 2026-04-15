/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export type SmsWebhookStatus = "MATCHED" | "UNMATCHED" | "DUPLICATE";

export interface SmsWebhookStats {
  isEnabled: boolean;
  total: number;
  matched: number;
  unmatched: number;
  duplicate: number;
  today: number;
}

export interface SmsWebhookLog {
  id: string;
  transactionId: string;
  senderPhone: string;
  amount: string;
  paymentMethod: string;
  depositRequestId?: string | null;
  username?: string | null;
  status: SmsWebhookStatus;
  createdAt: string;
}

export const AdminService = {
  // ─── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardStats: async () => {
    const res = await api.get<ApiResponse<any>>("/admin/dashboard", {
      withCredentials: true,
    });
    return res.data;
  },

  getSmsWebhookStats: async () => {
    const res = await api.get<ApiResponse<SmsWebhookStats>>(
      "/sms-webhook/stats",
    );
    return res.data;
  },

  getSmsWebhookLogs: async (params?: {
    page?: number;
    limit?: number;
    status?: SmsWebhookStatus;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.status ? { status: params.status } : {}),
    });
    const res = await api.get<
      ApiResponse<{
        logs: SmsWebhookLog[];
        total: number;
        page: number;
        limit: number;
      }>
    >(`/sms-webhook/logs?${query}`);
    return res.data;
  },

  toggleSmsWebhook: async (enabled: boolean) => {
    const res = await api.patch<ApiResponse<{ isEnabled: boolean }>>(
      "/sms-webhook/toggle",
      { enabled },
    );
    return res.data;
  },

  getSnapshotHistory: async (days = 30) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/dashboard/history?days=${days}`,
    );
    return res.data;
  },

  // ─── Users ─────────────────────────────────────────────────────────────────
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBy?: string;
    order?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    hasBalance?: boolean;
    kycStatus?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.orderBy) query.set("orderBy", params.orderBy);
    if (params?.order) query.set("order", params.order);
    if (params?.kycStatus) query.set("kycStatus", params.kycStatus);
    if (params?.hasBalance) query.set("hasBalance", "true");
    if (params?.emailVerified !== undefined)
      query.set("emailVerified", String(params.emailVerified));
    if (params?.phoneVerified !== undefined)
      query.set("phoneVerified", String(params.phoneVerified));
    const res = await api.get<ApiResponse<any>>(`/admin/users?${query}`);
    return res.data;
  },

  getUserById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/users/${id}`);
    return res.data;
  },

  banUser: async (id: string, reason?: string) => {
    const res = await api.patch<ApiResponse<any>>(`/admin/users/${id}/ban`, {
      reason,
    });
    return res.data;
  },

  unbanUser: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`/admin/users/${id}/unban`);
    return res.data;
  },

  adjustBalance: async (payload: {
    userId: string;
    amount: number;
    type: "CREDIT" | "DEBIT";
    note?: string;
  }) => {
    const res = await api.post<ApiResponse<any>>(
      "/admin/users/balance",
      payload,
    );
    return res.data;
  },

  loginAsUser: async (userId: string) => {
    const res = await api.post<ApiResponse<any>>(
      `/admin/users/${userId}/login-as`,
    );
    return res.data;
  },

  resetUserPassword: async (userId: string, newPassword: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/users/${userId}/reset-password`,
      { newPassword },
    );
    return res.data;
  },

  toggleUserTransfer: async (userId: string, canTransfer: boolean) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/users/${userId}/toggle-transfer`,
      { canTransfer },
    );
    return res.data;
  },

  toggleUserWithdraw: async (userId: string, canWithdraw: boolean) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/users/${userId}/toggle-withdraw`,
      { canWithdraw },
    );
    return res.data;
  },

  toggleUserDeposit: async (userId: string, canDeposit: boolean) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/users/${userId}/toggle-deposit`,
      { canDeposit },
    );
    return res.data;
  },

  // ─── Transfer ──────────────────────────────────────────────────
  getAllTransfers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/transfer/all?${query}`);
    return res.data;
  },
  getTransferChargeSetting: async () => {
    const res = await api.get<ApiResponse<any>>("/transfer/charge-setting");
    return res.data;
  },
  upsertTransferChargeSetting: async (payload: {
    freeUpTo: number;
    chargeType: "PERCENTAGE" | "FIXED";
    chargeValue: number;
    isActive: boolean;
  }) => {
    const res = await api.post<ApiResponse<any>>(
      "/transfer/charge-setting",
      payload,
    );
    return res.data;
  },

  verifyUserEmail: async (userId: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/users/${userId}/verify-email`,
    );
    return res.data;
  },

  getUserNotifications: async (userId: string, page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/users/${userId}/notifications?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  getUserLoginHistory: async (userId: string, page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/users/${userId}/login-history?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  getUserWallets: async (userId: string) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/users/${userId}/wallets`,
    );
    return res.data;
  },

  getUserWithdrawalAccounts: async (userId: string) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/users/${userId}/saved-accounts`,
    );
    return res.data;
  },

  addUserWithdrawalAccount: async (
    userId: string,
    payload: { paymentMethod: string; accountNumber: string; nickname?: string },
  ) => {
    const res = await api.post<ApiResponse<any>>(
      `/admin/users/${userId}/saved-accounts`,
      payload,
    );
    return res.data;
  },

  updateUserWithdrawalAccount: async (
    accountId: string,
    payload: { accountNumber?: string; nickname?: string },
  ) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/saved-accounts/${accountId}`,
      payload,
    );
    return res.data;
  },

  deleteUserWithdrawalAccount: async (accountId: string) => {
    const res = await api.delete<ApiResponse<any>>(
      `/admin/saved-accounts/${accountId}`,
    );
    return res.data;
  },

  deleteUserWallet: async (walletId: string) => {
    const res = await api.delete<ApiResponse<any>>(
      `/admin/wallets/${walletId}`,
    );
    return res.data;
  },

  updateUserWallet: async (
    walletId: string,
    payload: { accountNumber: string },
  ) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/wallets/${walletId}`,
      payload,
    );
    return res.data;
  },

  // ─── Deposit Requests (নতুন agent-based flow) ──────────────────────────────
  getDeposits: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    userId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.userId ? { userId: params.userId } : {}),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/deposit?${query}`);
    return res.data;
  },

  approveDeposit: async (id: string, note?: string) => {
    const res = await api.patch<ApiResponse<any>>(`/deposit/${id}/approve`, {
      note,
    });
    return res.data;
  },

  rejectDeposit: async (id: string, note?: string) => {
    const res = await api.patch<ApiResponse<any>>(`/deposit/${id}/reject`, {
      note,
    });
    return res.data;
  },

  // ─── Manual Deposit ────────────────────────────────────────────────────────
  createManualDeposit: async (payload: {
    userId: string;
    amount: number;
    bonus?: number;
    paymentMethod?: string;
    note?: string;
  }) => {
    const res = await api.post<ApiResponse<any>>("/manual", payload);
    return res.data;
  },

  getManualDeposits: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.userId ? { userId: params.userId } : {}),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/manual?${query}`);
    return res.data;
  },

  getManualDepositById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/manual/${id}`);
    return res.data;
  },

  // ─── Deposit Commission ────────────────────────────────────────────────────
  getDepositCommission: async () => {
    const res = await api.get<ApiResponse<any>>("/manual/commission");
    return res.data;
  },

  setDepositCommission: async (payload: {
    isActive: boolean;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    minDeposit: number;
    maxDeposit: number;
  }) => {
    const res = await api.post<ApiResponse<any>>("/manual/commission", payload);
    return res.data;
  },

  previewCommission: async (amount: number) => {
    const res = await api.get<ApiResponse<any>>(
      `/manual/commission/preview?amount=${amount}`,
    );
    return res.data;
  },

  // ─── Agent Management ──────────────────────────────────────────────────────
  getAgents: async (params?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 10),
      ...(params?.type ? { type: params.type } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.search ? { search: params.search } : {}),
    });
    // const res = await api.get<ApiResponse<any>>(`/agent?${query}`);
    const res = await api.get(`/agent?${query.toString()}`);
    return res.data;
  },

  getAgentById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/agent/${id}`);
    return res.data;
  },

  createAgent: async (payload: any) => {
    const res = await api.post<ApiResponse<any>>("/agent", payload);
    return res.data;
  },

  updateAgent: async (id: string, payload: any) => {
    const res = await api.patch<ApiResponse<any>>(`/agent/${id}`, payload);
    return res.data;
  },

  deleteAgent: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/agent/${id}`);
    return res.data;
  },

  banAgent: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`/agent/${id}/ban`);
    return res.data;
  },

  unbanAgent: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`/agent/${id}/unban`);
    return res.data;
  },

  // ─── Withdrawals ───────────────────────────────────────────────────────────
  getWithdrawals: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    userId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.userId ? { userId: params.userId } : {}),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/withdrawal?${query}`);
    return res.data;
  },

  approveWithdrawal: async (
    id: string,
    transactionId?: string,
    note?: string,
  ) => {
    const res = await api.patch<ApiResponse<any>>(`/withdrawal/${id}/approve`, {
      transactionId,
      note,
    });
    return res.data;
  },

  rejectWithdrawal: async (id: string, note?: string) => {
    const res = await api.patch<ApiResponse<any>>(`/withdrawal/${id}/reject`, {
      note,
    });
    return res.data;
  },

  // ─── Thai Lottery ──────────────────────────────────────────────────────────
  getThaiRounds: async (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(status ? { status } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `/thai-lottery/rounds?${params}`,
    );
    return res.data;
  },

  createThaiRound: async (payload: {
    issueNumber: string;
    drawDate: string;
  }) => {
    const res = await api.post<ApiResponse<any>>(
      "/thai-lottery/rounds",
      payload,
    );
    return res.data;
  },

  openThaiRound: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/open`,
    );
    return res.data;
  },

  closeThaiRound: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/close`,
    );
    return res.data;
  },

  setThaiResult: async (
    id: string,
    payload: {
      resultThreeUpDirect: string;
      resultTwoUpDirect: string;
      resultDownDirect: string;
      publishPublicResult?: boolean;
    },
  ) => {
    const res = await api.post<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/result`,
      payload,
    );
    return res.data;
  },

  editThaiResult: async (
    id: string,
    payload: {
      resultThreeUpDirect: string;
      resultTwoUpDirect: string;
      resultDownDirect: string;
      note?: string;
      publishPublicResult?: boolean;
    },
  ) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/result`,
      payload,
    );
    return res.data;
  },

  getThaiRoundBets: async (
    roundId: string,
    params?: {
      page?: number;
      limit?: number;
      playType?: string;
      status?: string;
      search?: string;
    },
  ) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.playType ? { playType: params.playType } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `/thai-lottery/rounds/${roundId}/bets?${query}`,
    );
    return res.data;
  },

  setThaiCloseTime: async (id: string, payload: { closeTime: string }) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/close-time`,
      payload,
    );
    return res.data;
  },

  getThaiRoundById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/thai-lottery/rounds/${id}`);
    return res.data;
  },

  cancelThaiBet: async (betId: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/admin/bet/${betId}/cancel`,
    );
    return res.data;
  },

  removeThaiBet: async (betId: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/admin/bet/${betId}/remove`,
    );
    return res.data;
  },

  thaiBulkCancel: async (payload: { fromDate: string; toDate: string }) => {
    const res = await api.patch<ApiResponse<any>>(
      "/thai-lottery/admin/bulk-cancel",
      payload,
    );
    return res.data;
  },

  editThaiBetNumber: async (
    betId: string,
    betNumber: string,
    amount?: number,
  ) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/bets/${betId}/number`,
      { betNumber, amount },
    );
    return res.data;
  },

  thaiDeleteHistory: async (payload: { fromDate: string; toDate: string }) => {
    const res = await api.patch<ApiResponse<any>>(
      "/thai-lottery/admin/delete-history",
      payload,
    );
    return res.data;
  },

  getThaiRates: async () => {
    const res = await api.get<ApiResponse<any>>("/thai-lottery/rates");
    return res.data;
  },

  getThaiCurrencyRate: async () => {
    const res = await api.get<ApiResponse<any>>("/game-rates/currency");
    return res.data;
  },

  updateThaiDiscount: async (payload: {
    playType: string;
    baseDiscountPct: number;
    globalDiscountPct: number;
  }) => {
    const res = await api.patch<ApiResponse<any>>(
      "/thai-lottery/admin/discount",
      payload,
    );
    return res.data;
  },

  holdThaiRound: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/hold`,
    );
    return res.data;
  },

  resumeThaiRound: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/resume`,
    );
    return res.data;
  },

  extendThaiCloseTime: async (id: string, closeTime: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${id}/extend-close-time`,
      { closeTime },
    );
    return res.data;
  },

  cancelThaiRound: async (roundId: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${roundId}/cancel`,
    );
    return res.data;
  },

  cancelThaiByCategory: async (roundId: string, playTypes: string[]) => {
    const res = await api.patch<ApiResponse<any>>(
      `/thai-lottery/rounds/${roundId}/cancel-category`,
      { playTypes },
    );
    return res.data;
  },

  getThaiEditLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    roundId?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.roundId ? { roundId: params.roundId } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `/thai-lottery/admin/bet-edit-logs?${query}`,
    );
    return res.data;
  },

  getRemovedThaiBets: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    roundId?: string;
    playType?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.roundId ? { roundId: params.roundId } : {}),
      ...(params?.playType ? { playType: params.playType } : {}),
      ...(params?.status ? { status: params.status } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `/thai-lottery/admin/removed-bets?${query}`,
    );
    return res.data;
  },

  // ─── Kalyan ────────────────────────────────────────────────────────────────
  // ─── KYC ───────────────────────────────────────────────────────────────────
  getPendingKyc: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/kyc?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  reviewKyc: async (
    id: string,
    status: "VERIFIED" | "REJECTED",
    reviewNote?: string,
  ) => {
    const res = await api.patch<ApiResponse<any>>(`/admin/kyc/${id}`, {
      status,
      reviewNote,
    });
    return res.data;
  },

  // ─── Support ───────────────────────────────────────────────────────────────
  getTickets: async (params?: { status?: string; page?: number }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      ...(params?.status ? { status: params.status } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/admin/tickets?${query}`);
    return res.data;
  },

  replyTicket: async (id: string, adminReply: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/admin/tickets/${id}/reply`,
      { adminReply },
    );
    return res.data;
  },

  closeTicket: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`/admin/tickets/${id}/close`);
    return res.data;
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  getSettings: async (group?: string) => {
    const res = await api.get<ApiResponse<any>>(
      `/admin/settings${group ? `?group=${group}` : ""}`,
    );
    return res.data;
  },

  updateSetting: async (key: string, value: string) => {
    const res = await api.patch<ApiResponse<any>>("/admin/settings", {
      key,
      value,
    });
    return res.data;
  },

  setGlobalToggle: async (key: string, value: boolean) => {
    const res = await api.patch<ApiResponse<any>>(
      "/admin/settings/global-toggle",
      { key, value },
    );
    return res.data;
  },

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: async (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
    });
    const res = await api.get<ApiResponse<any>>(`/admin/audit-logs?${query}`);
    return res.data;
  },

  // ─── Referral ──────────────────────────────────────────────────────────────
  getReferralConfig: async () => {
    const res = await api.get<ApiResponse<any>>("/referral/config");
    return res.data;
  },

  getReferralSettings: async () => {
    const res = await api.get<ApiResponse<any>>("/admin/referral-settings");
    return res.data;
  },

  updateReferralSettings: async (payload: {
    depositCommissionPct?: number;
    referralCommissionPct?: number;
  }) => {
    const res = await api.patch<ApiResponse<any>>(
      "/admin/referral-settings",
      payload,
    );
    return res.data;
  },

  updateReferralConfig: async (
    level: number,
    commissionPct: number,
    isActive: boolean,
  ) => {
    const res = await api.patch<ApiResponse<any>>("/referral/config", {
      level,
      commissionPct,
      isActive,
    });
    return res.data;
  },

  // ata add kor kris
  // ✅ এখন
  getPublicSettings: async () => {
    const res = await api.get<ApiResponse<any>>("/admin/settings/public");
    return res.data;
  },

  // with

  // Payment Methods
  getPaymentMethods: async () => {
    const res = await api.get<ApiResponse<any>>("/payment-methods");
    return res.data;
  },
  createPaymentMethod: async (payload: any) => {
    const res = await api.post<ApiResponse<any>>("/payment-methods", payload);
    return res.data;
  },
  updatePaymentMethod: async (id: string, payload: any) => {
    const res = await api.patch<ApiResponse<any>>(
      `/payment-methods/${id}`,
      payload,
    );
    return res.data;
  },
  deletePaymentMethod: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/payment-methods/${id}`);
    return res.data;
  },

  // ─── Admin Profile ─────────────────────────────────────────────────────────
  getAdminProfile: async (options?: {
    silent?: boolean;
    accessToken?: string | null;
  }) => {
    const res = await api.get<ApiResponse<any>>("/admin/profile", {
      withCredentials: true,
      skipAuthRedirect: options?.silent,
      headers: options?.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`,
          }
        : undefined,
    } as any);
    return res.data;
  },

  updateAdminProfile: async (payload: {
    name?: string;
    email?: string;
    image?: File;
  }) => {
    const hasImage = payload.image instanceof File;
    const requestBody = hasImage
      ? (() => {
          const formData = new FormData();
          if (payload.name !== undefined) formData.append("name", payload.name);
          if (payload.email !== undefined)
            formData.append("email", payload.email);
          if (payload.image) formData.append("image", payload.image);
          return formData;
        })()
      : payload;
    const res = await api.patch<ApiResponse<any>>("/admin/profile", requestBody, {
      withCredentials: true,
      headers: hasImage ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },

  updateAdminPassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const res = await api.patch<ApiResponse<any>>(
      "/admin/profile/password",
      payload,
    );
    return res.data;
  },

  // ─── Active Sessions ────────────────────────────────────────────────────────
  getActiveSessions: async () => {
    const res = await api.get<ApiResponse<any>>("/admin/sessions", {
      withCredentials: true,
    });
    return res.data;
  },

  revokeSession: async (sessionId: string) => {
    const res = await api.delete<ApiResponse<any>>(
      `/admin/sessions/${sessionId}`,
    );
    return res.data;
  },

  revokeAllSessions: async () => {
    const res = await api.delete<ApiResponse<any>>("/admin/sessions");
    return res.data;
  },

  blockSessionIp: async (sessionId: string, reason?: string) => {
    const res = await api.post<ApiResponse<any>>(
      `/admin/sessions/${sessionId}/block-ip`,
      { reason },
    );
    return res.data;
  },

  getBlockedIps: async () => {
    const res = await api.get<ApiResponse<any>>("/admin/blocked-ips");
    return res.data;
  },

  unblockIp: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/blocked-ips/${id}`);
    return res.data;
  },

  // ─── Notifications ─────────────────────────────────────────────────────────
  sendNotificationToAll: async (payload: {
    title: string;
    message: string;
  }) => {
    const res = await api.post<ApiResponse<any>>(
      "/notification/admin/notify-all",
      payload,
    );
    return res.data;
  },

  sendNotificationToUser: async (
    userId: string,
    payload: { title: string; message: string },
  ) => {
    const res = await api.post<ApiResponse<any>>(
      `/notification/admin/notify-user/${userId}`,
      payload,
    );
    return res.data;
  },
};
