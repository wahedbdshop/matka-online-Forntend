/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { PLAY_TYPE_LABEL, ENTRY_STATUS_STYLE, type PlayType } from "@/types/kalyan";
import {
  getKalyanMarketBaseName,
  getKalyanMarketOptionLabel,
  getKalyanMarketSessionLabel,
} from "@/lib/kalyan-market-display";
import { getBangladeshDateISO } from "@/lib/timezone";

const LIMIT = 20;
const MARKET_LIST_LIMIT = 1000;
const ALL_MARKETS_FETCH_LIMIT = 200;
const ALL_MARKETS_BASE_LIMIT = 1000;
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
  const val =
    entry?.sessionType ??
    entry?.session ??
    entry?.market?.sessionType ??
    entry?.items?.[0]?.sessionType ??
    entry?.items?.[0]?.session;
  if (!val) return undefined;
  const up = String(val).toUpperCase();
  if (up === "OPEN" || up === "CLOSE") return up;
  return undefined;
}

function sortMarketsByOldest<T extends { createdAt?: string; id?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function resolveMarketSessionType(market: any): "OPEN" | "CLOSE" | undefined {
  const value = market?.sessionType ?? market?.timings?.[0]?.sessionType;
  if (!value) return undefined;

  const normalizedValue = String(value).toUpperCase();
  if (normalizedValue === "OPEN" || normalizedValue === "CLOSE") {
    return normalizedValue;
  }

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

function extractEntryList(payload: any): any[] {
  if (Array.isArray(payload?.data?.entries)) return payload.data.entries;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function sortEntriesByNewest(items: any[]) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right?.createdAt ?? 0).getTime();
    const leftTime = new Date(left?.createdAt ?? 0).getTime();

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return String(right?.id ?? "").localeCompare(String(left?.id ?? ""));
  });
}

