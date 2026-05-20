import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export type CoinTossOutcome = "HEAD" | "TAIL";
export type CoinTossRoundStatus =
  | "BETTING"
  | "LOCKED"
  | "SETTLED"
  | "CANCELLED";
export type CoinTossBetStatus = "PENDING" | "WON" | "LOST" | "REFUNDED";

export type CoinTossRound = {
  id: string;
  roundCode: string;
  status: CoinTossRoundStatus;
  outcome: CoinTossOutcome | null;
  powerOutcome: CoinTossOutcome | null;
  powerMultiplier: string | null;
  startsAt: string;
  locksAt: string;
  settledAt: string | null;
  totalHeadStake: string;
  totalTailStake: string;
};

export type CoinTossRoadmapCell = {
  outcome: CoinTossOutcome;
  row: number;
  column: number;
  roundCode: string;
  powerMultiplier: string | null;
};

export type CoinTossLeaderboardPlayer = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  amount: string;
};

export type CoinTossLobby = {
  settings: {
    minBet: string;
    maxBet: string;
    payoutMultiplier: string;
    bettingWindowSec: number;
    historyLimit: number;
  };
  currentRound: CoinTossRound;
  activePlayerCount: number;
  activeViewerCount: number;
  totalBetCount: number;
  displayTotalHeadStake: string;
  displayTotalTailStake: string;
  displayHeadChipAmounts: string[];
  displayTailChipAmounts: string[];
  liveBetPercentage: {
    head: number;
    tail: number;
    totalStake: string;
  };
  liveBetStats: {
    head: {
      userCount: number;
      betCount: number;
    };
    tail: {
      userCount: number;
      betCount: number;
    };
  };
  richestPlayers: CoinTossLeaderboardPlayer[];
  bigWinners: CoinTossLeaderboardPlayer[];
  roadmap: CoinTossRoadmapCell[];
  percentage: {
    head: number;
    tail: number;
    total: number;
  };
  history: Array<{
    roundCode: string;
    outcome: CoinTossOutcome | null;
    powerOutcome: CoinTossOutcome | null;
    powerMultiplier: string | null;
    settledAt: string | null;
  }>;
};

export type CoinTossBet = {
  id: string;
  roundId: string;
  outcome: CoinTossOutcome;
  stake: string;
  payout: string;
  profit: string;
  status: CoinTossBetStatus;
  balanceAfter: string;
  createdAt: string;
};

export const CoinTossService = {
  async getLobby() {
    const res = await api.get<ApiResponse<CoinTossLobby>>("/coin-toss/lobby");
    return res.data;
  },

  async placeBet(payload: { outcome: CoinTossOutcome; stake: number }) {
    const res = await api.post<
      ApiResponse<{
        bet: CoinTossBet;
        balance: string;
        round: CoinTossRound;
      }>
    >("/coin-toss/bets", payload);
    return res.data;
  },

  async getMyBets(limit = 20) {
    const res = await api.get<ApiResponse<CoinTossBet[]>>(
      `/coin-toss/bets/me?limit=${limit}`,
    );
    return res.data;
  },

  async trackPresence(sessionId: string) {
    const res = await api.post<
      ApiResponse<{
        sessionId: string;
        activeViewerCount: number;
      }>
    >("/coin-toss/presence", { sessionId });
    return res.data;
  },
};

export const CoinTossAdminService = {
  async getSettings() {
    const res = await api.get<
      ApiResponse<{
        id: string;
        isEnabled: boolean;
        bettingWindowSec: number;
        minBet: string;
        maxBet: string;
        payoutMultiplier: string;
        historyLimit: number;
        enableAntiLoss: boolean; // এখানে টাইপ যোগ করা হলো
        createdAt: string;
        updatedAt: string;
      }>
    >("/coin-toss/admin/settings");
    return res.data;
  },

  async updateSettings(payload: {
    isEnabled?: boolean;
    bettingWindowSec?: number;
    minBet?: number;
    maxBet?: number;
    payoutMultiplier?: number;
    historyLimit?: number;
    enableAntiLoss?: boolean; // এখানেও পেলোড টাইপ যোগ করা হলো
  }) {
    const res = await api.patch<
      ApiResponse<{
        id: string;
        isEnabled: boolean;
        bettingWindowSec: number;
        minBet: string;
        maxBet: string;
        payoutMultiplier: string;
        historyLimit: number;
        enableAntiLoss: boolean; // রিটার্ন টাইপ আপডেট করা হলো
        createdAt: string;
        updatedAt: string;
      }>
    >("/coin-toss/admin/settings", payload);
    return res.data;
  },

  async getReport(params?: { fromDate?: string; toDate?: string }) {
    const query = new URLSearchParams({
      ...(params?.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params?.toDate ? { toDate: params.toDate } : {}),
    }).toString();
    const res = await api.get<
      ApiResponse<{
        fromDate: string;
        toDate: string;
        totalBets: number;
        totalRounds: number;
        wonBetCount: number;
        lostBetCount: number;
        totalStake: string;
        totalPayout: string;
        userProfit: string;
        adminProfit: string;
        adminLoss: string;
        recentRounds: Array<{
          roundCode: string;
          outcome: CoinTossOutcome | null;
          powerOutcome: CoinTossOutcome | null;
          powerMultiplier: string | null;
          totalHeadStake: string;
          totalTailStake: string;
          totalStake: string;
          totalPayout: string;
          adminProfit: string;
          settledAt: string | null;
        }>;
      }>
    >(`/coin-toss/admin/report${query ? `?${query}` : ""}`);
    return res.data;
  },
};
