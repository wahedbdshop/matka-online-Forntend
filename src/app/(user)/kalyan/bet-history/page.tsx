"use client";

import { useCallback, useEffect, useState } from "react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { EntryItem, EntrySlip, PLAY_TYPE_LABEL } from "@/types/kalyan";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { LoadingState } from "@/components/kalyan/user/LoadingState";
import { ErrorState } from "@/components/kalyan/user/ErrorState";
import { EmptyState } from "@/components/kalyan/user/EmptyState";
import { StatusBadge } from "@/components/kalyan/user/StatusBadge";

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

function getDisplayStatus(entry: EntrySlip, item?: EntryItem) {
  const itemMeta = item as (EntryItem & { status?: string; gameStatus?: string }) | undefined;

  const gameStatus = String(
    itemMeta?.gameStatus ?? entry.gameStatus ?? "",
  ).toUpperCase();

  const betStatus = String(
    itemMeta?.status ??
      (entry as EntrySlip & { status?: string }).status ??
      "ACTIVE",
  ).toUpperCase();

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

  // Result published → game session is CLOSE
  // gameStatus CLOSE means result submitted; WON/LOST also means result is published
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

  const fetchEntries = useCallback(async (p = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await KalyanUserService.getMyEntries({
        page: p,
        limit: 10,
      });
      const data: EntrySlip[] = Array.isArray(res.data) ? res.data : [];
      setEntries((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length === 10);
    } catch {
      setError("Failed to load bet history.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      dateTime: item.createdAt ?? entry.createdAt,
    }));
  });

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader title="Bet History" subtitle="All your placed bets" backHref="/kalyan" />

      {loading && page === 1 && <LoadingState message="Loading bets..." rows={4} />}

      {error && !loading && (
        <ErrorState message={error} onRetry={() => fetchEntries(1, false)} />
      )}

      {!loading && !error && entries.length === 0 && (
        <EmptyState
          title="No bets found"
          description="You haven't placed any bets yet."
        />
      )}

      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/50 shadow-[0_16px_40px_rgba(15,23,42,0.24)]">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="bg-slate-800/95 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">SI</span>
                      <span className="mt-1 block text-[9px] text-slate-500">No</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">User</span>
                      <span className="mt-1 block text-[9px] text-slate-500">Name</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">Games</span>
                      <span className="mt-1 block text-[9px] text-slate-500">Name</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block text-[7px] leading-tight sm:text-[8px]">Cate:</span>
                      <span className="mt-0.5 block text-[6px] text-slate-500 sm:text-[7px]">Type</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500">Number</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500">Amount</span>
                    </th>
                    <th className="border-b border-r border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">Bet</span>
                      <span className="mt-1 block text-[9px] text-slate-500">Status</span>
                    </th>
                    <th className="border-b border-slate-700/70 px-2 py-2 sm:px-3">
                      <span className="block leading-tight">Date</span>
                      <span className="mt-1 block text-[9px] text-slate-500">&amp; Time</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.key}
                      className="border-b border-slate-800/80 bg-slate-900/25 text-[9px] text-slate-200 transition-colors hover:bg-slate-800/35 sm:text-[10px]"
                    >
                      <td className="w-[6%] border-r border-slate-700/60 px-1 py-2 font-semibold text-slate-300 sm:px-2 whitespace-nowrap">{index + 1}</td>
                      <td className="w-[13%] border-r border-slate-700/60 px-1 py-2 font-medium text-white sm:px-2 text-[8px] leading-tight break-words">{row.userName}</td>
                      <td className="w-[16%] border-r border-slate-700/60 px-1 py-2 font-medium text-slate-100 sm:px-2 text-[8px] leading-tight break-words">
                        {row.gameName}
                        {row.sessionLabel && (
                          <span className={`block font-semibold ${row.sessionLabel === "Open" ? "text-green-400" : "text-red-400"}`}>
                            {row.sessionLabel}
                          </span>
                        )}
                      </td>
                      <td className="w-[13%] border-r border-slate-700/60 px-1 py-2 text-[7px] leading-none text-slate-300 whitespace-nowrap sm:px-2 sm:text-[8px]">
                        {row.category}
                      </td>
                      <td className="w-[12%] border-r border-slate-700/60 px-1 py-2 font-semibold tracking-[0.03em] text-cyan-300 sm:px-2 text-[8px] leading-tight break-all">{row.betNumber}</td>
                      <td className="w-[12%] border-r border-slate-700/60 px-1 py-2 font-semibold text-emerald-300 sm:px-2 text-[8px] leading-tight break-words">Rs. {Number(row.amount ?? 0).toLocaleString("en-IN")}</td>
                      <td className="w-[12%] border-r border-slate-700/60 px-1 py-2 sm:px-2">
                        <div className="flex justify-center">
                          <StatusBadge status={row.gameStatus} className="px-1.5 py-0 text-[8px]" />
                        </div>
                      </td>
                      <td className="w-[16%] px-1 py-2 text-slate-300 sm:px-2 text-[8px] leading-tight break-words">{formatDateTime(row.dateTime)}</td>
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
              className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 py-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
