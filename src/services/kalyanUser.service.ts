/* eslint-disable @typescript-eslint/no-explicit-any */
import { api, publicApi } from "@/lib/axios";
import { ApiResponse } from "@/types";
import { useAuthStore } from "@/store/auth.store";

const BASE = "/kalyan";

const DEFAULT_KALYAN_RATES = [
  { playType: "GAME_TOTAL", rate: 90, status: "ACTIVE" },
  { playType: "SINGLE_PATTI", rate: 140, status: "ACTIVE" },
  { playType: "DOUBLE_PATTI", rate: 280, status: "ACTIVE" },
  { playType: "TRIPLE_PATTI", rate: 480, status: "ACTIVE" },
  { playType: "JORI", rate: 100, status: "ACTIVE" },
];

const normalizeRateItem = (item: any) => ({
  ...item,
  rate: Number(item.rate ?? item.multiplier ?? 0),
  baseDiscountPct: Number(item.baseDiscountPct ?? 0),
  globalDiscountPct: Number(item.globalDiscountPct ?? 0),
  status:
    item.status ??
    (item.isActive === false ? "INACTIVE" : "ACTIVE"),
});

const normalizeKalyanRates = (items: any[] = []) => {
  const normalized = items.map(normalizeRateItem);
  const byPlayType = new Map(
    normalized.map((item) => [item.playType, item]),
  );

  return DEFAULT_KALYAN_RATES.map((fallback) => ({
    ...fallback,
    ...byPlayType.get(fallback.playType),
  }));
};

const PLAY_TYPE_ENUM_MAP: Record<string, string> = {
  "game-total": "GAME_TOTAL",
  game_total: "GAME_TOTAL",
  gametotal: "GAME_TOTAL",
  GAME_TOTAL: "GAME_TOTAL",
  "single-patti": "SINGLE_PATTI",
  single_patti: "SINGLE_PATTI",
  singlepatti: "SINGLE_PATTI",
  SINGLE_PATTI: "SINGLE_PATTI",
  "double-patti": "DOUBLE_PATTI",
  double_patti: "DOUBLE_PATTI",
  doublepatti: "DOUBLE_PATTI",
  DOUBLE_PATTI: "DOUBLE_PATTI",
  "triple-patti": "TRIPLE_PATTI",
  triple_patti: "TRIPLE_PATTI",
  triplepatti: "TRIPLE_PATTI",
  TRIPLE_PATTI: "TRIPLE_PATTI",
  jori: "JORI",
  JORI: "JORI",
};

const normalizeEntryPlayType = (value: string) => {
  const trimmed = value.trim();
  const compactKey = trimmed.toLowerCase().replace(/[\s_-]+/g, "");
  const resolved =
    PLAY_TYPE_ENUM_MAP[trimmed] ??
    PLAY_TYPE_ENUM_MAP[trimmed.toLowerCase()] ??
    PLAY_TYPE_ENUM_MAP[trimmed.toUpperCase()] ??
    PLAY_TYPE_ENUM_MAP[compactKey] ??
    "";

  return resolved;
};

const normalizeGameStatus = (value: unknown) => {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "INACTIVE") {
    return "CLOSE";
  }
  if (normalized === "CLOSE" || normalized === "CLOSED") {
    return "CLOSE";
  }
  if (normalized === "CANCEL" || normalized === "CANCELLED") {
    return "CANCEL";
  }

  return undefined;
};

const normalizeEntryItem = (item: any) => ({
  ...item,
  selectedNumber: item?.selectedNumber ?? item?.betNumber ?? item?.number ?? item?.playNumber ?? "",
  status: item?.status ?? item?.betStatus ?? "-",
  betStatus: item?.betStatus ?? item?.status ?? null,
  gameStatus: normalizeGameStatus(item?.gameStatus ?? item?.status),
  amount: Number(item?.amount ?? item?.betAmount ?? 0),
  enteredAmount: Number(item?.enteredAmount ?? item?.amount ?? item?.betAmount ?? 0),
  discountPct: Number(item?.discountPct ?? 0),
  discountAmount: Number(item?.discountAmount ?? 0),
  payableAmount: Number(
    item?.payableAmount ??
    item?.amount ??
    item?.betAmount ??
    0,
  ),
});

