/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Trophy } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import {
  getKalyanMarketBaseName,
  getKalyanMarketSessionOptionLabel,
  normalizeKalyanMarketText,
} from "@/lib/kalyan-market-display";

const LIMIT = 20;

function normalizeText(value?: string) {
  return normalizeKalyanMarketText(value);
}

function getGameName(result: any) {
  if (result?.market) {
    return getKalyanMarketBaseName(result.market) || "-";
  }

  return normalizeText(
    result?.title ??
      result?.gameName ??
      result?.marketName ??
      result?.marketId,
  ) || "-";
}

function hasOpenResult(result: any) {
  return !!result?.openPatti && result.openPatti !== "000";
}

function hasCloseResult(result: any) {
  return !!result?.closePatti && result.closePatti !== "000";
}

function getOpenDigit(result: any) {
  if (result?.openPatti && result.openPatti !== "000") {
    const sum = String(result.openPatti)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result?.openTotal !== undefined && result?.openTotal !== null) {
    return String(result.openTotal);
  }

  return result?.finalResult?.[0] ?? "";
}

function getCloseDigit(result: any) {
  if (result?.closePatti && result.closePatti !== "000") {
    const sum = String(result.closePatti)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result?.closeTotal !== undefined && result?.closeTotal !== null) {
    return String(result.closeTotal);
  }

  return result?.finalResult?.[1] ?? "";
}

function buildResultText(result: any) {
  const openReady = hasOpenResult(result);
  const closeReady = hasCloseResult(result);
  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (openReady && closeReady) {
    return `${result.openPatti}-${openDigit}${closeDigit}-${result.closePatti}`;
  }

  if (openReady) {
    return `${result.openPatti}-${openDigit || "X"}X-XXX`;
  }

  if (closeReady) {
    return `XXX-X${closeDigit || "X"}-${result.closePatti}`;
  }

  return "Loading...";
}

function inferPattiType(value?: string | null) {
  const normalized = String(value ?? "").trim();

  if (!/^\d{3}$/.test(normalized) || normalized === "000") return "";

  const uniqueCount = new Set(normalized.split("")).size;
  if (uniqueCount === 3) return "Single Patti";
  if (uniqueCount === 2) return "Double Patti";
  if (uniqueCount === 1) return "Triple Patti";
  return "";
}

function getPattiLabel(result: any) {
  const labels = [
    inferPattiType(result?.openPatti),
    inferPattiType(result?.closePatti),
  ].filter(Boolean);

  return [...new Set(labels)].join(" / ") || "-";
}

function getJoriLabel(result: any) {
  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (hasOpenResult(result) && hasCloseResult(result)) {
    return `${openDigit}${closeDigit}`;
  }

  if (hasOpenResult(result)) {
    return `${openDigit || "X"}X`;
  }

  if (hasCloseResult(result)) {
    return `X${closeDigit || "X"}`;
  }

  return "Loading...";
}

function getTotalLabel(result: any) {
  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (hasOpenResult(result) && hasCloseResult(result)) {
    return `${openDigit}-${closeDigit}`;
  }

  if (hasOpenResult(result)) {
    return `${openDigit || "X"}-X`;
  }

  if (hasCloseResult(result)) {
    return `X-${closeDigit || "X"}`;
  }

  return "Loading...";
}

function getGhorLabel(result: any) {
  const open = hasOpenResult(result) ? result.openPatti : "XXX";
  const close = hasCloseResult(result) ? result.closePatti : "XXX";
  return `${open} / ${close}`;
}

