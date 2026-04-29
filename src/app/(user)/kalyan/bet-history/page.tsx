"use client";

import { useCallback, useEffect, useState } from "react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { EntryItem, EntrySlip, PLAY_TYPE_LABEL } from "@/types/kalyan";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { LoadingState } from "@/components/kalyan/user/LoadingState";
import { ErrorState } from "@/components/kalyan/user/ErrorState";
import { EmptyState } from "@/components/kalyan/user/EmptyState";
import { StatusBadge } from "@/components/kalyan/user/StatusBadge";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Win", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Pending", value: "ACTIVE" },
  { label: "Cancel", value: "CANCELLED" },
] as const;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inferPlayTypeFromNumber(value?: string | null) {
  const normalized = String(value ?? "").trim();

  if (/^\d$/.test(normalized)) return "GAME_TOTAL";
  if (/^\d{2}$/.test(normalized)) return "JORI";
  if (/^\d{3}$/.test(normalized)) {
    const uniqueCount = new Set(normalized.split("")).size;
    if (uniqueCount === 3) return "SINGLE_PATTI";
    if (uniqueCount === 2) return "DOUBLE_PATTI";
    if (uniqueCount === 1) return "TRIPLE_PATTI";
  }

  return "";
}

function resolveCategoryLabel(entry: EntrySlip, item?: EntryItem) {
  const itemPlayType = item?.playType;
  if (itemPlayType && itemPlayType in PLAY_TYPE_LABEL) {
    return PLAY_TYPE_LABEL[itemPlayType];
  }

  const entryPlayType = (entry as EntrySlip & { playType?: string }).playType;
  if (entryPlayType && entryPlayType in PLAY_TYPE_LABEL) {
    return PLAY_TYPE_LABEL[entryPlayType as keyof typeof PLAY_TYPE_LABEL];
  }

  const inferredPlayType = inferPlayTypeFromNumber(item?.selectedNumber);
  return inferredPlayType
    ? PLAY_TYPE_LABEL[inferredPlayType as keyof typeof PLAY_TYPE_LABEL]
    : "-";
}

function getRawStatus(entry: EntrySlip, item?: EntryItem) {
  const itemMeta = item as
    | (EntryItem & { status?: string; gameStatus?: string; betStatus?: string | null })
    | undefined;

  return {
    gameStatus: String(
      itemMeta?.gameStatus ?? entry.gameStatus ?? "",
    ).toUpperCase(),
    betStatus: String(
      itemMeta?.betStatus ??
        itemMeta?.status ??
        entry.betStatus ??
        (entry as EntrySlip & { status?: string }).status ??
        "ACTIVE",
    ).toUpperCase(),
  };
}

function getFilterStatus(entry: EntrySlip, item?: EntryItem) {
  const { gameStatus, betStatus } = getRawStatus(entry, item);

  if (
    gameStatus === "CANCEL" ||
    betStatus === "CANCEL" ||
    betStatus === "CANCELLED"
  ) {
    return "CANCELLED";
  }

  if (betStatus === "WON" || betStatus === "LOST") {
    return betStatus;
  }

  if (
    gameStatus === "ACTIVE" ||
    betStatus === "ACTIVE" ||
    betStatus === "PENDING" ||
    betStatus === "WAITING"
  ) {
    return "ACTIVE";
  }

  return "CLOSE";
}

function getDisplayStatus(entry: EntrySlip, item?: EntryItem) {
  const { gameStatus, betStatus } = getRawStatus(entry, item);

  // REVERSED — result was updated and previous winnings were deducted
  if (betStatus === "REVERSED") {
    return "REVERSED";
  }

  // CANCEL takes priority — admin cancelled the game
  if (
    gameStatus === "CANCEL" ||
    betStatus === "CANCEL" ||
    betStatus === "CANCELLED" ||
    betStatus === "REMOVED"
  ) {
    return "CANCEL";
  }

  if (betStatus === "ACTIVE" || betStatus === "PENDING" || betStatus === "WAITING") {
    return "ACTIVE";
  }

  // Result published or settled bets keep the old table display as CLOSE.
  if (
    gameStatus === "CLOSE" ||
    betStatus === "CLOSE" ||
    betStatus === "WON" ||
    betStatus === "LOST"
  ) {
    return "CLOSE";
  }

  return "ACTIVE";
}

