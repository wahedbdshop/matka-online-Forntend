/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { PLAY_TYPE_LABEL, ENTRY_STATUS_STYLE, type PlayType } from "@/types/kalyan";
import {
  getKalyanMarketOptionLabel,
  getKalyanMarketSessionLabel,
} from "@/lib/kalyan-market-display";

const LIMIT = 20;
const PLAY_TYPES = Object.keys(PLAY_TYPE_LABEL) as PlayType[];

function isPlayType(value: unknown): value is PlayType {
  return typeof value === "string" && PLAY_TYPES.includes(value as PlayType);
}

function getPlayTypeLabel(value: unknown) {
  return isPlayType(value) ? PLAY_TYPE_LABEL[value] : String(value ?? "-");
}

function resolveGameName(entry: any) {
  if (entry?.market) {
    return getKalyanMarketSessionLabel(entry.market, resolveSessionType(entry));
  }

  return entry?.gameName?.trim?.() || entry?.items?.[0]?.gameName || entry?.marketId || "-";
}

function resolveSessionType(entry: any): "OPEN" | "CLOSE" | undefined {
  const val = entry?.sessionType ?? entry?.session ?? entry?.market?.sessionType;
  if (!val) return undefined;
  const up = String(val).toUpperCase();
  if (up === "OPEN" || up === "CLOSE") return up;
  return undefined;
}

function calculateWinAmount(betAmount: number, playType: unknown, rates: any[]): number {
  const matched = rates.find((r: any) => r.playType === playType);
  const rate = Number(matched?.rate ?? 0);
  if (!rate || betAmount <= 0) return 0;
  return Number(((betAmount * rate) / 100).toFixed(2));
}

function resolvePlayType(entry: any) {
  return entry?.playType || "-";
}

function resolveBetNumber(entry: any) {
  return entry?.betNumbers || entry?.selectedNumber || "-";
}

function isRemovedStatus(value: unknown) {
  return String(value ?? "").toUpperCase() === "REMOVED";
}

function isCancelledStatus(value: unknown) {
  return String(value ?? "").toUpperCase() === "CANCELLED";
}

function getOutcomeStatus(value: any) {
  return String(
    value?.betStatus ??
      value?.status ??
      value?.gameStatus ??
      "",
  ).toUpperCase();
}

