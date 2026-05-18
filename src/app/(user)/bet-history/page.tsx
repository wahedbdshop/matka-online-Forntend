/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CircleDollarSign,
  Coins,
  Dice5,
  History,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { LudoService } from "@/services/ludo.service";
import { CoinTossService } from "@/services/coin-toss.service";

type BetHistoryStatus = "ALL" | "ACTIVE" | "WON" | "LOST" | "CANCELLED";

type UnifiedBetHistoryItem = {
  id: string;
  game: "Thai Lottery" | "Kalyan" | "Ludo" | "Coin Toss";
  title: string;
  detail: string;
  amount: number;
  winAmount: number;
  status: BetHistoryStatus;
  playedAt: string;
};

const filters: Array<{ label: string; value: BetHistoryStatus }> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
  { label: "Cancel", value: "CANCELLED" },
];

const gameTone: Record<
  UnifiedBetHistoryItem["game"],
  { icon: typeof History; bg: string; text: string }
> = {
  "Thai Lottery": {
    icon: CircleDollarSign,
    bg: "bg-blue-500/12 border-blue-500/20",
    text: "text-blue-600 dark:text-blue-300",
  },
  Kalyan: {
    icon: Coins,
    bg: "bg-amber-500/12 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-300",
  },
  Ludo: {
    icon: Dice5,
    bg: "bg-emerald-500/12 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  "Coin Toss": {
    icon: Trophy,
    bg: "bg-cyan-500/12 border-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-300",
  },
};

const statusTone: Record<BetHistoryStatus, string> = {
  ALL: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ACTIVE:
    "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  WON: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  LOST: "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-300",
  CANCELLED:
    "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
};

function asList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.bets)) return payload.bets;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (payload?.data && typeof payload.data === "object") {
    return asList(payload.data);
  }
  return [];
}

function normalizeStatus(value: unknown): BetHistoryStatus {
  const status = String(value ?? "").toUpperCase();

  if (["WON", "WIN", "WINNER"].includes(status)) return "WON";
  if (["LOST", "LOSE", "LOSS"].includes(status)) return "LOST";
  if (["CANCEL", "CANCELLED", "REFUNDED", "REFUND", "REVERSED"].includes(status)) {
    return "CANCELLED";
  }
  if (["PENDING", "ACTIVE", "WAITING", "OPEN", "BETTING"].includes(status)) {
    return "ACTIVE";
  }

  return "ACTIVE";
}

