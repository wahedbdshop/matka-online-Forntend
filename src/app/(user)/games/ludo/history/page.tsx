"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleX, Dice6, History, Trophy } from "lucide-react";
import { LudoService } from "@/services/ludo.service";

const formatAmount = (amount: number) => `Tk ${Number(amount ?? 0).toLocaleString("en-BD")}`;

const formatDate = (value?: string | null) => {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
};

export default function LudoHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ludo-history"],
    queryFn: () => LudoService.getMyHistory(),
  });

  const history = data?.data;
  const stats = history?.stats;
  const matches = history?.matches ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.18),transparent_30%),linear-gradient(180deg,#f6f7ff_0%,#eef2ff_45%,#f8fafc_100%)] px-4 py-5 text-slate-950 dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_28%),linear-gradient(180deg,#181a42_0%,#0a1028_100%)] dark:text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/games/ludo"
          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/14"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ludo
        </Link>

        <div className="mt-5 rounded-[28px] border border-violet-200/80 bg-white/80 p-5 shadow-[0_20px_50px_rgba(76,29,149,0.12)] backdrop-blur dark:border-violet-300/18 dark:bg-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/18 dark:text-violet-200">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                My Game History
              </h1>
              <p className="text-sm text-slate-500 dark:text-white/65">
                Your Ludo wins, losses and played stake summary.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-4 dark:border-emerald-300/18 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Wins</span>
              </div>
              <p className="mt-2 text-3xl font-black">{isLoading ? "..." : stats?.wins ?? 0}</p>
            </div>

            <div className="rounded-[20px] border border-rose-200 bg-rose-50/90 px-4 py-4 dark:border-red-300/18 dark:bg-red-500/10">
              <div className="flex items-center gap-2 text-rose-700 dark:text-red-200">
                <CircleX className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Losses</span>
              </div>
              <p className="mt-2 text-3xl font-black">{isLoading ? "..." : stats?.losses ?? 0}</p>
            </div>

            <div className="rounded-[20px] border border-blue-200 bg-blue-50/90 px-4 py-4 dark:border-blue-300/18 dark:bg-blue-500/10">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
                <Dice6 className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Matches</span>
              </div>
              <p className="mt-2 text-3xl font-black">
                {isLoading ? "..." : stats?.totalMatches ?? 0}
              </p>
            </div>

            <div className="rounded-[20px] border border-amber-200 bg-amber-50/90 px-4 py-4 dark:border-amber-300/18 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-100">
                <span className="text-xs font-black uppercase tracking-[0.2em]">Total Bet</span>
              </div>
              <p className="mt-2 text-xl font-black">
                {isLoading ? "..." : formatAmount(stats?.totalWagered ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200/85">
              Recent Matches
            </h2>

            <div className="mt-3 space-y-3">
              {isLoading ? (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-500 dark:border-white/12 dark:bg-slate-950/20 dark:text-white/70">
                  Loading history...
                </div>
              ) : matches.length === 0 ? (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-500 dark:border-white/12 dark:bg-slate-950/20 dark:text-white/70">
                  No finished Ludo matches yet.
                </div>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-[20px] border border-slate-200 bg-white/75 px-4 py-4 shadow-sm dark:border-white/12 dark:bg-slate-950/20 dark:shadow-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-950 dark:text-white">
                          {formatAmount(match.stakeAmount)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
                          Opponent: {match.opponent?.name || match.opponent?.username || "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-white/50">
                          {formatDate(match.finishedAt || match.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                          match.result === "WON"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                            : "bg-rose-100 text-rose-700 dark:bg-red-400/15 dark:text-red-200"
                        }`}
                      >
                        {match.result}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
