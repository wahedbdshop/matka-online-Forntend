/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";
import {
  EntryFilterParams,
  MarketFilterParams,
  ResultFilterParams,
} from "@/types/kalyan";

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

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const compactObject = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const normalizeMarket = (market: any) => ({
  ...market,
  name:
    market?.name ??
    market?.marketName ??
    market?.title ??
    market?.openName ??
    market?.closeName ??
    market?.openMarketName ??
    market?.closeMarketName ??
    "",
  slug: market?.slug ?? toSlug(market?.name ?? market?.marketName ?? ""),
  openName:
    market?.openName ??
    market?.openMarketName ??
    market?.open,
  closeName:
    market?.closeName ??
    market?.closeMarketName ??
    market?.close,
  sessionType: market?.sessionType,
  openTime: market?.openTime,
  closeTime: market?.closeTime,
});

const sortMarketsByOldest = <T extends { createdAt?: string }>(markets: T[]) =>
  [...markets].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String((left as { id?: string })?.id ?? "").localeCompare(
      String((right as { id?: string })?.id ?? ""),
    );
  });

const normalizeTiming = (timing: any, market?: any) => ({
  ...timing,
  gameName:
    timing?.gameName ??
    timing?.name ??
    (timing?.sessionType === "CLOSE"
      ? market?.closeName ?? market?.name
      : market?.openName ?? market?.name),
  sessionType: timing?.sessionType ?? market?.sessionType ?? "OPEN",
  openTime: timing?.openTime ?? market?.openTime ?? "",
  closeTime: timing?.closeTime ?? market?.closeTime ?? "",
  status: timing?.status ?? market?.status ?? "ACTIVE",
});

const normalizeAdminEntry = (entry: any) => {
  const items = Array.isArray(entry?.items)
    ? entry.items.map((item: any) => ({
        ...item,
        status: item?.betStatus ?? item?.status ?? item?.gameStatus ?? "-",
        gameStatus: item?.gameStatus ?? item?.status ?? "-",
        betStatus: item?.betStatus ?? item?.status ?? null,
      }))
    : [];
  const firstItem = items[0];
  const market = entry?.market ? normalizeMarket(entry.market) : entry?.market;
  const betNumbers = items
    .map((item: any) => item?.selectedNumber)
    .filter(Boolean)
    .join(", ");

  return {
    ...entry,
    market,
    gameName:
      entry?.gameName ??
      market?.name ??
      market?.openName ??
      market?.closeName ??
      firstItem?.gameName ??
      entry?.marketName ??
      "-",
    playType:
      entry?.playType ??
      firstItem?.playType ??
      "-",
    totalAmount: Number(entry?.totalAmount ?? entry?.amount ?? 0),
    totalEnteredAmount: Number(entry?.totalEnteredAmount ?? entry?.totalAmount ?? entry?.amount ?? 0),
    totalDiscountAmount: Number(entry?.totalDiscountAmount ?? 0),
    totalPayableAmount: Number(entry?.totalPayableAmount ?? entry?.totalAmount ?? entry?.amount ?? 0),
    status: entry?.betStatus ?? entry?.status ?? entry?.gameStatus ?? "-",
    gameStatus: entry?.gameStatus ?? entry?.status ?? "-",
    betStatus: entry?.betStatus ?? entry?.status ?? null,
    betNumbers: betNumbers || "-",
    items: items.map((item: any) => ({
      ...item,
      enteredAmount: Number(item?.enteredAmount ?? item?.amount ?? 0),
      discountPct: Number(item?.discountPct ?? 0),
      discountAmount: Number(item?.discountAmount ?? 0),
      payableAmount: Number(item?.payableAmount ?? item?.amount ?? 0),
    })),
  };
};

const normalizeMarketListResponse = (response: ApiResponse<any>) => {
  const markets = Array.isArray(response?.data?.markets)
    ? response.data.markets
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const normalizedMarkets = sortMarketsByOldest(markets.map(normalizeMarket));

  if (Array.isArray(response?.data)) {
    return {
      ...response,
      data: normalizedMarkets,
    };
  }

  if (response?.data && typeof response.data === "object") {
    return {
      ...response,
      data: {
        ...response.data,
        markets: normalizedMarkets,
      },
    };
  }

  return response;
};