function formatAmount(value: number) {
  return Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeThaiBets(payload: any): UnifiedBetHistoryItem[] {
  return asList(payload).map((bet, index) => ({
    id: `thai-${bet.id ?? index}`,
    game: "Thai Lottery",
    title: bet.playType ?? "Thai Bet",
    detail: `Number ${bet.betNumber ?? bet.originalBetNumber ?? "-"}`,
    amount: Number(bet.actualAmount ?? bet.amount ?? 0),
    winAmount: Number(bet.actualWin ?? bet.winAmount ?? bet.payout ?? 0),
    status: normalizeStatus(bet.status),
    playedAt: bet.placedAt ?? bet.createdAt ?? "",
  }));
}

function normalizeKalyanEntries(payload: any): UnifiedBetHistoryItem[] {
  return asList(payload).flatMap((entry, entryIndex) => {
    const items = Array.isArray(entry.items) ? entry.items : [];
    const marketName =
      entry.gameName ?? entry.market?.name ?? entry.marketName ?? "Kalyan Bet";
    const entryStatus = entry.betStatus ?? entry.status ?? entry.gameStatus;

    if (items.length === 0) {
      return [
        {
          id: `kalyan-${entry.id ?? entryIndex}`,
          game: "Kalyan" as const,
          title: marketName,
          detail: `${entry.sessionType ?? "-"} ${entry.playType ?? ""}`.trim(),
          amount: Number(entry.totalAmount ?? entry.amount ?? 0),
          winAmount: Number(entry.winAmount ?? entry.winningAmount ?? 0),
          status: normalizeStatus(entryStatus),
          playedAt: entry.createdAt ?? "",
        },
      ];
    }

    return items.map((item: any, itemIndex: number) => ({
      id: `kalyan-${entry.id ?? entryIndex}-${item.id ?? itemIndex}`,
      game: "Kalyan" as const,
      title: marketName,
      detail: `${entry.sessionType ?? "-"} ${item.selectedNumber ?? item.betNumber ?? "-"}`,
      amount: Number(item.amount ?? item.betAmount ?? 0),
      winAmount: Number(item.winAmount ?? item.winningAmount ?? 0),
      status: normalizeStatus(item.betStatus ?? item.status ?? entryStatus),
      playedAt: item.createdAt ?? entry.createdAt ?? "",
    }));
  });
}

function normalizeLudoHistory(payload: any): UnifiedBetHistoryItem[] {
  return asList(payload).map((match, index) => ({
    id: `ludo-${match.id ?? index}`,
    game: "Ludo",
    title: `Ludo ${match.pieceMode ?? "Match"}`,
    detail: match.opponent?.username
      ? `vs ${match.opponent.username}`
      : match.roomId
        ? `Room ${String(match.roomId).slice(-6)}`
        : "Match",
    amount: Number(match.stakeAmount ?? match.stake ?? 0),
    winAmount: match.result === "WON" ? Number(match.stakeAmount ?? 0) : 0,
    status: normalizeStatus(match.result ?? match.status),
    playedAt: match.finishedAt ?? match.startedAt ?? match.createdAt ?? "",
  }));
}

function normalizeCoinTossBets(payload: any): UnifiedBetHistoryItem[] {
  return asList(payload).map((bet, index) => ({
    id: `coin-${bet.id ?? index}`,
    game: "Coin Toss",
    title: `Coin Toss ${bet.outcome ?? ""}`.trim(),
    detail: `Round ${String(bet.roundId ?? "").slice(-8) || "-"}`,
    amount: Number(bet.stake ?? 0),
    winAmount: Number(bet.payout ?? 0),
    status: normalizeStatus(bet.status),
    playedAt: bet.createdAt ?? "",
  }));
}

export default function UnifiedBetHistoryPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<BetHistoryStatus>("ALL");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["unified-bet-history"],
    queryFn: async () => {
      const [thai, kalyan, ludo, coin] = await Promise.allSettled([
        ThaiLotteryUserService.getMyBets(undefined, 1, 50),
        KalyanUserService.getMyEntries({ page: 1, limit: 50 }),
        LudoService.getMyHistory(),
        CoinTossService.getMyBets(50),
      ]);

      return [
        ...(thai.status === "fulfilled" ? normalizeThaiBets(thai.value) : []),
        ...(kalyan.status === "fulfilled" ? normalizeKalyanEntries(kalyan.value) : []),
        ...(ludo.status === "fulfilled" ? normalizeLudoHistory(ludo.value) : []),
        ...(coin.status === "fulfilled" ? normalizeCoinTossBets(coin.value) : []),
      ].sort(
        (left, right) =>
          new Date(right.playedAt || 0).getTime() -
          new Date(left.playedAt || 0).getTime(),
      );
    },
    refetchInterval: 15000,
  });

  const items = data ?? [];
  const visibleItems = useMemo(
    () =>
      statusFilter === "ALL"
        ? items
        : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  );

  const summary = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      won: items.filter((item) => item.status === "WON").length,
      wagered: items.reduce((sum, item) => sum + item.amount, 0),
      wonAmount: items.reduce((sum, item) => sum + item.winAmount, 0),
    }),
    [items],
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950 dark:bg-[#11182b] dark:text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f0bf38] px-4 text-xs font-black text-[#1a1f39] shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0bf38]/15 text-[#b77905]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black">Bet History</h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                All games play history in one place
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: summary.total },
              { label: "Active", value: summary.active },
              { label: "Won", value: summary.won },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-center dark:border-slate-700 dark:bg-slate-800/60"
              >
                <p className="text-base font-black">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Bet Amount
              </p>
              <p className="text-[13px] font-black">৳ {formatAmount(summary.wagered)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Win Amount
              </p>
              <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-300">
                ৳ {formatAmount(summary.wonAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`min-w-[68px] flex-1 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase transition ${
                statusFilter === filter.value
                  ? "bg-[#f0bf38] text-[#1a1f39]"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              />
            ))
          ) : null}

          {!isLoading && visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <History className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-bold">No bet history found</p>
              <p className="mt-1 text-xs text-slate-500">
                Your played bets will appear here.
              </p>
            </div>
          ) : null}

          {visibleItems.map((item) => {
            const tone = gameTone[item.game];
            const Icon = tone.icon;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.bg} ${tone.text}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {item.game} · {item.detail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${statusTone[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Bet
                        </p>
                        <p className="font-black leading-tight">৳ {formatAmount(item.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Win
                        </p>
                        <p className="font-black leading-tight text-emerald-600 dark:text-emerald-300">
                          ৳ {formatAmount(item.winAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Time
                        </p>
                        <p className="font-bold leading-tight text-slate-500 dark:text-slate-400">
                          {formatDate(item.playedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
