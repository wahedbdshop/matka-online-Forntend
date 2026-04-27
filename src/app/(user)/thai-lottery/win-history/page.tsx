/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Trophy, Star, TrendingUp, Eye } from "lucide-react";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import {
  formatBangladeshDate,
  formatBangladeshTime,
} from "@/lib/bangladesh-time";

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

const formatDateShort = (date?: string): { top: string; btm: string } => {
  return {
    top: formatBangladeshDate(date),
    btm: date ? formatBangladeshTime(date) : "",
  };
};

// Single source of truth for table columns — 1fr columns for amounts so they flex
const GRID = "grid grid-cols-[18px_52px_66px_42px_1fr_1fr_28px] gap-1";

function SkeletonRow() {
  return (
    <div
      className={`${GRID} items-center px-3 py-3 border-b border-[#0f2244]/60`}
    >
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-[#101935] animate-pulse" />
      ))}
    </div>
  );
}

function BetDetailModal({
  bet,
  onClose,
  fmtUsd,
}: {
  bet: any;
  onClose: () => void;
  fmtUsd: (n: number) => string;
}) {
  const dt = formatDateShort(bet.settledAt ?? bet.placedAt);
  const betAmt = Number(bet.actualAmount ?? bet.amount ?? 0);
  const winAmt = Number(bet.actualWin ?? 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Bottom sheet: flex column so inner scroll works correctly */}
      <div
        className="thai-win-modal w-full max-w-[480px] max-h-[80vh] flex flex-col rounded-t-3xl border border-[#0f2244] bg-[#060f22] shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
        style={{ animation: "slideUp .22s cubic-bezier(.32,1.2,.55,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed drag handle — never scrolls away */}
        <div className="shrink-0 flex flex-col items-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-white/15" />
          <div className="mt-2 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain px-5 pb-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                <Trophy className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-white">Bet Detail</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Big number */}
          <div className="thai-win-modal-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <p className="thai-win-soft mb-1 text-[10px] uppercase tracking-widest text-white/30">
              Winning Number
            </p>
            <p className="font-mono text-4xl font-black tracking-[0.2em] text-white break-all">
              {bet.betNumber ?? "-"}
            </p>
            <span className="mt-3 inline-block rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
              {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType}
            </span>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { lbl: "Bet (USD)", val: fmtUsd(betAmt), green: false },
              { lbl: "Won (USD)", val: fmtUsd(winAmt), green: true },
              {
                lbl: "Settled",
                val: dt.top + (dt.btm ? ` · ${dt.btm}` : ""),
                green: false,
              },
              {
                lbl: "Round",
                val: `#${bet.round?.issueNumber ?? "-"}`,
                green: false,
              },
            ].map((item) => (
              <div
                key={item.lbl}
                className="thai-win-modal-card rounded-xl border border-[#0f2244] bg-[#04091a] p-3"
              >
                <p className="thai-win-soft text-[9px] uppercase tracking-widest text-white/30">
                  {item.lbl}
                </p>
                <p
                  className={`mt-1 text-sm font-bold font-mono break-words ${
                    item.green ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {item.val}
                </p>
              </div>
            ))}
          </div>

          {/* Confirm code */}
          {bet.confirmCode && (
            <div className="thai-win-confirm flex items-center justify-between gap-3 rounded-xl border border-[#2a3f7a] bg-[#0d183a] px-4 py-3">
              <p className="thai-win-soft text-[10px] uppercase tracking-widest text-white/30 shrink-0">
                Confirm Code
              </p>
              <span className="font-mono text-sm font-bold text-[#71a6ff] break-all text-right">
                #{bet.confirmCode}
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

export default function ThaiLotteryWinHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [selectedBet, setSelectedBet] = useState<any | null>(null);
  const fmtUsd = (usd: number) =>
    `$${Number(usd).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const { data, isLoading } = useQuery({
    queryKey: ["thai-win-history", page],
    queryFn: () =>
      ThaiLotteryUserService.getMyBets(undefined, page, LIMIT, "WON"),
  });

  const bets: any[] = data?.data?.bets ?? [];
  const total: number = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const totalWon = bets.reduce((s, b) => s + Number(b.actualWin ?? 0), 0);
  const totalBetAmt = bets.reduce(
    (s, b) => s + Number(b.actualAmount ?? b.amount ?? 0),
    0,
  );

  return (
    <>
      <style>{`
        .light .thai-win-shell { background: linear-gradient(180deg, #f8fbff 0%, #eefbf5 100%); color: #0f172a; }
        .light .thai-win-back,
        .light .thai-win-stat,
        .light .thai-win-table,
        .light .thai-win-pager-btn,
        .light .thai-win-modal,
        .light .thai-win-modal-card,
        .light .thai-win-confirm,
        .light .thai-win-chip {
          background: rgba(255,255,255,0.96);
          border-color: rgba(148,163,184,0.35);
          color: #0f172a;
        }
        .light .thai-win-table-head { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.18); }
        .light .thai-win-row { border-color: rgba(226,232,240,0.95); }
        .light .thai-win-row:hover { background: rgba(16,185,129,0.04); }
        .light .thai-win-muted { color: #64748b; }
        .light .thai-win-soft { color: #94a3b8; }
        .light .thai-win-modal strong,
        .light .thai-win-modal .text-white,
        .light .thai-win-modal-card .text-white { color: #0f172a; }
        .light .thai-win-modal button { color: #475569; }
        .light .thai-win-title {
          background-image: linear-gradient(135deg, #10b981 0%, #14b8a6 55%, #22c55e 100%);
        }
        .light .thai-win-number,
        .light .thai-win-bet-amount {
          color: #0f172a;
        }
        .light .thai-win-confirm-inline {
          color: #1d4ed8;
        }
      `}</style>
    <div className="thai-win-shell min-h-screen bg-[#020810] text-white">
      {/* bg glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-emerald-700/10 blur-[80px]" />
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-green-600/8 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-4 pt-0.5 pb-24">
        <button
          type="button"
          onClick={() => router.back()}
          className="thai-win-back mb-0.5 inline-flex items-center gap-1.5 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-3 py-1.5 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#4f8fcc] hover:text-white hover:shadow-[0_14px_30px_rgba(10,35,70,0.38)] active:scale-[0.98]"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-[0.08em]">
            Back
          </span>
        </button>

        {/* ── HERO ── */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/8 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Trophy className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
              Win Records
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="thai-win-title bg-gradient-to-br from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
              Winning History
            </span>
          </h1>
          <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
          <p className="thai-win-muted mt-1 text-xs text-white/35 tracking-wide">
            Your victories · All winning bets
          </p>
        </div>

        {/* ── STATS ── */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {[
            {
              icon: <Trophy className="h-3.5 w-3.5" />,
              val: String(total || bets.length),
              sub: null,
              lbl: "Total Wins",
              color: "text-emerald-400",
            },
            {
              icon: <TrendingUp className="h-3.5 w-3.5" />,
              val: fmtUsd(totalWon),
              sub: null,
              lbl: "Total Won",
              color: "text-yellow-400",
            },
            {
              icon: <Star className="h-3.5 w-3.5" />,
              val: fmtUsd(totalBetAmt),
              sub: null,
              lbl: "Bet Amt",
              color: "text-teal-400",
            },
          ].map((s) => (
            <div
              key={s.lbl}
              className="thai-win-stat relative overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] px-2 py-3 text-center"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-600/40 to-transparent" />
              <div className={`mb-1 flex justify-center ${s.color}`}>
                {s.icon}
              </div>
              <p
                className={`text-[13px] font-bold font-mono leading-tight ${s.color}`}
              >
                {s.val}
              </p>
              {s.sub && (
                <p className="thai-win-soft text-[9px] font-mono text-white/30 leading-tight mt-0.5 truncate px-1">
                  {s.sub}
                </p>
              )}
              <p className="thai-win-soft text-[9px] uppercase tracking-wider text-white/25 mt-1">
                {s.lbl}
              </p>
            </div>
          ))}
        </div>

        {/* ── TABLE ── */}
        <div className="thai-win-table overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] shadow-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-600/50 to-yellow-600/30" />

          {/* Header */}
          <div
            className={`thai-win-table-head ${GRID} items-center border-b-2 border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5`}
          >
            {["#", "Date", "Game Type", "Play Number", "USD", "Win", ""].map(
              (h, i) => (
                <span
                  key={i}
                  className={`text-[9px] font-bold uppercase tracking-widest text-emerald-400/70 ${
                    i === 3
                      ? "text-center"
                      : i >= 4 && i <= 5
                        ? "text-right"
                        : ""
                  }`}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {/* Skeleton */}
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

          {/* Empty */}
          {!isLoading && bets.length === 0 && (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/8">
                <Trophy className="h-7 w-7 text-emerald-400/50" />
              </div>
              <p className="thai-win-muted text-sm font-semibold text-white/60">
                No winning history found
              </p>
              <p className="thai-win-soft mt-1 text-xs text-white/25">Win</p>
            </div>
          )}

          {/* Rows — entire row is the tap target */}
          {!isLoading && bets.length > 0 && (
            <div>
              {bets.map((bet: any, idx: number) => {
                const serial = (page - 1) * LIMIT + idx + 1;
                const dt = formatDateShort(bet.settledAt ?? bet.placedAt);
                const betAmt = Number(bet.actualAmount ?? bet.amount ?? 0);

                const winAmt = Number(bet.actualWin ?? 0);

                return (
                  <div
                    key={bet.id ?? idx}
                    onClick={() => setSelectedBet(bet)}
                    className={`thai-win-row ${GRID} items-center border-b border-[#0a1a38]/60 px-3 py-3 last:border-0 hover:bg-emerald-500/5 active:bg-white/5 transition-colors cursor-pointer`}
                  >
                    {/* # */}
                    <span className="thai-win-soft font-mono text-[10px] font-semibold text-white/25">
                      {String(serial).padStart(2, "0")}
                    </span>

                    {/* Date */}
                    <div className="leading-snug min-w-0">
                      <p className="thai-win-muted text-[9px] text-white/50 truncate">
                        {dt.top}
                      </p>
                      <p className="thai-win-soft text-[9px] text-white/25">{dt.btm}</p>
                    </div>

                    {/* Game */}
                    <div className="min-w-0">
                      <span className="thai-win-chip inline-block rounded-md border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 leading-tight max-w-full truncate">
                        {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType}
                      </span>
                    </div>

                    {/* Number */}
                    <div className="text-center">
                      <span className="thai-win-number font-mono text-[13px] font-black tracking-widest text-white">
                        {bet.betNumber ?? "-"}
                      </span>
                      {bet.confirmCode && (
                        <p className="thai-win-confirm thai-win-confirm-inline mt-0.5 font-mono text-[9px] font-bold text-[#71a6ff]">
                          #{bet.confirmCode}
                        </p>
                      )}
                    </div>

                    {/* Bet Amount */}
                    <div className="text-right min-w-0">
                      <p className="thai-win-bet-amount font-mono text-[11px] font-bold text-white truncate">
                        {fmtUsd(betAmt)}
                      </p>
                    </div>

                    {/* Win Amount */}
                    <div className="text-right min-w-0">
                      <p className="font-mono text-[11px] font-bold text-emerald-400 truncate">
                        {fmtUsd(winAmt)}
                      </p>
                    </div>

                    {/* Eye — visual only */}
                    <div className="flex justify-center">
                      <Eye className="h-3.5 w-3.5 text-blue-500/70" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="thai-win-pager-btn flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-emerald-700/50 hover:shadow-[0_12px_24px_rgba(16,185,129,0.12)] active:scale-[0.98] disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="thai-win-soft font-mono text-xs text-white/30">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="thai-win-pager-btn flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-emerald-700/50 hover:shadow-[0_12px_24px_rgba(16,185,129,0.12)] active:scale-[0.98] disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              Next <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Modal via portal into document.body */}
      {selectedBet && (
        <BetDetailModal
          bet={selectedBet}
          onClose={() => setSelectedBet(null)}
          fmtUsd={fmtUsd}
        />
      )}
    </div>
    </>
  );
}
