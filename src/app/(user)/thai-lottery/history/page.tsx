/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, History, TrendingUp, Clock, Trophy } from "lucide-react";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { formatBangladeshDate } from "@/lib/bangladesh-time";

const LIMIT = 20;

const PLAY_TYPE_LABEL: Record<string, string> = {
  THREE_UP_DIRECT: "3Up Direct",
  THREE_UP_RUMBLE: "3Up Rumble",
  THREE_UP_SINGLE: "3Up Single",
  THREE_UP_TOTAL: "3Up Total",
  TWO_UP_DIRECT: "2Up Direct",
  DOWN_DIRECT: "Down Direct",
  DOWN_SINGLE: "Down Single",
  DOWN_TOTAL: "Down Total",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400 animate-pulse",
  },
  WON: {
    label: "Won",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400",
  },
  LOST: {
    label: "Lost",
    cls: "border-red-500/30 bg-red-500/10 text-red-400",
    dot: "bg-red-400",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    dot: "bg-slate-400",
  },
  REVERSED: {
    label: "Reversed",
    cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    dot: "bg-cyan-400",
  },
};

const formatDateShort = (date?: string) => {
  return formatBangladeshDate(date);
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#0f2244]/60">
      <div className="h-3 w-6 rounded bg-[#101935] animate-pulse" />
      <div className="flex-1">
        <div className="h-3 w-24 rounded bg-[#101935] animate-pulse" />
      </div>
      <div className="h-3 w-14 rounded bg-[#101935] animate-pulse" />
      <div className="h-5 w-16 rounded-full bg-[#101935] animate-pulse" />
    </div>
  );
}

