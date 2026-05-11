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

  const resolveDisplayDate = (item: Record<string, unknown>) =>
    String(
      item.publicResultPublishedAt ??
        item.resultedAt ??
        item.drawDate ??
        "",
    );

  return rounds.map((item, index) => ({
    id: String(item.id ?? `own-${index}`),
    drawDate: resolveDisplayDate(item),
    drawLabel: resolveDisplayDate(item),
    firstPrize: "",
    firstThreeDigits: [],
    lastThreeDigits: [],
    lastTwoDigits: "",
    threeUpDirect: String(item.publicResultThreeUpDirect ?? ""),
    downDirect: String(item.publicResultDownDirect ?? ""),
  })).sort((a, b) => {
    const aTime = Date.parse(a.drawDate || "");
    const bTime = Date.parse(b.drawDate || "");

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }

    return bTime - aTime;
  });
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
