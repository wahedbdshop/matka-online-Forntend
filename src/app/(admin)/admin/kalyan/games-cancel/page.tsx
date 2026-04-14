/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { getCurrentUtcMinutes } from "@/lib/timezone";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const LIMIT = 20;

function formatDateLabel(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function normalizeGameName(value?: string) {
  const normalized = String(value ?? "")
    .replace(/\bopen\b/gi, "")
    .replace(/\bclose\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "Unknown Game";
}

function getSessionLabel(round: any) {
  const rawValue =
    round?.sessionType ??
    round?.roundType ??
    round?.gameSession ??
    round?.session;

  const normalized = String(rawValue ?? "").trim().toUpperCase();

  if (normalized === "OPEN") return "Open";
  if (normalized === "CLOSE") return "Close";

  return "-";
}

function getDisplayGameName(round: any) {
  const rawGameName = String(round.gameName ?? "").trim();
  if (/\b(open|close)\b/i.test(rawGameName)) {
    return rawGameName.replace(/\s+/g, " ").trim();
  }

  const baseName = normalizeGameName(round.baseGameName ?? round.gameName);
  const session = getSessionLabel(round);

  if (session === "Open" || session === "Close") {
    return `${baseName} ${session}`;
  }

  return normalizeGameName(round.gameName ?? round.baseGameName);
}

function toDhakaDateISO(date: Date) {
  // Bangladesh = UTC+6
  const dhakaOffset = 6 * 60;
  const localOffset = date.getTimezoneOffset(); // minutes behind UTC
  const dhaka = new Date(date.getTime() + (dhakaOffset + localOffset) * 60_000);
  const year = dhaka.getFullYear();
  const month = String(dhaka.getMonth() + 1).padStart(2, "0");
  const day = String(dhaka.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return toDhakaDateISO(new Date());
}

function entryResultDateISO(value?: string | null) {
  if (!value) return "";
  // If already a plain date like "2026-04-13", use directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  // Otherwise parse as UTC and convert to Dhaka date
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return toDhakaDateISO(parsed);
}

function getMinutesFromTime(value?: string | null) {
  if (!value) return null;

  const [hoursText = "0", minutesText = "0"] = String(value).split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getNormalizedStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function isActiveEntity(value: unknown) {
  return getNormalizedStatus(value) === "ACTIVE";
}

function isRemovedOrCancelled(value: unknown) {
  const normalized = getNormalizedStatus(value);
  return normalized === "CANCELLED" || normalized === "CANCEL" || normalized === "REMOVED";
}

function isSessionPublished(result: any, sessionType: "OPEN" | "CLOSE") {
  if (!result) return false;

  const normalizedResultSession = getNormalizedStatus(result?.sessionType);

  if (normalizedResultSession === sessionType) {
    if (typeof result?.isPublished === "boolean") return result.isPublished;

    const status = getNormalizedStatus(result?.status);
    if (status === "PUBLISHED" || status === "ACTIVE" || status === "COMPLETED") {
      return true;
    }
  }

  if (sessionType === "OPEN") {
    return !!result?.openPatti && result.openPatti !== "000";
  }

  return !!result?.closePatti && result.closePatti !== "000";
}

function findSessionResult(publishedResults: any[], marketId: string, sessionType: "OPEN" | "CLOSE") {
  return publishedResults.find((result: any) => {
    if (result?.marketId !== marketId) return false;

    const normalizedResultSession = getNormalizedStatus(result?.sessionType);
    if (normalizedResultSession === sessionType) return true;

    if (!normalizedResultSession) {
      if (sessionType === "OPEN") return !!result?.openPatti && result.openPatti !== "000";
      return !!result?.closePatti && result.closePatti !== "000";
    }

    return false;
  });
}

function resolveEntrySessionType(entry: any): "OPEN" | "CLOSE" | undefined {
  const normalized = getNormalizedStatus(
    entry?.sessionType ?? entry?.session ?? entry?.market?.sessionType,
  );

  if (normalized === "OPEN" || normalized === "CLOSE") {
    return normalized;
  }

  return undefined;
}

export default function KalyanGamesCancelPage() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<string>(todayISO);
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-cancelable-rounds", dateFilter, page],
    queryFn: () =>
      KalyanAdminService.getCancelableRounds({
        date: dateFilter,
        page,
        limit: LIMIT,
      }),
  });
  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });
  const { data: resultsData } = useQuery({
    queryKey: ["kalyan-results-for-cancel", dateFilter],
    queryFn: () =>
      KalyanAdminService.getResults({
        date: dateFilter || undefined,
        page: 1,
        limit: 200,
      }),
    enabled: !!dateFilter,
  });
  const { data: entriesData, isLoading: isEntriesLoading } = useQuery({
    queryKey: ["kalyan-entries-for-cancel", dateFilter],
    queryFn: () =>
      KalyanAdminService.getAdminEntries({
        date: dateFilter || undefined,
        page: 1,
        limit: 1000,
      }),
    enabled: !!dateFilter,
  });

  const rounds = useMemo<any[]>(
    () =>
      Array.isArray(data?.data?.rounds)
        ? data.data.rounds
        : Array.isArray(data?.data)
          ? data.data
          : [],
    [data],
  );
  const markets = useMemo<any[]>(
    () => marketsData?.data?.markets ?? marketsData?.data ?? [],
    [marketsData],
  );
  const publishedResults = useMemo<any[]>(
    () => resultsData?.data?.results ?? resultsData?.data ?? [],
    [resultsData],
  );
  const entries = useMemo<any[]>(
    () => entriesData?.data?.entries ?? entriesData?.data ?? [],
    [entriesData],
  );
  const timingQueries = useQueries({
    queries: markets.map((market: any) => ({
      queryKey: ["kalyan-timing", market.id],
      queryFn: () => KalyanAdminService.getMarketTiming(market.id),
      enabled: !!market.id,
    })),
  });
  const timingOptionsByMarketId = useMemo(
    () =>
      new Map(
        markets.map((market: any, index: number) => {
          const timingData = timingQueries[index]?.data;
          const timings = Array.isArray(timingData?.data)
            ? timingData.data
            : timingData?.data
              ? [timingData.data]
              : [];

          return [market.id, timings];
        }),
      ),
    [markets, timingQueries],
  );
  const fallbackRounds = useMemo<any[]>(() => {
    if (!dateFilter) return [];

    const selectedDate = dateFilter;
    const isToday = selectedDate === todayISO();
    const currentMinutes = isToday
      ? getCurrentUtcMinutes()
      : Number.POSITIVE_INFINITY;
    const entryCountBySession = new Map<string, number>();

    entries.forEach((entry: any) => {
      const marketId = String(entry?.marketId ?? entry?.market?.id ?? "");
      const sessionType = resolveEntrySessionType(entry);
      const resultDate = entryResultDateISO(entry?.resultDate);

      if (!marketId || !sessionType || resultDate !== selectedDate) {
        return;
      }

      if (
        isRemovedOrCancelled(entry?.gameStatus) ||
        isRemovedOrCancelled(entry?.status) ||
        entry?.isRemoved === true ||
        Boolean(entry?.removedAt)
      ) {
        return;
      }

      const items = Array.isArray(entry?.items) ? entry.items : [];
      const hasActiveItems =
        items.length === 0 ||
        items.some(
          (item: any) =>
            !isRemovedOrCancelled(item?.gameStatus) &&
            !isRemovedOrCancelled(item?.status) &&
            item?.isRemoved !== true &&
            !item?.removedAt,
        );

      if (!hasActiveItems) {
        return;
      }

      const key = `${marketId}::${sessionType}`;
      entryCountBySession.set(key, (entryCountBySession.get(key) ?? 0) + 1);
    });

    const resolvedRounds = markets.flatMap((market: any) => {
      if (!isActiveEntity(market?.status)) {
        return [];
      }

      const timings = timingOptionsByMarketId.get(market.id) ?? [];
      const sessions =
        timings.length > 0
          ? timings
          : [
              {
                marketId: market.id,
                sessionType: "OPEN",
                gameName: market.openName ?? market.name,
                closeTime: market.openTime ?? market.closeTime,
                status: market.status,
              },
              {
                marketId: market.id,
                sessionType: "CLOSE",
                gameName: market.closeName ?? market.name,
                closeTime: market.closeTime ?? market.openTime,
                status: market.status,
              },
            ];

      return sessions.flatMap((session: any) => {
        const sessionType = getNormalizedStatus(session?.sessionType);

        if (
          !isActiveEntity(session?.status ?? market?.status) ||
          (sessionType !== "OPEN" && sessionType !== "CLOSE")
        ) {
          return [];
        }

        const entryKey = `${market.id}::${sessionType}`;
        const entryCount = entryCountBySession.get(entryKey) ?? 0;
        if (entryCount <= 0) {
          return [];
        }

        const closeTime = getMinutesFromTime(session?.closeTime);
        if (isToday && closeTime !== null && currentMinutes < closeTime) {
          return [];
        }

        const publishedResult = findSessionResult(
          publishedResults,
          market.id,
          sessionType as "OPEN" | "CLOSE",
        );
        if (isSessionPublished(publishedResult, sessionType as "OPEN" | "CLOSE")) {
          return [];
        }

        const gameName =
          session?.gameName ??
          (sessionType === "CLOSE" ? market.closeName : market.openName) ??
          market.name;

        return [
          {
            marketId: market.id,
            resultDate: selectedDate,
            gameName,
            baseGameName:
              (sessionType === "CLOSE" ? market.closeName : market.openName) ??
              market.name ??
              gameName,
            sessionType,
            entryCount,
            canCancel: true,
          },
        ];
      });
    });

    return resolvedRounds.sort((left: any, right: any) =>
      String(left?.gameName ?? "").localeCompare(String(right?.gameName ?? "")),
    );
  }, [dateFilter, entries, markets, publishedResults, timingOptionsByMarketId]);
  const marketById = useMemo(
    () => new Map(markets.map((m: any) => [String(m.id), m])),
    [markets],
  );

  const displayRounds = useMemo(() => {
    if (rounds.length > 0) {
      return rounds.map((round: any) => {
        if (round.gameName) return round;

        const market = marketById.get(String(round.marketId ?? ""));
        const sessionType = getNormalizedStatus(round.sessionType);
        const gameName =
          (sessionType === "CLOSE" ? market?.closeName : market?.openName) ??
          market?.name ??
          round.marketName ??
          round.name ??
          "Unknown Game";

        return {
          ...round,
          gameName,
          baseGameName: gameName,
        };
      });
    }

    const start = (page - 1) * LIMIT;
    return fallbackRounds.slice(start, start + LIMIT);
  }, [fallbackRounds, marketById, page, rounds]);

  const total = rounds.length > 0 ? data?.data?.total ?? rounds.length : fallbackRounds.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: (payload: { marketId: string; resultDate: string }) =>
      KalyanAdminService.cancelResultByMarket(payload),
    onSuccess: () => {
      toast.success("Game cancelled and refund processed");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-cancelable-rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-results-for-cancel"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-entries-for-cancel"] });
      setConfirmTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cancel failed");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15">
          <XCircle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Games Cancel</h1>
          <p className="text-xs text-slate-400">Cancelable played rounds with auto refund support.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value || todayISO());
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
        />
        <button
          type="button"
          onClick={() => {
            setDateFilter(todayISO());
            setPage(1);
          }}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            dateFilter === todayISO()
              ? "border-red-500/50 bg-red-500/15 text-red-300"
              : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Today&apos;s Games
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/45 shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-sm">
            <thead>
              <tr className="bg-slate-800/95 text-left">
                {["SI", "Games Name", "Date", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="border-r border-slate-700/70 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 last:border-r-0"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || isEntriesLoading ? (
                <>
                  <tr>
                    <td colSpan={4} className="border-b border-slate-700/50 px-4 py-2 text-center text-[11px] text-slate-500">
                      Loading {dateFilter === todayISO() ? "today's" : formatDateLabel(dateFilter)} cancelable games...
                    </td>
                  </tr>
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-700/50">
                      {Array.from({ length: 4 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                          <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : displayRounds.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-400">
                      {dateFilter === todayISO()
                        ? "No played games are available to cancel yet today."
                        : `No played games are available to cancel for ${formatDateLabel(dateFilter)}.`}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Already published results are excluded automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRounds.map((round: any, index: number) => (
                  <tr
                    key={`${round.marketId}-${round.sessionType ?? "NA"}-${round.resultDate}`}
                    className="border-b border-slate-700/50 bg-slate-900/20 transition-colors hover:bg-slate-800/45"
                  >
                    <td className="border-r border-slate-700/40 px-4 py-4 text-xs font-semibold text-slate-400 last:border-r-0">
                      {(page - 1) * LIMIT + index + 1}
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 font-semibold text-white last:border-r-0">
                      <div className="space-y-1">
                        <p>{getDisplayGameName(round)}</p>
                        <p className="text-[11px] text-slate-400">Played slips: {round.entryCount ?? 0}</p>
                      </div>
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 text-sm text-slate-300 last:border-r-0">
                      {formatDateLabel(round.resultDate)}
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(round)}
                        disabled={!round.canCancel}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {confirmTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-bold text-white">Confirm Cancel</h2>
              <p className="mt-1 text-xs text-slate-400">
                Cancel game{" "}
                <span className="font-semibold text-white">
                  {normalizeGameName(confirmTarget.baseGameName ?? confirmTarget.gameName)}
                </span>{" "}
                on {formatDateLabel(confirmTarget.resultDate)}?
              </p>
              <p className="mt-1 text-[10px] text-red-400">
                This will cancel the game and refund all active played amounts.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={() =>
                  cancel({
                    marketId: confirmTarget.marketId,
                    resultDate: confirmTarget.resultDate,
                  })
                }
                disabled={isPending || !confirmTarget.canCancel}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