const normalizeEntrySlip = (entry: any) => {
  const items = Array.isArray(entry?.items)
    ? entry.items.map(normalizeEntryItem)
    : [];
  const totalAmount =
    entry?.totalAmount ??
    entry?.amount ??
    entry?.betAmount ??
    entry?.winAmount ??
    entry?.winningAmount ??
    items.reduce((sum: number, item: { amount?: number }) => sum + Number(item.amount ?? 0), 0);

  return {
    ...entry,
    status: entry?.status ?? entry?.betStatus ?? "-",
    betStatus: entry?.betStatus ?? entry?.status ?? null,
    gameStatus: normalizeGameStatus(entry?.gameStatus),
    totalAmount: Number(totalAmount ?? 0),
    totalEnteredAmount: Number(entry?.totalEnteredAmount ?? totalAmount ?? 0),
    totalDiscountAmount: Number(entry?.totalDiscountAmount ?? 0),
    totalPayableAmount: Number(entry?.totalPayableAmount ?? totalAmount ?? 0),
    items,
  };
};

const normalizeMarket = (market: any) => ({
  ...market,
  name:
    market?.name ??
    market?.marketName ??
    market?.title ??
    market?.openName ??
    market?.closeName ??
    "",
  openName:
    market?.openName ??
    market?.openMarketName ??
    market?.open,
  closeName:
    market?.closeName ??
    market?.closeMarketName ??
    market?.close,
});

const sortMarketsByOldest = <T extends { createdAt?: string }>(markets: T[]) =>
  [...markets].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
    return leftTime - rightTime;
  });

