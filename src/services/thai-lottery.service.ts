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

  getRecentWinners: async () => {
    const extractList = (d: any): any[] => {
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      if (Array.isArray(d?.bets)) return d.bets;
      if (Array.isArray(d?.rounds)) return d.rounds;
      if (Array.isArray(d?.results)) return d.results;
      if (Array.isArray(d?.data?.bets)) return d.data.bets;
      if (Array.isArray(d?.data?.rounds)) return d.data.rounds;
      if (Array.isArray(d?.data?.results)) return d.data.results;
      return [];
    };

    // fallback: /thai-lottery/public-winners
    try {
      const res = await publicApi.get<ApiResponse<any>>("/thai-lottery/public-winners");
      const data = extractList(res.data);
      if (data.length > 0) return { success: true, data };
    } catch { /* ignore */ }

    return { success: true, data: [] };
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
