/* eslint-disable @typescript-eslint/no-explicit-any */
import { api, publicApi } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { ApiResponse } from "@/types";

interface PlaceBetPayload {
  roundId: string;
  playType: string;
  betNumber: string;
  amount: number;
}

// ─────────────────────────────────────────────────────────────
// USER — Thai Lottery Service
// ─────────────────────────────────────────────────────────────
export const ThaiLotteryUserService = {
  // ✅ active round — backend এ GET /thai-lottery/active-round route দরকার
  getActiveRound: async () => {
    const res = await api.get<ApiResponse<any>>("/thai-lottery/active-round");
    return res.data;
  },

  // ✅ bet rates — backend এ GET /thai-lottery/rates route দরকার
  getBetRates: async () => {
    const res = await api.get<ApiResponse<any>>("/thai-lottery/rates");
    return res.data;
  },

  // public — user Result
  getPreviousResults: async (page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const res = await publicApi.get<ApiResponse<any>>(
      `/thai-lottery/public-results?${params}`,
    );
    return res.data;
  },

  getPreviousResultById: async (id: string) => {
    const res = await publicApi.get<ApiResponse<any>>(
      `/thai-lottery/public-results/${id}`,
    );
    return res.data;
  },

  placeBet: async (payload: PlaceBetPayload) => {
    const res = await api.post<ApiResponse<any>>("/thai-lottery/bet", payload);
    return res.data;
  },

  cancelBet: async (betId: string) => {
    const res = await api.delete<ApiResponse<any>>(
      `/thai-lottery/bet/${betId}`,
    );
    return res.data;
  },

  getRates: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return null;
    const res = await api.get<ApiResponse<any>>("/thai-lottery/rates");
    return res.data;
  },

  getRecentWinners: async (limit = 10) => {
    const res = await publicApi.get<ApiResponse<any>>(
      `/home/winners?limit=${limit}`,
    );
    return res.data;
  },

  getMyBets: async (
    roundId?: string,
    page = 1,
    limit = 20,
    status?: string,
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(roundId ? { roundId } : {}),
      ...(status ? { status } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `/thai-lottery/bet/my?${params}`,
    );
    return res.data;
  },

  // ThaiLotteryUserService
  getCurrencyRate: async () => {
    const res = await api.get<ApiResponse<any>>("/game-rates/currency");
    return res.data;
    // response: { bdtPerDollar: 110 }
  },

  getProfile: async () => {
    const res = await api.get<ApiResponse<any>>("/user/profile");
    return res.data;
  },
};