function KalyanWinHistoryPageContent() {
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"" | "OPEN" | "CLOSE">("");
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(() => searchParams.get("date") ?? "");
  const [page, setPage] = useState(1);
  const [detailEntry, setDetailEntry] = useState<any>(null);

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data: ratesData } = useQuery({
    queryKey: ["kalyan-rates"],
    queryFn: () => KalyanAdminService.getRates(),
  });
  const rates = useMemo<any[]>(
    () => (Array.isArray(ratesData?.data) ? ratesData.data : []),
    [ratesData],
  );

  const { data, isLoading } = useQuery({
    queryKey: [
      "kalyan-win-history",
      search,
      marketFilter,
      sessionFilter,
      playTypeFilter,
      dateFilter,
      page,
    ],
    queryFn: () =>
      KalyanAdminService.getAdminEntries({
        search: search || undefined,
        marketId: marketFilter || undefined,
        playType: playTypeFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const markets: any[] = Array.from(
    new Map(
      (marketsData?.data?.markets ?? marketsData?.data ?? []).map((m: any) => [
        (m.name ?? m.marketName ?? m.title ?? "").trim().toLowerCase(),
        m,
      ])
    ).values()
  );
  const rawEntries: any[] = Array.isArray(data?.data?.entries)
    ? data.data.entries
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const entries = rawEntries.filter((entry) => {
    const entryStatus = getOutcomeStatus(entry);
    const itemStatuses = Array.isArray(entry?.items)
      ? entry.items.map((item: any) => getOutcomeStatus(item))
      : [];

    return entryStatus === "WON" || itemStatuses.some((status: string) => status === "WON");
  });
  const total = data?.data?.total ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const rows = useMemo(
    () =>
      entries
        .filter((entry: any) => {
          if (!sessionFilter) return true;
          const st = resolveSessionType(entry);
          return st === sessionFilter;
        })
        .flatMap((entry: any) => {
        const sessionType = resolveSessionType(entry);
        const items = (Array.isArray(entry?.items) ? entry.items : []).filter((item: any) => {
          const itemStatus = getOutcomeStatus(item);
          return (
            itemStatus === "WON" &&
            !isRemovedStatus(item?.gameStatus) &&
            !isRemovedStatus(item?.status) &&
            !isCancelledStatus(item?.gameStatus) &&
            !isCancelledStatus(item?.status)
          );
        });

        if (items.length === 0) {
          const betAmount = Number(entry.totalAmount ?? 0);
          const playType = resolvePlayType(entry);
          return [
            {
              key: `${entry.id}-empty`,
              entry,
              userName: entry.user?.name ?? entry.user?.username ?? "-",
              gameName: resolveGameName(entry),
              sessionType,
              category: playType,
              betNumber: resolveBetNumber(entry),
              betAmount,
              winAmount: calculateWinAmount(betAmount, playType, rates),
              status: entry.betStatus ?? entry.status ?? entry.gameStatus ?? "WON",
              dateTime: entry.createdAt,
            },
          ];
        }

        return items.map((item: any, index: number) => {
          const betAmount = Number(item.amount ?? entry.totalAmount ?? 0);
          const playType = item.playType || entry.playType || "-";
          return {
            key: `${entry.id}-${item.id ?? index}`,
            entry,
            userName: entry.user?.name ?? entry.user?.username ?? "-",
            gameName: entry.gameName || resolveGameName(entry),
            sessionType,
            category: playType,
            betNumber: item.selectedNumber || "-",
            betAmount,
            winAmount: calculateWinAmount(betAmount, playType, rates),
            status: item.betStatus ?? item.status ?? item.gameStatus ?? "WON",
            dateTime: item.createdAt ?? entry.createdAt,
          };
        });
        })
        .sort((left, right) => {
          const rightTime = right?.dateTime ? new Date(right.dateTime).getTime() : 0;
          const leftTime = left?.dateTime ? new Date(left.dateTime).getTime() : 0;

          if (rightTime !== leftTime) {
            return rightTime - leftTime;
          }

          return String(right?.gameName ?? "").localeCompare(String(left?.gameName ?? ""));
        }),
    [entries, rates],
  );

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/15">
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Win History</h1>
            <p className="text-xs text-slate-400">All winning Kalyan bets</p>
          </div>
        </div>
        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
          {total} Records
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Search user..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="w-44 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-yellow-500"
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-300" />
          </button>
        </div>

        <select
          value={marketFilter}
          onChange={(e) => {
            const [mid, session] = e.target.value.split(":");
            setMarketFilter(mid);
            setSessionFilter((session as "" | "OPEN" | "CLOSE") || "");
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Markets</option>
          {markets.map((market: any) => {
            const baseName = getKalyanMarketOptionLabel(market);
            return [
              <option key={`${market.id}:OPEN`} value={`${market.id}:OPEN`}>
                {baseName} — Open
              </option>,
              <option key={`${market.id}:CLOSE`} value={`${market.id}:CLOSE`}>
                {baseName} — Close
              </option>,
            ];
          })}
        </select>

        <select
          value={playTypeFilter}
          onChange={(e) => {
            setPlayTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(PLAY_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-800/55 overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {[
                "SI.No",
                "User Name",
                "Games Name",
                "Category",
                "Bet Number",
                "Bet Amount",
                "Win Amount",
                "Status",
                "Date Time",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-r border-slate-700/50 px-4 py-3 text-center text-xs font-medium text-slate-400 last:border-r-0"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-700/50">
                  {Array.from({ length: 9 }).map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0"
                    >
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No winning entries found
                </td>
              </tr>
            ) : (
              rows.map((row: any, index: number) => (
                <tr
                  key={row.key}
                  onClick={() => setDetailEntry(row.entry)}
                  className="cursor-pointer border-b border-slate-700/50 transition-colors hover:bg-slate-700/20"
                >
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">
                    {(page - 1) * LIMIT + index + 1}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-medium text-white last:border-r-0">
                    {row.userName}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-300 last:border-r-0">
                    {row.gameName}
                    {row.sessionType && (
                      <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wide ${row.sessionType === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                        ({row.sessionType})
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-300 last:border-r-0">
                    {row.category}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-medium text-cyan-300 last:border-r-0">
                    {row.betNumber}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-semibold text-white last:border-r-0">
                    Rs. {Number(row.betAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-semibold text-amber-300 last:border-r-0">
                    Rs. {Number(row.winAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ENTRY_STATUS_STYLE[row.status] ?? ""}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400 last:border-r-0">
                    {formatDate(row.dateTime)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((currentPage) => currentPage - 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {detailEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailEntry(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Winning Entry Details</h2>
              <button
                onClick={() => setDetailEntry(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                x
              </button>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-2">
              {[
                ["User", `${detailEntry.user?.name ?? "-"} (@${detailEntry.user?.username ?? "-"})`],
                ["Games Name", resolveGameName(detailEntry)],
                ["Category", resolvePlayType(detailEntry)],
                ["Bet Number", resolveBetNumber(detailEntry)],
                ["Bet Amount", `Rs. ${Number(detailEntry.totalAmount ?? 0).toLocaleString()}`],
                ["Status", detailEntry.gameStatus ?? detailEntry.status ?? "-"],
                ["Bet Result", detailEntry.betStatus ?? "-"],
                ["Date Time", formatDate(detailEntry.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
            {detailEntry.items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">Items</p>
                <div className="space-y-1.5">
                  {detailEntry.items
                    .filter((item: any) => String(item?.gameStatus ?? item?.status ?? "").toUpperCase() === "WON")
                    .map((item: any, index: number) => (
                      <div
                        key={item.id ?? index}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                      >
                        <div>
                          <p className="text-xs text-slate-300">
                            {getPlayTypeLabel(item.playType)}
                          </p>
                          <p className="font-mono text-sm font-bold text-white">
                            {item.selectedNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-white">
                            Rs. {Number(item.amount ?? 0).toLocaleString()}
                          </p>
                          <span className="text-[10px] text-slate-400">{item.betStatus ?? item.status ?? "-"}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KalyanWinHistoryPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-400">Loading win history...</div>}>
      <KalyanWinHistoryPageContent />
    </Suspense>
  );
}