export default function BetHistoryPage() {
  const [entries, setEntries] = useState<EntrySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("User");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchEntries = useCallback(async (p = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await KalyanUserService.getMyEntries({
        page: p,
        limit: 10,
        status: statusFilter || undefined,
      });
      const data: EntrySlip[] = Array.isArray(res.data) ? res.data : [];
      setEntries((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length === 10);
    } catch {
      setError("Failed to load bet history.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
    fetchEntries(1, false);
  }, [fetchEntries]);

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

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchEntries(next, true);
  };

  const selectStatusFilter = (value: string) => {
    setPage(1);
    if (value === statusFilter) {
      fetchEntries(1, false);
      return;
    }

    setStatusFilter(value);
  };

  const rows = entries.flatMap((entry) => {
    const items = Array.isArray(entry.items) ? entry.items : [];

    const baseGameName =
      entry.gameName?.trim() ||
      entry.market?.name ||
      `Market #${entry.marketId.slice(-6)}`;
    const sessionLabel =
      entry.sessionType === "CLOSE" ? "Close" : entry.sessionType === "OPEN" ? "Open" : "";
    const gameName = baseGameName;

    if (items.length === 0) {
      return [
        {
          key: `${entry.id}-empty`,
          userName:
            entry.user?.name?.trim() ||
            entry.user?.username?.trim() ||
            currentUserName,
          gameName,
          sessionLabel,
          category: resolveCategoryLabel(entry),
          betNumber: "-",
          amount: entry.totalAmount,
          gameStatus: getDisplayStatus(entry),
          filterStatus: getFilterStatus(entry),
          dateTime: entry.createdAt,
        },
      ];
    }

    return items.map((item, index) => ({
      key: `${entry.id}-${item.id ?? index}`,
      userName:
        entry.user?.name?.trim() ||
        entry.user?.username?.trim() ||
        currentUserName,
      gameName,
      sessionLabel,
      category: resolveCategoryLabel(entry, item),
      betNumber: item.selectedNumber,
      amount: item.amount,
      gameStatus: getDisplayStatus(entry, item),
      filterStatus: getFilterStatus(entry, item),
      dateTime: item.createdAt ?? entry.createdAt,
    }));
  }).filter((row) => !statusFilter || row.filterStatus === statusFilter);

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader title="Bet History" subtitle="All your placed bets" backHref="/kalyan" />

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_26px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:bg-slate-900/50">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;

          return (
            <button
              key={filter.value || "ALL"}
              type="button"
              onClick={() => selectStatusFilter(filter.value)}
              className={`min-w-[72px] flex-1 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-[0_8px_18px_rgba(34,211,238,0.22)]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading && page === 1 && <LoadingState message="Loading bets..." rows={4} />}

      {error && !loading && (
        <ErrorState message={error} onRetry={() => fetchEntries(1, false)} />
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="No bets found"
          description={
            statusFilter
              ? "No bets found for this status."
              : "You haven't placed any bets yet."
          }
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
                      <span className="block text-[7px] leading-tight sm:text-[8px]">Cate:</span>
                      <span className="mt-0.5 block text-[6px] text-slate-500 dark:text-slate-500 sm:text-[7px]">Type</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Number</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Amount</span>
                    </th>
                    <th className="border-b border-r border-slate-200 px-2 py-2 dark:border-slate-700/70 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500 dark:text-slate-500">Status</span>
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
                      <td className="w-[6%] whitespace-nowrap border-r border-slate-200 px-1 py-2 font-semibold text-slate-600 dark:border-slate-700/60 dark:text-slate-300 sm:px-2">{index + 1}</td>
                      <td className="w-[13%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-medium leading-tight text-slate-950 dark:border-slate-700/60 dark:text-white sm:px-2">{row.userName}</td>
                      <td className="w-[16%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-medium leading-tight text-slate-800 dark:border-slate-700/60 dark:text-slate-100 sm:px-2">
                        {row.gameName}
                        {row.sessionLabel && (
                          <span className={`block font-semibold ${row.sessionLabel === "Open" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {row.sessionLabel}
                          </span>
                        )}
                      </td>
                      <td className="w-[13%] whitespace-nowrap border-r border-slate-200 px-1 py-2 text-[7px] leading-none text-slate-600 dark:border-slate-700/60 dark:text-slate-300 sm:px-2 sm:text-[8px]">
                        {row.category}
                      </td>
                      <td className="w-[12%] break-all border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight tracking-[0.03em] text-cyan-700 dark:border-slate-700/60 dark:text-cyan-300 sm:px-2">{row.betNumber}</td>
                      <td className="w-[12%] break-words border-r border-slate-200 px-1 py-2 text-[8px] font-semibold leading-tight text-emerald-700 dark:border-slate-700/60 dark:text-emerald-300 sm:px-2">Rs. {Number(row.amount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="w-[12%] border-r border-slate-200 px-1 py-2 dark:border-slate-700/60 sm:px-2">
                        <div className="flex justify-center">
                          <StatusBadge status={row.gameStatus} className="px-1.5 py-0 text-[8px]" />
                        </div>
                      </td>
                      <td className="w-[16%] break-words px-1 py-2 text-[8px] leading-tight text-slate-600 dark:text-slate-300 sm:px-2">{formatDateTime(row.dateTime)}</td>
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
