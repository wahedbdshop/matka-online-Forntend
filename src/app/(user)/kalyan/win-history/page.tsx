"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { EntrySlip, PlayType, Rate, PLAY_TYPE_LABEL } from "@/types/kalyan";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { LoadingState } from "@/components/kalyan/user/LoadingState";
import { ErrorState } from "@/components/kalyan/user/ErrorState";
import { EmptyState } from "@/components/kalyan/user/EmptyState";

function formatDateTime(value?: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWinAmount(entry: EntrySlip, item?: Record<string, unknown>) {
  const itemWinAmount =
    item?.winningAmount ??
    item?.winAmount ??
    item?.payoutAmount ??
    item?.profitAmount;
  const entryWinAmount =
    (entry as EntrySlip & Record<string, unknown>).winningAmount ??
    (entry as EntrySlip & Record<string, unknown>).winAmount ??
    (entry as EntrySlip & Record<string, unknown>).payoutAmount ??
    (entry as EntrySlip & Record<string, unknown>).profitAmount;

  return Number(itemWinAmount ?? entryWinAmount ?? 0);
}

function inferPlayType(value?: string | null): PlayType | undefined {
  const normalized = String(value ?? "").trim();

  if (/^\d$/.test(normalized)) return "GAME_TOTAL";
  if (/^\d{2}$/.test(normalized)) return "JORI";
  if (/^\d{3}$/.test(normalized)) {
    const uniqueCount = new Set(normalized.split("")).size;
    if (uniqueCount === 3) return "SINGLE_PATTI";
    if (uniqueCount === 2) return "DOUBLE_PATTI";
    if (uniqueCount === 1) return "TRIPLE_PATTI";
  }

  return undefined;
}

function getPlayTypeLabel(value?: string | null) {
  if (!value) return "-";
  return PLAY_TYPE_LABEL[value as PlayType] ?? value;
}

function getOutcomeStatus(value: Record<string, unknown> | undefined) {
  return String(value?.betStatus ?? value?.status ?? "").toUpperCase();
}

function calculateWinAmount(
  betAmount: number,
  playType: PlayType | undefined,
  rates: Rate[],
  fallbackWinAmount: number,
) {
  if (fallbackWinAmount > 0) return fallbackWinAmount;

  const matchedRate = rates.find((rate) => rate.playType === playType);
  const payoutRate = Number(matchedRate?.rate ?? 0);

  if (!payoutRate || betAmount <= 0) return 0;

  return Number(((betAmount * payoutRate) / 100).toFixed(2));
}

export default function WinHistoryPage() {
  const [entries, setEntries] = useState<EntrySlip[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("User");

  const fetchWins = useCallback(async (p = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await KalyanUserService.getMyEntries({
        page: p,
        limit: 10,
        status: "WON",
      });
      const data: EntrySlip[] = Array.isArray(res.data) ? res.data : [];
      setEntries((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length === 10);
    } catch {
      setError("Failed to load win history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchWins(1, false);
  }, [fetchWins]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await KalyanUserService.getProfile();
        const user = profileRes?.data;
        const resolvedName =
          user?.name?.trim() ||
          user?.username?.trim() ||
          "User";
        setCurrentUserName(resolvedName);
      } catch {
        setCurrentUserName("User");
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    const loadRates = async () => {
      try {
        const rateRes = await KalyanUserService.getGameRates();
        const nextRates = Array.isArray(rateRes?.data) ? (rateRes.data as Rate[]) : [];
        setRates(nextRates);
      } catch {
        setRates([]);
      }
    };

    void loadRates();
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchWins(next, true);
  };

  const rows = entries.flatMap((entry) => {
    const entryRecord = entry as EntrySlip & Record<string, unknown>;
    const items = Array.isArray(entry.items)
      ? entry.items.filter((item) => getOutcomeStatus(item as unknown as Record<string, unknown>) === "WON")
      : [];
    const userName =
      entry.user?.name?.trim() ||
      entry.user?.username?.trim() ||
      currentUserName;
    const gameName =
      entry.gameName?.trim() ||
      entry.market?.name ||
      `Market #${entry.marketId.slice(-6)}`;

    const sessionType = entry.sessionType ?? (entryRecord.sessionType as string | undefined);

    if (items.length === 0 && getOutcomeStatus(entryRecord) === "WON") {
      const betAmount = Number(entry.totalAmount ?? 0);
      const fallbackWinAmount = getWinAmount(entry);
      const playType = entry.playType;

      return [
        {
          key: `${entry.id}-empty`,
          userName,
          gameName,
          sessionType,
          betNumber: "-",
          playTypeLabel: getPlayTypeLabel(playType),
          betAmount,
          winAmount: calculateWinAmount(betAmount, playType, rates, fallbackWinAmount),
          dateTime: entry.createdAt,
        },
      ];
    }

    if (items.length === 0) {
      return [];
    }

    return items.map((item, index) => {
      const betAmount = Number(item.amount ?? 0);
      const fallbackWinAmount = getWinAmount(entry, item as unknown as Record<string, unknown>);
      const playType = item.playType ?? entry.playType ?? inferPlayType(item.selectedNumber);

      return {
        key: `${entry.id}-${item.id ?? index}`,
        userName,
        gameName,
        sessionType,
        betNumber: item.selectedNumber || "-",
        playTypeLabel: getPlayTypeLabel(playType),
        betAmount,
        winAmount: calculateWinAmount(betAmount, playType, rates, fallbackWinAmount),
        dateTime: item.createdAt ?? entry.createdAt,
      };
    });
  });

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader title="Win History" subtitle="All your winning bets" backHref="/kalyan" />

      {!loading && rows.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-600/20 to-yellow-500/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Your Winning Bets</p>
            <p className="mt-0.5 text-xs text-slate-400">Only bets with status WON are shown here.</p>
          </div>
        </div>
      )}

      {loading && page === 1 && <LoadingState message="Loading wins..." rows={4} />}

      {error && !loading && (
        <ErrorState message={error} onRetry={() => fetchWins(1, false)} />
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="No wins yet"
          description="Your winning bets will appear here once results are published."
        />
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-slate-700/70 dark:bg-slate-900/50 dark:shadow-[0_16px_40px_rgba(15,23,42,0.24)]">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-800/95 dark:text-slate-300">
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">SI</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">No</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">User</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Name</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Games</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Name</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Number</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Play</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Type</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Amount</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Win</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Amount</span>
                    </th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Date</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">&amp; Time</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.key}
                      className="border-b border-slate-200 bg-white text-[9px] text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/25 dark:text-slate-200 dark:hover:bg-slate-800/35 sm:text-[10px]"
                    >
                      <td className="w-[6%] whitespace-nowrap border-r border-slate-200 px-1 py-2 font-semibold text-slate-600 dark:border-slate-700/60 dark:text-slate-300 sm:px-2">
                        {index + 1}
                      </td>
                      <td className="w-[15%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-medium leading-tight text-slate-950 dark:border-slate-700/60 dark:text-white sm:px-2">
                        {row.userName}
                      </td>
                      <td className="w-[18%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-medium leading-tight text-slate-800 dark:border-slate-700/60 dark:text-slate-100 sm:px-2">
                        {row.gameName}
                        {row.sessionType && (
                          <span className={`mt-0.5 block text-[7px] font-semibold uppercase tracking-wide ${row.sessionType === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                            ({row.sessionType})
                          </span>
                        )}
                      </td>
                      <td className="w-[12%] break-all border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight tracking-[0.03em] text-cyan-700 dark:border-slate-700/60 dark:text-cyan-300 sm:px-2">
                        {row.betNumber}
                      </td>
                      <td className="w-[11%] border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight tracking-[0.03em] text-yellow-700 wrap-break-word dark:border-slate-700/60 dark:text-yellow-300 sm:px-2">
                        {row.playTypeLabel}
                      </td>
                      <td className="w-[12%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight text-emerald-700 dark:border-slate-700/60 dark:text-emerald-300 sm:px-2">
                        Rs. {row.betAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="w-[14%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight text-amber-700 dark:border-slate-700/60 dark:text-amber-300 sm:px-2">
                        Rs. {row.winAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="w-[19%] break-words px-1 py-2 text-[8px] leading-tight text-slate-600 dark:text-slate-300 sm:px-2">
                        {formatDateTime(row.dateTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