const normalizeResultText = (value?: string) =>
  String(value ?? "")
    .replace(/\bopen\b/gi, "")
    .replace(/\bclose\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const toResultGameKey = (value?: string) =>
  normalizeResultText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getResultTitle = (result: any) =>
  normalizeResultText(
    result?.title ??
      result?.market?.name ??
      result?.market?.openName ??
      result?.market?.closeName ??
      result?.gameName ??
      result?.marketName ??
      result?.marketId,
  ) || "Market";

const normalizePublishedResults = (items: any[] = []) => {
  const groupedMap = new Map<string, any>();

  for (const item of items) {
    const resultDate = String(item?.resultDate ?? item?.createdAt ?? "").slice(0, 10);
    const title = getResultTitle(item);
    const gameKey = toResultGameKey(title);
    const groupKey = `${resultDate}::${gameKey}`;
    const existing = groupedMap.get(groupKey);

    if (!existing) {
      groupedMap.set(groupKey, {
        ...item,
        resultDate,
        title,
        gameKey,
      });
      continue;
    }

    groupedMap.set(groupKey, {
      ...existing,
      title: existing.title || title,
      gameKey: existing.gameKey || gameKey,
      openPatti:
        existing.openPatti && existing.openPatti !== "000"
          ? existing.openPatti
          : item.openPatti,
      openTotal:
        existing.openTotal !== undefined && existing.openTotal !== null
          ? existing.openTotal
          : item.openTotal,
      closePatti:
        existing.closePatti && existing.closePatti !== "000"
          ? existing.closePatti
          : item.closePatti,
      closeTotal:
        existing.closeTotal !== undefined && existing.closeTotal !== null
          ? existing.closeTotal
          : item.closeTotal,
      finalResult: existing.finalResult ?? item.finalResult,
      finalDisplay: existing.finalDisplay ?? item.finalDisplay,
      status:
        existing.status === "PUBLISHED" || item.status !== "PUBLISHED"
          ? existing.status
          : item.status,
      createdAt:
        new Date(existing.createdAt ?? 0).getTime() >=
        new Date(item.createdAt ?? 0).getTime()
          ? existing.createdAt
          : item.createdAt,
    });
  }

  return [...groupedMap.values()].sort((a, b) => {
    const dateDiff =
      new Date(b.resultDate ?? b.createdAt ?? 0).getTime() -
      new Date(a.resultDate ?? a.createdAt ?? 0).getTime();

    if (dateDiff !== 0) return dateDiff;

    return String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });
};

export const KalyanUserService = {
  // ─── Markets ──────────────────────────────────────────────────────────────
  getActiveMarkets: async () => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/markets/public`);
    const markets = Array.isArray(res.data?.data)
      ? sortMarketsByOldest(res.data.data.map(normalizeMarket))
      : Array.isArray(res.data?.data?.markets)
        ? sortMarketsByOldest(res.data.data.markets.map(normalizeMarket))
        : [];

    if (Array.isArray(res.data?.data)) {
      return {
        ...res.data,
        data: markets,
      };
    }

    if (res.data?.data && typeof res.data.data === "object") {
      return {
        ...res.data,
        data: {
          ...res.data.data,
          markets,
        },
      };
    }

    return res.data;
  },

  getMarketTiming: async (marketId: string) => {
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/markets/${marketId}/timing/public`,
    );
    return res.data;
  },

  // ─── Results ──────────────────────────────────────────────────────────────
  getPublishedResults: async (params?: {
    marketId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.marketId ? { marketId: params.marketId } : {}),
      ...(params?.date ? { date: params.date } : {}),
    });
    const res = await publicApi.get<ApiResponse<any>>(
      `${BASE}/public-results?${q}`,
    );
    const results = Array.isArray(res.data?.data)
      ? normalizePublishedResults(res.data.data)
      : Array.isArray(res.data?.data?.results)
        ? normalizePublishedResults(res.data.data.results)
        : [];

    if (Array.isArray(res.data?.data)) {
      return {
        ...res.data,
        data: results,
      };
    }

    if (res.data?.data && typeof res.data.data === "object") {
      return {
        ...res.data,
        data: {
          ...res.data.data,
          results,
        },
      };
    }

    return res.data;
  },

  getPublishedResultById: async (id: string) => {
    const res = await publicApi.get<ApiResponse<any>>(
      `${BASE}/public-results/${id}`,
    );
    return res.data;
  },

  // ─── Entries ──────────────────────────────────────────────────────────────
  createEntrySlip: async (payload: {
    marketId: string;
    sessionType: "OPEN" | "CLOSE";
    playType: string;
    resultDate: string;
    items: Array<{
      selectedNumber: string;
      amount: number;
    }>;
  }) => {
    const normalizedPayload = {
      ...payload,
      sessionType: payload.sessionType === "CLOSE" ? "CLOSE" : "OPEN",
      playType: normalizeEntryPlayType(payload.playType),
    };

    if (!normalizedPayload.playType) {
      throw new Error("Invalid play type selected.");
    }

    const res = await api.post<ApiResponse<any>>(`${BASE}/entries`, normalizedPayload);
    return res.data;
  },

  getMyEntries: async (params?: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.date ? { date: params.date } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`${BASE}/entries/me?${q}`);
    const entries = Array.isArray(res.data?.data)
      ? res.data.data.map(normalizeEntrySlip)
      : Array.isArray(res.data?.data?.entries)
        ? res.data.data.entries.map(normalizeEntrySlip)
        : [];

    if (Array.isArray(res.data?.data)) {
      return {
        ...res.data,
        data: entries,
      };
    }

    if (res.data?.data && typeof res.data.data === "object") {
      return {
        ...res.data,
        data: {
          ...res.data.data,
          entries,
        },
      };
    }

    return res.data;
  },

  // ─── Play number catalog (optional — we use local constants) ──────────────
  getPlayNumberCatalog: async () => {
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/play-number-catalog`,
    );
    return res.data;
  },

  // ─── Game rates (placeholder — same structure as admin) ───────────────────
  getGameRates: async (): Promise<ApiResponse<any>> => {
    const token = useAuthStore.getState().token;
    if (!token) {
      return { success: true, message: "ok", data: DEFAULT_KALYAN_RATES };
    }
    try {
      const res = await api.get<ApiResponse<any>>(`${BASE}/rates`);
      return {
        ...res.data,
        data: normalizeKalyanRates(
          Array.isArray(res.data?.data) ? res.data.data : [],
        ),
      };
    } catch {
      return { success: true, message: "ok", data: DEFAULT_KALYAN_RATES };
    }
  },

  getProfile: async () => {
    const res = await api.get<ApiResponse<any>>("/user/profile");
    return res.data;
  },
};
