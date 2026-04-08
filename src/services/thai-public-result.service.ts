import { ThaiLotteryUserService } from "@/services/thai-lottery.service";

export interface ThaiResultRow {
  id: string;
  drawDate: string;
  drawLabel?: string;
  firstPrize?: string;
  firstThreeDigits: string[];
  lastThreeDigits: string[];
  lastTwoDigits?: string;
  threeUpDirect?: string;
  downDirect?: string;
}

export interface ThaiResultFeed {
  rows: ThaiResultRow[];
  total: number;
  sourceLabel: string;
  fallbackActive: boolean;
}

function normalizeOwnRows(payload: unknown) {
  const rounds =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { rounds?: unknown[] }).rounds)
      ? ((payload as { rounds: Array<Record<string, unknown>> }).rounds ?? [])
      : [];

  return rounds.map((item, index) => ({
    id: String(item.id ?? `own-${index}`),
    drawDate: String(item.drawDate ?? item.resultedAt ?? ""),
    drawLabel: String(item.drawDate ?? item.resultedAt ?? ""),
    firstPrize: "",
    firstThreeDigits: [],
    lastThreeDigits: [],
    lastTwoDigits: "",
    threeUpDirect: String(item.publicResultThreeUpDirect ?? ""),
    downDirect: String(item.publicResultDownDirect ?? ""),
  }));
}

export const ThaiPublicResultService = {
  async getFeed(page = 1, limit = 20): Promise<ThaiResultFeed> {
    const own = await ThaiLotteryUserService.getPreviousResults(page, limit);
    const rows = normalizeOwnRows(own.data);

    return {
      rows,
      total:
        typeof own.data?.total === "number"
          ? own.data.total
          : rows.length,
      sourceLabel: "Own API",
      fallbackActive: false,
    };
  },
};