function formatDateLabel(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriority(result: any) {
  const openReady = hasOpenResult(result);
  const closeReady = hasCloseResult(result);

  if (openReady && closeReady) return 0;
  if (openReady || closeReady) return 1;
  return 2;
}

export default function KalyanViewResultsPage() {
  const [marketFilter, setMarketFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailResult, setDetailResult] = useState<any | null>(null);

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-results", marketFilter, statusFilter, dateFilter, page],
    queryFn: () =>
      KalyanAdminService.getResults({
        marketId: marketFilter || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const markets: any[] = Array.from(
    new Map(
      (marketsData?.data?.markets ?? marketsData?.data ?? []).map((m: any) => [
        (m.name ?? m.marketName ?? m.title ?? "").trim().toLowerCase(),
        m,
      ])
    ).values()
  );
  const rawResults = useMemo<any[]>(
    () => data?.data?.results ?? data?.data ?? [],
    [data],
  );

  const results = useMemo(() => {
    const groupedMap = new Map<string, any>();

    for (const item of rawResults) {
      const dateKey = item?.resultDate ?? item?.createdAt ?? "unknown";
      const nameKey = getGameName(item).toLowerCase();
      const groupKey = `${dateKey}::${nameKey}`;
      const existing = groupedMap.get(groupKey);

      if (!existing) {
        groupedMap.set(groupKey, {
          ...item,
          title: getGameName(item),
          sourceIds: [item.id],
        });
        continue;
      }

      groupedMap.set(groupKey, {
        ...existing,
        title: existing.title || getGameName(item),
        sourceIds: [...new Set([...(existing.sourceIds ?? []), item.id])],
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

      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      return getGameName(a).localeCompare(getGameName(b));
    });
  }, [rawResults]);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
            <Trophy className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">View Results</h1>
            <p className="text-xs text-slate-400">Public result board in table format</p>
          </div>
        </div>
        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          {total} Records
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={marketFilter}
          onChange={(event) => {
            setMarketFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-green-500"
        >
          <option value="">All Games</option>
          {markets.map((market: any) => (
            <option key={market.id} value={market.id}>
              {getKalyanMarketSessionOptionLabel(market)}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-green-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-green-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/45 shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="bg-slate-800/95 text-left">
                {["SI", "Date", "Games Name", "Patti", "Result", "Jori", "Total", "Open/Close", "Status", "Actions"].map((heading) => (
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
              {isLoading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-700/50">
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    No results found.
                  </td>
                </tr>
              ) : (
                results.map((result: any, index: number) => {
                  const resultText = buildResultText(result);
                  const pattiLabel = getPattiLabel(result);
                  const joriLabel = getJoriLabel(result);
                  const totalLabel = getTotalLabel(result);
                  const ghorLabel = getGhorLabel(result);

                  return (
                    <tr
                      key={`${result.resultDate}-${getGameName(result)}-${index}`}
                      className="border-b border-slate-700/50 bg-slate-900/20 transition-colors hover:bg-slate-800/45"
                    >
                      <td className="border-r border-slate-700/40 px-4 py-4 text-xs font-semibold text-slate-400 last:border-r-0">
                        {(page - 1) * LIMIT + index + 1}
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">
                            {formatDateLabel(result.resultDate)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(result.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <p className="bg-gradient-to-r from-sky-200 via-white to-emerald-200 bg-clip-text text-sm font-black uppercase italic tracking-[0.04em] text-transparent">
                          {getGameName(result)}
                        </p>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <span className="inline-flex rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                          {pattiLabel}
                        </span>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <p className="font-mono text-base font-black tracking-[0.03em] text-amber-300">
                          {resultText}
                        </p>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <span className="inline-flex min-w-[92px] justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-200">
                          {joriLabel}
                        </span>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <span className="inline-flex min-w-[78px] justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
                          {totalLabel}
                        </span>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <span className="inline-flex min-w-[130px] justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 font-mono text-xs font-bold tracking-[0.08em] text-violet-200">
                          {ghorLabel}
                        </span>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            result.status === "PUBLISHED"
                              ? "border-green-500/30 bg-green-500/10 text-green-300"
                              : result.status === "CANCELLED"
                                ? "border-red-500/30 bg-red-500/10 text-red-300"
                                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                          }`}
                        >
                          {result.status ?? "PENDING"}
                        </span>
                      </td>
                      <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <button
                          type="button"
                          onClick={() => setDetailResult(result)}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-[11px] font-semibold text-green-300 transition-colors hover:bg-green-500/20"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {detailResult ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDetailResult(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Result Details</h2>
              <button
                type="button"
                onClick={() => setDetailResult(null)}
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              {[
                ["Games Name", getGameName(detailResult)],
                ["Result Date", formatDateLabel(detailResult.resultDate)],
                ["Date Time", formatDateTime(detailResult.createdAt)],
                ["Patti", getPattiLabel(detailResult)],
                ["Jori", getJoriLabel(detailResult)],
                ["Total", getTotalLabel(detailResult)],
                ["Open/Close", getGhorLabel(detailResult)],
                ["Result", buildResultText(detailResult)],
                ["Open Patti", detailResult.openPatti ?? "XXX"],
                ["Close Patti", detailResult.closePatti ?? "XXX"],
                ["Status", detailResult.status ?? "PENDING"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-right font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
