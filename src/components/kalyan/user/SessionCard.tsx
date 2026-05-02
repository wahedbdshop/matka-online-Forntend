"use client";

import { useRouter } from "next/navigation";
import { Ban, CircleSlash, Clock, PlayCircle, TimerOff } from "lucide-react";
import { MarketTiming } from "@/types/kalyan";
import {
  formatUtcScheduleTimeForLocalDisplay,
  hasUtcScheduleTimePassed,
} from "@/lib/timezone";
import { formatKalyanMarketTitle } from "@/lib/kalyan-market-display";

interface SessionCardProps {
  title: string;
  sessionType: "OPEN" | "CLOSE";
  marketId: string;
  playTypeSlug: string;
  timing?: MarketTiming;
  marketStatus?: "ACTIVE" | "INACTIVE" | "CANCELLED";
  currentDate?: Date | null;
}

function isSessionStillOpen(closeTime: string, date: Date): boolean {
  return !hasUtcScheduleTimePassed(closeTime, date);
}

function formatLocalTime(time?: string | null, date?: Date | null) {
  return formatUtcScheduleTimeForLocalDisplay(time, {
    baseDate: date ?? new Date(),
  });
}

// ─── Priority-ordered state resolution ───────────────────────────────────────
// Admin overrides (CANCELLED > INACTIVE/DAY_OFF) always win over time-based checks.
type CardState = "OPEN" | "CANCELLED" | "DAY_OFF" | "TIME_OVER";

function resolveCardState(
  marketStatus: "ACTIVE" | "INACTIVE" | "CANCELLED",
  timing: MarketTiming | undefined,
  currentDate: Date | null | undefined,
): CardState {
  // 1. Admin hard-cancelled the whole market
  if (marketStatus === "CANCELLED") return "CANCELLED";
  // 2. Admin marked the market inactive, show it with the same UI as day off
  if (marketStatus === "INACTIVE") return "DAY_OFF";
  // 3. Timing-level INACTIVE = scheduled day off
  if (timing?.status === "INACTIVE") return "DAY_OFF";
  // 4. No timing data at all → can't determine window → treat as time over
  if (!timing?.closeTime || !currentDate) return "TIME_OVER";

  // 5. Session stays playable until its configured close time
  if (isSessionStillOpen(timing.closeTime, currentDate)) {
    return "OPEN";
  }

  return "TIME_OVER";
}

// ─── Per-state visual config ──────────────────────────────────────────────────
const STATE_CONFIG: Record<
  CardState,
  {
    card: string;
    clockColor: string;
    actionNode: (args: { onClick?: () => void }) => React.ReactNode;
    badge?: React.ReactNode;
  }
> = {
  OPEN: {
    card: "cursor-pointer border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-green-100 shadow-[0_12px_30px_rgba(16,185,129,0.16)] hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_18px_42px_rgba(16,185,129,0.24)] dark:border-green-500/50 dark:from-green-900/60 dark:via-green-950/50 dark:to-slate-900/80 dark:shadow-[0_4px_24px_rgba(34,197,94,0.18)] dark:hover:border-green-400/70 dark:hover:shadow-[0_14px_36px_rgba(34,197,94,0.28)]",
    clockColor: "text-emerald-600 dark:text-green-300",
    actionNode: ({ onClick }) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(34,197,94,0.40)] transition-all hover:bg-green-400 active:scale-95"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        PLAY NOW
      </button>
    ),
  },
  CANCELLED: {
    card: "cursor-not-allowed border-rose-200 bg-gradient-to-br from-white via-rose-50 to-slate-100 opacity-80 shadow-[0_10px_26px_rgba(244,63,94,0.10)] dark:border-rose-500/30 dark:from-slate-900/90 dark:via-slate-800/70 dark:to-slate-900/90",
    clockColor: "text-rose-500/80 dark:text-rose-400/60",
    badge: (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300">
        <Ban className="h-3 w-3" />
        Cancelled
      </span>
    ),
    actionNode: () => (
      <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-[11px] font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-slate-800/60 dark:text-rose-300/70">
        <Ban className="h-3.5 w-3.5" />
        CANCELLED
      </div>
    ),
  },
  DAY_OFF: {
    card: "cursor-not-allowed border-red-200 bg-gradient-to-br from-white via-red-50 to-orange-50 shadow-[0_10px_26px_rgba(239,68,68,0.10)] dark:border-red-500/40 dark:from-red-900/55 dark:via-red-950/45 dark:to-slate-900/80 dark:shadow-[0_4px_18px_rgba(239,68,68,0.18)]",
    clockColor: "text-red-600 dark:text-red-300",
    actionNode: () => (
      <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-100 py-2 text-[11px] font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200">
        <CircleSlash className="h-3.5 w-3.5" />
        DAY OFF
      </div>
    ),
  },
  TIME_OVER: {
    card: "cursor-not-allowed border-red-200 bg-gradient-to-br from-white via-red-50 to-orange-50 shadow-[0_10px_26px_rgba(239,68,68,0.10)] dark:border-red-500/40 dark:from-red-900/55 dark:via-red-950/45 dark:to-slate-900/80 dark:shadow-[0_4px_18px_rgba(239,68,68,0.18)]",
    clockColor: "text-red-600 dark:text-red-300",
    actionNode: () => (
      <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-100 py-2 text-[11px] font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200">
        <TimerOff className="h-3.5 w-3.5" />
        TIME OVER
      </div>
    ),
  },
};

export function SessionCard({
  title,
  sessionType,
  marketId,
  playTypeSlug,
  timing,
  marketStatus = "ACTIVE",
  currentDate,
}: SessionCardProps) {
  const router = useRouter();
  const state = resolveCardState(marketStatus, timing, currentDate);
  const isOpen = state === "OPEN";
  const config = STATE_CONFIG[state];
  const displayTitle = formatKalyanMarketTitle(title);

  const handlePlay = () => {
    if (!isOpen) return;
    router.push(`/kalyan/${playTypeSlug}/${marketId}?session=${sessionType}`);
  };

  const sessionBadgeClass =
    sessionType === "OPEN"
      ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-green-500/50 dark:bg-green-500/20 dark:text-green-300"
      : "border-rose-300 bg-rose-100 text-rose-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300";

  return (
    <div
      onClick={isOpen ? handlePlay : undefined}
      role={isOpen ? "button" : undefined}
      tabIndex={isOpen ? 0 : -1}
      onKeyDown={(event) => {
        if (!isOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlePlay();
        }
      }}
      className={`flex flex-col gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${config.card}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-center text-[16px] font-extrabold leading-snug tracking-[0.01em] text-slate-950 dark:text-white">
          {displayTitle}
        </p>

        {/* Session type badge */}
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${sessionBadgeClass}`}>
          {sessionType === "OPEN" ? "Open" : "Close"}
        </span>

        {/* Admin-override badge — only shown for Cancelled / Suspended */}
        {config.badge}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Clock className={`h-3.5 w-3.5 shrink-0 ${config.clockColor}`} />
        {timing?.closeTime ? (
          <span className="text-base font-black text-slate-950 dark:text-white">
            {formatLocalTime(timing.closeTime, currentDate)}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">-</span>
        )}
      </div>

      {config.actionNode({ onClick: handlePlay })}
    </div>
  );
}