function normalizeSearchTerm(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesDateFilter(value: unknown, dateFilter: string) {
  if (!dateFilter) return true;
  if (!value) return false;

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return false;

  return getBangladeshDateISO(parsed) === dateFilter;
}

function matchesUserSearch(entry: any, searchTerm: string) {
  if (!searchTerm) return true;

  const candidates = [
    entry?.user?.name,
    entry?.user?.username,
    entry?.userName,
    entry?.username,
    entry?.name,
  ];

  return candidates.some((candidate) =>
    normalizeSearchTerm(candidate).includes(searchTerm),
  );
}

function isCloseFinalSettlementRow(sessionType: "OPEN" | "CLOSE" | undefined, playType: unknown) {
  const normalizedPlayType = String(playType ?? "").toUpperCase();
  return sessionType === "CLOSE" || normalizedPlayType === "JORI";
}

function KalyanWinHistoryPageContent() {
  const searchParams = useSearchParams();
  const settlementView = searchParams.get("settlementView") ?? "";
  const resultAddedAt = searchParams.get("resultAddedAt") ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState(
    () => searchParams.get("marketId") ?? "",
  );
  const [sessionFilter, setSessionFilter] = useState<"" | "OPEN" | "CLOSE">(() => {
    if (searchParams.get("settlementView") === "close-final") {
      return "";
    }
    const sessionType = String(searchParams.get("sessionType") ?? "").toUpperCase();
    return sessionType === "OPEN" || sessionType === "CLOSE" ? sessionType : "";
  });
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(
    () => searchParams.get("date") ?? getBangladeshDateISO(),
  );
  const [settlementRefreshActive, setSettlementRefreshActive] = useState(
    () => !!searchParams.get("resultAddedAt"),
  );
  const [page, setPage] = useState(1);
  const [detailEntry, setDetailEntry] = useState<any>(null);

  useEffect(() => {
    if (resultAddedAt) {
      setSettlementRefreshActive(true);
      setPage(1);
    }
  }, [resultAddedAt]);

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: MARKET_LIST_LIMIT }),
  });

  const markets: any[] = sortMarketsByOldest(marketsData?.data?.markets ?? marketsData?.data ?? []);
  const uniqueMarkets = Array.from(
    new Map(markets.map((market: any) => [String(market?.id ?? ""), market])).values(),
  ).filter((market: any) => String(market?.id ?? "").trim().length > 0);
  const closeFinalMarketIds = useMemo(() => {
    if (settlementView !== "close-final" || !marketFilter) {
      return [];
    }

    const selectedMarket = uniqueMarkets.find(
      (market: any) => String(market?.id ?? "") === marketFilter,
    );
    const selectedBaseName = getKalyanMarketBaseName(selectedMarket).toLowerCase();

    if (!selectedBaseName) {
      return marketFilter ? [marketFilter] : [];
    }

    const relatedMarketIds = uniqueMarkets
      .filter(
        (market: any) =>
          getKalyanMarketBaseName(market).toLowerCase() === selectedBaseName,
      )
      .map((market: any) => String(market.id));

    return relatedMarketIds.length > 0 ? relatedMarketIds : [marketFilter];
  }, [marketFilter, settlementView, uniqueMarkets]);
  const closeFinalMarketIdsKey = closeFinalMarketIds.join("|");
  const usingRelatedMarketDataset =
    settlementView === "close-final" &&
    marketFilter &&
    closeFinalMarketIds.length > 1;
  const marketOptions = markets.flatMap((market: any) => {
    const explicitSessionType = resolveMarketSessionType(market);

    if (explicitSessionType) {
      return [{
        key: `${market.id}:${explicitSessionType}`,
        marketId: market.id,
        sessionType: explicitSessionType,
        label: getKalyanMarketSessionLabel(market, explicitSessionType),
      }];
    }

    const baseName = getKalyanMarketOptionLabel(market);
    return [
      {
        key: `${market.id}:OPEN`,
        marketId: market.id,
        sessionType: "OPEN" as const,
        label: `${baseName} - Open`,
      },
      {
        key: `${market.id}:CLOSE`,
        marketId: market.id,
        sessionType: "CLOSE" as const,
        label: `${baseName} - Close`,
      },
    ];
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
      resultAddedAt,
    ],
    queryFn: () =>
      KalyanAdminService.getAdminEntries({
        search: search || undefined,
        marketId: marketFilter || undefined,
        sessionType: sessionFilter || undefined,
        playType: playTypeFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
    enabled:
      !usingRelatedMarketDataset && (!!marketFilter || marketOptions.length === 0),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: settlementRefreshActive ? 1500 : false,
  });

  const { data: allMarketsData, isLoading: loadingAllMarkets } = useQuery({
    queryKey: [
      "kalyan-win-history-all-markets",
      search,
      playTypeFilter,
      dateFilter,
      resultAddedAt,
      usingRelatedMarketDataset
        ? closeFinalMarketIdsKey
        : uniqueMarkets.map((market: any) => market.id).join("|"),
    ],
    enabled:
      usingRelatedMarketDataset ||
      (!marketFilter && uniqueMarkets.length > 0),
    refetchInterval: settlementRefreshActive ? 1500 : false,
    queryFn: async () => {
      const responses = await Promise.all(
        (usingRelatedMarketDataset ? closeFinalMarketIds : uniqueMarkets.map((market: any) => market.id)).map((marketId: string) =>
          KalyanAdminService.getAdminEntries({
            search: search || undefined,
            marketId,
            playType: playTypeFilter || undefined,
            date: dateFilter || undefined,
            page: 1,
            limit: ALL_MARKETS_FETCH_LIMIT,
          }).catch(() => null),
        ),
      );

      const deduped = new Map<string, any>();

      responses.forEach((response) => {
        extractEntryList(response).forEach((entry) => {
          const key = String(entry?.id ?? "");
          if (!key || deduped.has(key)) return;
          deduped.set(key, entry);
        });
      });

      const entries = sortEntriesByNewest([...deduped.values()]);
      return {
        entries,
        total: entries.length,
      };
    },
  });

  const { data: allMarketsBaseData, isLoading: loadingAllMarketsBase } = useQuery({
    queryKey: [
      "kalyan-win-history-all-markets-base",
      search,
      playTypeFilter,
      dateFilter,
      resultAddedAt,
    ],
    enabled: !marketFilter,
    refetchInterval: settlementRefreshActive ? 1500 : false,
    queryFn: async () => {
      const response = await KalyanAdminService.getAdminEntries({
        search: search || undefined,
        playType: playTypeFilter || undefined,
        date: dateFilter || undefined,
        page: 1,
        limit: ALL_MARKETS_BASE_LIMIT,
      }).catch(() => null);

      const entries = sortEntriesByNewest(extractEntryList(response));
      return {
        entries,
        total: entries.length,
      };
    },
  });

  const usingAllMarketsDataset = !marketFilter || usingRelatedMarketDataset;
  const entriesLoading = usingAllMarketsDataset
    ? loadingAllMarkets || (!usingRelatedMarketDataset && loadingAllMarketsBase)
    : isLoading;
  const mergedAllMarketEntries = usingAllMarketsDataset
    ? sortEntriesByNewest([
        ...(!usingRelatedMarketDataset ? (allMarketsBaseData?.entries ?? []) : []),
        ...(allMarketsData?.entries ?? []),
      ]).filter(
        (entry, index, allEntries) =>
          allEntries.findIndex((candidate) => String(candidate?.id ?? "") === String(entry?.id ?? "")) === index,
      )
    : [];
  const normalizedSearch = normalizeSearchTerm(search);
  const rawEntries: any[] = usingAllMarketsDataset
    ? mergedAllMarketEntries
    : extractEntryList(data);
  const searchedEntries = rawEntries.filter((entry) =>
    matchesUserSearch(entry, normalizedSearch),
  );
  const entries = searchedEntries.filter((entry) => {
    const entryStatus = getOutcomeStatus(entry);
    const itemStatuses = Array.isArray(entry?.items)
      ? entry.items.map((item: any) => getOutcomeStatus(item))
      : [];

    return entryStatus === "WON" || itemStatuses.some((status: string) => status === "WON");
  });
  const total = usingAllMarketsDataset
    ? entries.length
    : data?.data?.total ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const rows = useMemo(
    () =>
      (usingAllMarketsDataset
        ? entries.slice((page - 1) * LIMIT, page * LIMIT)
        : entries)
        .filter((entry: any) => {
          const st = resolveSessionType(entry);
          if (settlementView === "close-final") {
            const entryPlayType = resolvePlayType(entry);
            const entryHasCloseFinalOutcome =
              isCloseFinalSettlementRow(st, entryPlayType) ||
              (Array.isArray(entry?.items) ? entry.items.some((item: any) =>
                isCloseFinalSettlementRow(
                  resolveSessionType({ ...entry, sessionType: item?.sessionType ?? item?.session }),
                  item?.playType,
                ),
              ) : false);
            if (!entryHasCloseFinalOutcome) return false;
          }
          if (!sessionFilter) return true;
          return st === sessionFilter;
        })
        .flatMap((entry: any) => {
          const sessionType = resolveSessionType(entry);
          const items = (Array.isArray(entry?.items) ? entry.items : []).filter((item: any) => {
            const itemStatus = getOutcomeStatus(item);
            const itemSessionType = resolveSessionType({
              ...entry,
              sessionType: item?.sessionType ?? item?.session ?? entry?.sessionType,
              items: [item],
            });
            return (
              itemStatus === "WON" &&
              matchesDateFilter(item?.resultDate ?? entry?.resultDate ?? item?.createdAt ?? entry?.createdAt, dateFilter) &&
              (settlementView !== "close-final" ||
                isCloseFinalSettlementRow(itemSessionType, item?.playType || entry?.playType)) &&
              !isRemovedStatus(item?.gameStatus) &&
              !isRemovedStatus(item?.status) &&
              !isCancelledStatus(item?.gameStatus) &&
              !isCancelledStatus(item?.status)
            );
          });

          if (items.length === 0) {
            const betAmount = Number(entry.totalAmount ?? 0);
            const playType = resolvePlayType(entry);
            if (
              settlementView === "close-final" &&
              !isCloseFinalSettlementRow(sessionType, playType)
            ) {
              return [];
            }
            if (!matchesDateFilter(entry?.resultDate ?? entry?.createdAt, dateFilter)) {
              return [];
            }
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
    [dateFilter, entries, page, rates, sessionFilter, settlementView, usingAllMarketsDataset],
  );

  useEffect(() => {
    if (settlementRefreshActive && !entriesLoading && rows.length > 0) {
      setSettlementRefreshActive(false);
    }
  }, [entriesLoading, rows.length, settlementRefreshActive]);

  useEffect(() => {
    if (!settlementRefreshActive) return;

    const timeoutId = window.setTimeout(() => {
      setSettlementRefreshActive(false);
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [settlementRefreshActive]);

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-500/15">
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">Win History</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">All winning Kalyan bets</p>
          </div>
        </div>
        <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400">
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
            className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-yellow-500"
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>

        <select
          value={marketFilter ? `${marketFilter}${sessionFilter ? `:${sessionFilter}` : ""}` : ""}
          onChange={(e) => {
            const [mid, session] = e.target.value.split(":");
            setMarketFilter(mid);
            setSessionFilter((session as "" | "OPEN" | "CLOSE") || "");
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Markets</option>
          {marketOptions.map((option) => (
            <option
              key={option.key}
              value={`${option.marketId}:${option.sessionType}`}
            >
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={playTypeFilter}
          onChange={(e) => {
            setPlayTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-center dark:border-slate-700/80 dark:bg-transparent">
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
                  className="border-r border-slate-200 px-4 py-3 text-center text-xs font-medium text-slate-500 last:border-r-0 dark:border-slate-700/50 dark:text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entriesLoading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-200 dark:border-slate-700/50">
                  {Array.from({ length: 9 }).map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40"
                    >
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
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
                  className="cursor-pointer border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                >
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0 dark:border-slate-700/40">
                    {(page - 1) * LIMIT + index + 1}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-medium text-slate-950 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {row.userName}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-700 last:border-r-0 dark:border-slate-700/40 dark:text-slate-300">
                    {row.gameName}
                    {row.sessionType && (
                      <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wide ${row.sessionType === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                        ({row.sessionType})
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-700 last:border-r-0 dark:border-slate-700/40 dark:text-slate-300">
                    {row.category}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-medium text-cyan-700 last:border-r-0 dark:border-slate-700/40 dark:text-cyan-300">
                    {row.betNumber}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-950 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    Rs. {Number(row.betAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold text-amber-700 last:border-r-0 dark:border-slate-700/40 dark:text-amber-300">
                    Rs. {Number(row.winAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ENTRY_STATUS_STYLE[row.status] ?? ""}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500 last:border-r-0 dark:text-slate-400">
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 space-y-4 max-h-[80vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">Winning Entry Details</h2>
              <button
                onClick={() => setDetailEntry(null)}
                className="text-slate-500 hover:text-slate-950 text-xs dark:text-slate-400 dark:hover:text-white"
              >
                x
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800">
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
                  <span className="text-right font-medium text-slate-950 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
            {detailEntry.items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Items</p>
                <div className="space-y-1.5">
                  {detailEntry.items
                    .filter((item: any) => String(item?.gameStatus ?? item?.status ?? "").toUpperCase() === "WON")
                    .map((item: any, index: number) => (
                      <div
                        key={item.id ?? index}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {getPlayTypeLabel(item.playType)}
                          </p>
                          <p className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                            {item.selectedNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-950 dark:text-white">
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
