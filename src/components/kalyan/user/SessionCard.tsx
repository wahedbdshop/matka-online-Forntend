"use client";

import { useRouter } from "next/navigation";
import { Clock, PlayCircle, TimerOff } from "lucide-react";
import { MarketTiming } from "@/types/kalyan";

interface SessionCardProps {
  title: string;
  sessionType: "OPEN" | "CLOSE";
  marketId: string;
  playTypeSlug: string;
  timing?: MarketTiming;
  marketStatus?: "ACTIVE" | "INACTIVE";
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isWithinWindow(openTime: string, closeTime: string): boolean {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= parseTimeToMinutes(openTime) && nowMin < parseTimeToMinutes(closeTime);
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function SessionCard({
  title,
  sessionType,
  marketId,
  playTypeSlug,
  timing,
  marketStatus = "ACTIVE",
}: SessionCardProps) {
  const router = useRouter();
  const isInactive = marketStatus === "INACTIVE" || timing?.status === "INACTIVE";

  const isOpen =
    !isInactive &&
    timing?.status === "ACTIVE" &&
    !!timing?.openTime &&
    !!timing?.closeTime &&
    isWithinWindow(timing.openTime, timing.closeTime);

  const handlePlay = () => {
    if (!isOpen) return;
    router.push(`/kalyan/${playTypeSlug}/${marketId}?session=${sessionType}`);
  };

  /* ── card styles per state ───────────────────────────────────────────── */
  const cardClass = isOpen
    ? "cursor-pointer border-green-500/50 bg-gradient-to-br from-green-900/60 via-green-950/50 to-slate-900/80 shadow-[0_4px_24px_rgba(34,197,94,0.18)] hover:-translate-y-0.5 hover:border-green-400/70 hover:shadow-[0_14px_36px_rgba(34,197,94,0.28)]"
    : isInactive
      ? "border-amber-500/40 bg-gradient-to-br from-amber-900/50 via-amber-950/40 to-slate-900/80 shadow-[0_4px_18px_rgba(217,119,6,0.18)] hover:-translate-y-0.5 hover:border-amber-400/55 hover:shadow-[0_14px_32px_rgba(217,119,6,0.22)]"
      : "border-red-500/40 bg-gradient-to-br from-red-900/55 via-red-950/45 to-slate-900/80 shadow-[0_4px_18px_rgba(239,68,68,0.18)] hover:-translate-y-0.5 hover:border-red-400/55 hover:shadow-[0_14px_32px_rgba(239,68,68,0.22)]";

  /* ── session badge ───────────────────────────────────────────────────── */
  const sessionBadgeClass =
    sessionType === "OPEN"
      ? "border-green-500/50 bg-green-500/20 text-green-300"
      : "border-red-500/50 bg-red-500/20 text-red-300";

  return (
    <div
      onClick={handlePlay}
      role={isOpen ? "button" : undefined}
      tabIndex={isOpen ? 0 : -1}
      onKeyDown={(event) => {
        if (!isOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlePlay();
        }
      }}
      className={`flex flex-col gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${cardClass}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-center text-[16px] font-extrabold leading-snug tracking-[0.01em] text-white">
          {title}
        </p>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${sessionBadgeClass}`}>
          {sessionType === "OPEN" ? "Open" : "Close"}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Clock className={`h-3.5 w-3.5 shrink-0 ${isOpen ? "text-green-300" : isInactive ? "text-amber-300" : "text-red-300"}`} />
        {timing?.closeTime ? (
          <span className="text-base font-black text-white">
            {fmt12(timing.closeTime)}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </div>

      {isOpen ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            handlePlay();
          }}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(34,197,94,0.40)] transition-all hover:bg-green-400 active:scale-95"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          PLAY NOW
        </button>
      ) : isInactive ? (
        <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 py-2 text-[11px] font-semibold text-amber-200">
          <TimerOff className="h-3.5 w-3.5" />
          INACTIVE
        </div>
      ) : (
        <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/20 py-2 text-[11px] font-semibold text-red-200">
          <TimerOff className="h-3.5 w-3.5" />
          TIME OVER
        </div>
      )}
    </div>
  );
}
