import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export type SevenUpDownSelection =
  | "DOWN"
  | "SEVEN"
  | "UP"
  | "TOTAL_2"
  | "TOTAL_3"
  | "TOTAL_4"
  | "TOTAL_5"
  | "TOTAL_6"
  | "TOTAL_8"
  | "TOTAL_9"
  | "TOTAL_10"
  | "TOTAL_11"
  | "TOTAL_12";

export type SevenUpDownResultType = "DOWN" | "SEVEN" | "UP";
export type SevenUpDownRoundStatus =
  | "BETTING"
  | "LOCKED"
  | "SETTLED"
  | "CANCELLED";
export type SevenUpDownBetStatus = "PENDING" | "WON" | "LOST" | "REFUNDED";

export type SevenUpDownRound = {
  id: string;
  roundCode: string;
  status: SevenUpDownRoundStatus;
  resultType: SevenUpDownResultType | null;
  diceOne: number | null;
  diceTwo: number | null;
  total: number | null;
  isPowerRound: boolean;
  powerMultiplier: string | null;
  startsAt: string;
  locksAt: string;
  settledAt: string | null;
  totalDownStake: string;
  totalSevenStake: string;
  totalUpStake: string;
  totalStake: string;
};

export type SevenUpDownRoadmapCell = {
  total: number;
  resultType: SevenUpDownResultType;
  row: number;
  column: number;
  roundCode: string;
  isPowerRound: boolean;
  powerMultiplier: string | null;
};

export type SevenUpDownLeaderboardPlayer = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  amount: string;
};

export type SevenUpDownLobby = {
  settings: {
    minBet: string;
    maxBet: string;
    bettingWindowSec: number;
    historyLimit: number;
    powerFrequency: number;
    powerMultiplier: string;
    boardPayouts: Record<string, string>;
  };
  currentRound: SevenUpDownRound;
  activePlayerCount: number;
  activeViewerCount: number;
  totalBetCount: number;
  liveRangePercentage: {
    down: number;
    seven: number;
    up: number;
    total: number;
  };
  liveBetStats: Record<
    SevenUpDownSelection,
    {
      totalStake: string;
      betCount: number;
      userCount: number;
    }
  >;
  richestPlayers: SevenUpDownLeaderboardPlayer[];
  bigWinners: SevenUpDownLeaderboardPlayer[];
  roadmap: SevenUpDownRoadmapCell[];
  percentage: {
    range: {
      down: number;
      seven: number;
      up: number;
      total: number;
    };
    totals: Record<string, number>;
  };
  history: Array<{
    roundCode: string;
    total: number | null;
    resultType: SevenUpDownResultType | null;
    isPowerRound: boolean;
    powerMultiplier: string | null;
    settledAt: string | null;
  }>;
};

export type SevenUpDownBet = {
  id: string;
  roundId: string;
  selection: SevenUpDownSelection;
  stake: string;
  payout: string;
  profit: string;
  status: SevenUpDownBetStatus;
  balanceAfter: string;
  createdAt: string;
};

export type SevenUpDownSettings = {
  id: string;
  isEnabled: boolean;
  bettingWindowSec: number;
  minBet: string;
  maxBet: string;
  rangePayoutMultiplier: string;
  sevenPayoutMultiplier: string;
  powerFrequency: number;
  powerMultiplier: string;
  historyLimit: number;
  enableAntiLoss: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SevenUpDownReport = {
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
    resultType: SevenUpDownResultType | null;
    diceOne: number | null;
    diceTwo: number | null;
    total: number | null;
    isPowerRound: boolean;
    powerMultiplier: string | null;
    totalStake: string;
    totalPayout: string;
    adminProfit: string;
    settledAt: string | null;
  }>;
};

export const SevenUpDownService = {
  async getLobby() {
    const res = await api.get<ApiResponse<SevenUpDownLobby>>("/seven-up-down/lobby");
    return res.data;
  },

  async placeBet(payload: { selection: SevenUpDownSelection; stake: number }) {
    const res = await api.post<
      ApiResponse<{
        bet: SevenUpDownBet;
        balance: string;
        round: SevenUpDownRound;
      }>
    >("/seven-up-down/bets", payload);
    return res.data;
  },

  async getMyBets(limit = 20) {
    const res = await api.get<ApiResponse<SevenUpDownBet[]>>(
      `/seven-up-down/bets/me?limit=${limit}`,
    );
    return res.data;
  },

  async trackPresence(sessionId: string) {
    const res = await api.post<
      ApiResponse<{
        sessionId: string;
        activeViewerCount: number;
      }>
    >("/seven-up-down/presence", { sessionId });
    return res.data;
  },
};

export const SevenUpDownAdminService = {
  async getSettings() {
    const res = await api.get<ApiResponse<SevenUpDownSettings>>(
      "/seven-up-down/admin/settings",
    );
    return res.data;
  },

  async updateSettings(payload: {
    isEnabled?: boolean;
    bettingWindowSec?: number;
    minBet?: number;
    maxBet?: number;
    rangePayoutMultiplier?: number;
    sevenPayoutMultiplier?: number;
    powerFrequency?: number;
    powerMultiplier?: number;
    historyLimit?: number;
    enableAntiLoss?: boolean;
  }) {
    const res = await api.patch<ApiResponse<SevenUpDownSettings>>(
      "/seven-up-down/admin/settings",
      payload,
    );
    return res.data;
  },

  async getReport(params?: { fromDate?: string; toDate?: string }) {
    const query = new URLSearchParams({
      ...(params?.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params?.toDate ? { toDate: params.toDate } : {}),
    }).toString();
    const res = await api.get<ApiResponse<SevenUpDownReport>>(
      `/seven-up-down/admin/report${query ? `?${query}` : ""}`,
    );
    return res.data;
  },
};