export default function ThaiLotteryHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fmtUsd = (usd: number) =>
    `$${Number(usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const { data, isLoading } = useQuery({
    queryKey: ["thai-history", page, statusFilter],
    queryFn: () =>
      ThaiLotteryUserService.getMyBets(
        undefined,
        page,
        LIMIT,
        statusFilter || undefined,
      ),
  });

  const bets: any[] = data?.data?.bets ?? [];
  const total: number = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const pendingCount = bets.filter((b) => b.status === "PENDING").length;
  const totalWon = bets
    .filter((b) => b.status === "WON")
    .reduce((s, b) => s + Number(b.actualWin ?? 0), 0);

  const FILTERS = [
    { label: "All", value: "" },
    { label: "Won", value: "WON" },
    { label: "Lost", value: "LOST" },
    { label: "Pending", value: "PENDING" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <>
      <style>{`
        .light .thai-history-shell { background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%); color: #0f172a; }
        .light .thai-history-back,
        .light .thai-history-stat,
        .light .thai-history-filters,
        .light .thai-history-table,
        .light .thai-history-pager-btn,
        .light .thai-history-confirm {
          background: rgba(255,255,255,0.96);
          border-color: rgba(148,163,184,0.35);
          color: #0f172a;
          box-shadow: 0 12px 28px rgba(148,163,184,0.12);
        }
        .light .thai-history-muted { color: #64748b; }
        .light .thai-history-soft { color: #94a3b8; }
        .light .thai-history-table-head { background: rgba(241,245,249,0.9); border-color: rgba(148,163,184,0.3); }
        .light .thai-history-row { border-color: rgba(226,232,240,0.95); }
        .light .thai-history-row:hover { background: rgba(59,130,246,0.04); }
        .light .thai-history-filter-idle { color: #64748b; }
        .light .thai-history-filter-idle:hover { color: #0f172a; }
        .light .thai-history-title {
          background-image: linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #d97706 100%);
        }
        .light .thai-history-bet,
        .light .thai-history-amount {
          color: #0f172a;
        }
      `}</style>
    <div className="thai-history-shell min-h-screen bg-[#020810] text-white">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-blue-700/10 blur-[80px]" />
        <div className="absolute bottom-10 -left-16 h-64 w-64 rounded-full bg-yellow-600/6 blur-[70px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-4 pt-1 pb-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="thai-history-back mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-3 py-1.5 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/45 hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-[0.08em]">
            Back
          </span>
        </button>

        {/* HERO HEADER */}
        <div className="mb-4 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/8 px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
              Live Tracking
            </span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight">
            <span className="thai-history-title bg-gradient-to-br from-white via-blue-100 to-yellow-300 bg-clip-text text-transparent">
              Thai Bet History
            </span>
          </h1>
          <div className="mx-auto mt-1.5 h-px w-36 bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
          <p className="thai-history-muted mt-1.5 text-[11px] text-white/35 tracking-wide">
            All wagers · Real-time status · Full transparency
          </p>
        </div>

        {/* STATS ROW  */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            {
              icon: <TrendingUp className="h-3.5 w-3.5" />,
              val: total || bets.length,
              lbl: "Total Bets",
              color: "text-blue-400",
            },
            {
              icon: <Trophy className="h-3.5 w-3.5" />,
              val: fmtUsd(totalWon),
              lbl: "Total Won",
              color: "text-emerald-400",
            },
            {
              icon: <Clock className="h-3.5 w-3.5" />,
              val: fmtUsd(pendingCount),
              lbl: "Pending",
              color: "text-amber-400",
            },
          ].map((s) => (
            <div
              key={s.lbl}
              className="thai-history-stat relative overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] px-3 py-3 text-center"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
              <div className={`mb-1 flex justify-center ${s.color}`}>
                {s.icon}
              </div>
              <p className={`text-lg font-bold font-mono ${s.color}`}>
                {s.val}
              </p>
              <p className="thai-history-soft text-[9px] uppercase tracking-widest text-white/25 mt-0.5">
                {s.lbl}
              </p>
            </div>
          ))}
        </div>

        {/* FILTER TABS */}
        <div className="thai-history-filters mb-4 flex gap-1.5 rounded-2xl border border-[#0f2244] bg-[#060f22] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`flex-1 rounded-xl py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                statusFilter === f.value
                  ? "bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-900/50"
                  : "thai-history-filter-idle text-white/35 hover:text-white/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* TABLE CARD */}
        <div className="thai-history-table overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] shadow-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-600/50 to-yellow-600/30" />

          {/* Table Header */}
          <div className="thai-history-table-head grid grid-cols-[28px_88px_1fr_60px_72px] items-center gap-2 border-b border-[#0f2244]/70 bg-[#04091a]/60 px-4 py-2.5">
            {["#", "Games", "Bet", "Amt", "Status"].map((h, i) => (
              <span
                key={h}
                className={`thai-history-soft text-[9px] font-semibold uppercase tracking-widest text-white/25 ${i >= 3 ? "text-right" : ""}`}
              >
                {h}
              </span>
            ))}
          </div>

          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {!isLoading && bets.length === 0 && (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1a3060] bg-[#08122a]">
                <History className="h-7 w-7 text-blue-400/50" />
              </div>
              <p className="thai-history-muted text-sm font-semibold text-white/60">
                No bets found
              </p>
              <p className="thai-history-soft mt-1 text-xs text-white/25">
                Bets appear here after you play
              </p>
            </div>
          )}

          {!isLoading && bets.length > 0 && (
            <div>
              {bets.map((bet: any, idx: number) => {
                const cfg =
                  STATUS_CONFIG[bet.status] ?? STATUS_CONFIG["CANCELLED"];
                const serial = (page - 1) * LIMIT + idx + 1;
                const displayBetNumber =
                  bet.betNumber ??
                  bet.originalBetNumber ??
                  bet.oldBetNumber ??
                  "-";

                return (
                  <div
                    key={bet.id ?? idx}
                    className="thai-history-row border-b border-[#0a1a38]/60 px-4 py-3 transition-colors last:border-0 hover:bg-blue-500/3"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="grid grid-cols-[28px_88px_1fr_60px_72px] items-center gap-2">
                      {/* Serial */}
                      <span className="thai-history-soft text-[11px] font-mono font-semibold text-white/25">
                        {String(serial).padStart(2, "0")}
                      </span>

                      {/* Games Type */}
                      <div className="min-w-0">
                        <p className="thai-history-muted truncate text-[10px] text-white/55">
                          {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType ?? "-"}
                        </p>
                        <p className="thai-history-soft mt-0.5 truncate text-[9px] text-white/25">
                          {formatDateShort(bet.placedAt)}
                        </p>
                      </div>

                      {/* Bet Number */}
                      <div className="min-w-0">
                        <p className="thai-history-bet font-mono text-sm font-bold tracking-widest text-white leading-none">
                          {displayBetNumber}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="thai-history-amount text-[13px] font-bold text-white leading-none">
                          {fmtUsd(Number(bet.actualAmount ?? bet.amount ?? 0))}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex justify-end">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${cfg.cls}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`}
                          />
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {bet.confirmCode && (
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        {bet.confirmCode && (
                          <span className="thai-history-confirm rounded-md border border-[#2a3f7a] bg-[#0d183a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#71a6ff]">
                            #{bet.confirmCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="thai-history-pager-btn flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold disabled:opacity-30 hover:border-blue-700/50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="thai-history-soft font-mono text-xs text-white/30">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="thai-history-pager-btn flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold disabled:opacity-30 hover:border-blue-700/50 transition-colors"
            >
              Next <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