export const KalyanAdminService = {
  // ─── Markets ───────────────────────────────────────────────────────────────
  getMarkets: async (params?: MarketFilterParams) => {
    const q = new URLSearchParams({
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.status ? { status: params.status } : {}),
    }).toString();
    const path = q ? `${BASE}/markets?${q}` : `${BASE}/markets`;
    const res = await api.get<ApiResponse<any>>(path);
    return normalizeMarketListResponse(res.data);
  },

  getMarket: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/markets/${id}`);
    return {
      ...res.data,
      data: res.data?.data ? normalizeMarket(res.data.data) : res.data?.data,
    };
  },

  createMarket: async (data: {
    name: string;
    openName?: string;
    closeName?: string;
    status: string;
    openTime?: string;
    closeTime?: string;
    sessionType?: "OPEN" | "CLOSE";
  }) => {
    const normalizedName = data.name.trim();
    const normalizedOpenName = data.openName?.trim();
    const normalizedCloseName = data.closeName?.trim();
    const slug = toSlug(normalizedName);
    const sessionType = data.sessionType ?? "OPEN";

    const payloads = [
      compactObject({
        name: normalizedName,
        slug,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        status: data.status,
        openTime: data.openTime,
        closeTime: data.closeTime,
        sessionType,
      }),
      compactObject({
        name: normalizedName,
        slug,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        openMarketName: normalizedOpenName,
        closeMarketName: normalizedCloseName,
        status: data.status,
        openTime: data.openTime,
        closeTime: data.closeTime,
        sessionType,
      }),
      compactObject({
        name: normalizedName,
        slug,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        open: normalizedOpenName,
        close: normalizedCloseName,
        status: data.status,
        openTime: data.openTime,
        closeTime: data.closeTime,
        sessionType,
      }),
      compactObject({
        name: normalizedName,
        marketName: normalizedName,
        slug,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        status: data.status,
        openTime: data.openTime,
        closeTime: data.closeTime,
        sessionType,
      }),
      compactObject({
        name: normalizedName,
        slug,
        status: data.status,
        openTime: data.openTime,
        closeTime: data.closeTime,
        sessionType,
      }),
    ];

    let lastError: unknown;

    for (const payload of payloads) {
      try {
        const res = await api.post<ApiResponse<any>>(`${BASE}/markets`, payload);
        return {
          ...res.data,
          data: res.data?.data ? normalizeMarket(res.data.data) : res.data?.data,
        };
      } catch (error) {
        lastError = error;
        if ((error as { response?: { status?: number } })?.response?.status !== 400) {
          throw error;
        }
      }
    }

    throw lastError;
  },

  updateMarket: async (
    id: string,
    data: {
      name?: string;
      openName?: string;
      closeName?: string;
      sessionType?: "OPEN" | "CLOSE";
      status?: string;
    },
  ) => {
    const normalizedName = data.name?.trim();
    const normalizedOpenName = data.openName?.trim();
    const normalizedCloseName = data.closeName?.trim();
    const payloads = [
      compactObject({
        name: normalizedName,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        sessionType: data.sessionType,
        status: data.status,
      }),
      compactObject({
        name: normalizedName,
        openMarketName: normalizedOpenName,
        closeMarketName: normalizedCloseName,
        sessionType: data.sessionType,
        status: data.status,
      }),
      compactObject({
        name: normalizedName,
        marketName: normalizedName,
        sessionType: data.sessionType,
        status: data.status,
      }),
      compactObject({
        name: normalizedName,
        openName: normalizedOpenName,
        closeName: normalizedCloseName,
        sessionType: data.sessionType,
        status: data.status,
      }),
    ];

    let lastError: unknown;

    for (const payload of payloads) {
      try {
        const res = await api.patch<ApiResponse<any>>(`${BASE}/markets/${id}`, payload);
        return {
          ...res.data,
          data: res.data?.data ? normalizeMarket(res.data.data) : res.data?.data,
        };
      } catch (error) {
        lastError = error;
        if ((error as { response?: { status?: number } })?.response?.status !== 400) {
          throw error;
        }
      }
    }

    throw lastError;
  },

  deleteMarket: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`${BASE}/markets/${id}`);
    return res.data;
  },

  // ─── Market Timing ─────────────────────────────────────────────────────────
  getMarketTiming: async (marketId: string) => {
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/markets/${marketId}/timing`,
    );
    const market = await KalyanAdminService.getMarket(marketId).catch(() => null);
    const marketData = market?.data;
    const timingData = Array.isArray(res.data?.data)
      ? res.data.data.map((item: any) => normalizeTiming(item, marketData))
      : res.data?.data
        ? normalizeTiming(res.data.data, marketData)
        : res.data?.data;

    return {
      ...res.data,
      data: timingData,
    };
  },

  setMarketTiming: async (
    marketId: string,
      data: {
        sessionType: string;
        openTime: string;
        closeTime: string;
        status: string;
      },
  ) => {
    const res = await api.put<ApiResponse<any>>(
      `${BASE}/markets/${marketId}/timing`,
      compactObject({
        sessionType: data.sessionType,
        openTime: data.openTime,
        closeTime: data.closeTime,
        status: data.status,
      }),
    );
    return res.data;
  },


  // ─── Results ───────────────────────────────────────────────────────────────
  getResults: async (params?: ResultFilterParams) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.marketId ? { marketId: params.marketId } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.date ? { date: params.date } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`${BASE}/results?${q}`);
    return res.data;
  },

  getResult: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/results/${id}`);
    return res.data;
  },

  createResult: async (data: {
    marketId: string;
    resultDate: string;
    openPatti: string;
    closePatti: string;
  }) => {
    const res = await api.post<ApiResponse<any>>(`${BASE}/results`, data);
    return res.data;
  },

  updateResult: async (
    id: string,
    data: {
      resultDate?: string;
      openPatti?: string;
      closePatti?: string;
    },
  ) => {
    const res = await api.patch<ApiResponse<any>>(`${BASE}/results/${id}`, data);
    return res.data;
  },

  cancelResult: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/results/${id}/cancel`,
    );
    return res.data;
  },
  cancelResultByMarket: async (data: {
    marketId: string;
    resultDate: string;
  }) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/results/cancel-by-market`,
      data,
    );
    return res.data;
  },

  getCancelableRounds: async (params?: {
    date?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.date ? { date: params.date } : {}),
    });
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/results/cancelable-rounds?${q}`,
    );
    return res.data;
  },

  // ─── Entries (Admin) ───────────────────────────────────────────────────────
  getAdminEntries: async (params?: EntryFilterParams) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.marketId ? { marketId: params.marketId } : {}),
      ...(params?.sessionType ? { sessionType: params.sessionType } : {}),
      ...(params?.playType ? { playType: params.playType } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.date ? { date: params.date } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`${BASE}/entries/admin?${q}`);
    const entries = Array.isArray(res.data?.data?.entries)
      ? res.data.data.entries.map(normalizeAdminEntry)
      : Array.isArray(res.data?.data)
        ? res.data.data.map(normalizeAdminEntry)
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

  updateEntryItem: async (
    id: string,
    data: {
      selectedNumber?: string;
      amount?: number;
      balanceAdjustment?: number;
      note?: string;
    },
  ) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/entries/items/${id}`,
      data,
    );
    return res.data;
  },

  cancelEntrySlip: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/entries/${id}/cancel`,
      { status: "CANCELLED" },
    );
    return res.data;
  },

  removeEntrySlip: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/entries/${id}/remove`,
      { status: "REMOVED" },
    );
    return res.data;
  },

  // ─── Rates (placeholder — backend endpoint TBD) ────────────────────────────
  getRates: async (): Promise<ApiResponse<any>> => {
    try {
      const res = await api.get<ApiResponse<any>>(`${BASE}/rates`);
      return {
        ...res.data,
        data: normalizeKalyanRates(
          Array.isArray(res.data?.data) ? res.data.data : [],
        ),
      };
    } catch {
      return {
        success: true,
        message: "ok",
        data: DEFAULT_KALYAN_RATES,
      };
    }
  },

  updateRate: async (
    playType: string,
    data: { rate: number; status: string },
  ): Promise<ApiResponse<any>> => {
    const endpoint = `${BASE}/rates/${playType}`;
    const payloads = [
      {
        multiplier: data.rate,
        commissionPct: 0,
        minBetAmount: 1,
        maxBetAmount: 10000,
        isActive: data.status === "ACTIVE",
      },
      {
        multiplier: data.rate,
        isActive: data.status === "ACTIVE",
      },
      { rate: data.rate, status: data.status },
      { multiplier: data.rate, status: data.status },
      { multiplier: data.rate },
      { rate: data.rate },
    ];

    let lastError: unknown;

    for (const payload of payloads) {
      try {
        const res = await api.patch<ApiResponse<any>>(endpoint, payload);
        return res.data;
      } catch (error) {
        lastError = error;

        if ((error as { response?: { status?: number } })?.response?.status !== 400) {
          throw error;
        }
      }
    }

    throw lastError;
  },

  // ─── History (placeholders — backend endpoints TBD) ───────────────────────
  getRemoveHistory: async (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
    });
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/entries/remove-history?${q}`,
    );
    return res.data;
  },

  getCancelHistory: async (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
    });
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/entries/cancel-history?${q}`,
    );
    return res.data;
  },

  getEditHistory: async (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
    });
    const res = await api.get<ApiResponse<any>>(
      `${BASE}/entries/edit-history?${q}`,
    );
    return res.data;
  },

  getDiscountSettings: async () => {
    const res = await api.get<ApiResponse<any>>(`${BASE}/admin/discount`);
    return res.data;
  },

  updateDiscountSetting: async (payload: {
    playType: string;
    baseDiscountPct: number;
  }) => {
    const res = await api.patch<ApiResponse<any>>(
      `${BASE}/admin/discount`,
      payload,
    );
    return res.data;
  },
};
