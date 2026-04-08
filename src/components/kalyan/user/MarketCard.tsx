"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, PlayCircle, TimerOff } from "lucide-react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { Market, MarketTiming } from "@/types/kalyan";

interface MarketCardProps {
  market: Market;
  playTypeSlug: string;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isWithinWindow(openTime: string, closeTime: string): boolean {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const open = parseTimeToMinutes(openTime);
  const close = parseTimeToMinutes(closeTime);
  return nowMin >= open && nowMin < close;
}

function fmt12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function MarketCard({ market, playTypeSlug }: MarketCardProps) {
  const router = useRouter();
  const [timings, setTimings] = useState<MarketTiming[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    KalyanUserService.getMarketTiming(market.id)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
        setTimings(data);
      })
      .catch(() => setTimings([]))
      .finally(() => setLoading(false));
  }, [market.id]);

  const navigate = (sessionType: "OPEN" | "CLOSE") => {
    router.push(`/kalyan/${playTypeSlug}/${market.id}?session=${sessionType}`);
  };

  const openTiming = timings.find((t) => t.sessionType === "OPEN");
  const closeTiming = timings.find((t) => t.sessionType === "CLOSE");

  const SESSION_LABELS = { OPEN: "Open", CLOSE: "Close" };

  const SessionRow = ({
    timing,
    sessionType,
  }: {
    timing?: MarketTiming;
    sessionType: "OPEN" | "CLOSE";
  }) => {
    const active =
      timing?.status === "ACTIVE" &&
      timing?.openTime &&
      timing?.closeTime &&
      isWithinWindow(timing.openTime, timing.closeTime);

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3 w-3 shrink-0 text-slate-500" />
          <span className="text-[11px] text-slate-400 font-medium">
            {SESSION_LABELS[sessionType]}
          </span>
          {timing?.openTime && (
            <span className="text-[10px] text-slate-500">
              {fmt12(timing.openTime)} – {fmt12(timing.closeTime)}
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-7 w-20 animate-pulse rounded-lg bg-slate-700/50" />
        ) : active ? (
          <button
            onClick={() => navigate(sessionType)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-700 transition-colors"
          >
            <PlayCircle className="h-3 w-3" />
            Play Now
          </button>
        ) : (
          <span className="flex items-center gap-1 rounded-lg bg-slate-700/60 border border-slate-600/40 px-3 py-1.5 text-[11px] font-semibold text-slate-500 cursor-not-allowed">
            <TimerOff className="h-3 w-3" />
            Time Over
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 space-y-3">
      <p className="text-sm font-bold text-white">{market.name}</p>
      <div className="space-y-2.5">
        <SessionRow timing={openTiming} sessionType="OPEN" />
        <div className="border-t border-slate-700/40" />
        <SessionRow timing={closeTiming} sessionType="CLOSE" />
      </div>
    </div>
  );
}
