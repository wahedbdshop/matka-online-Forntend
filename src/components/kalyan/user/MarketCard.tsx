"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleSlash, Clock, PlayCircle, TimerOff } from "lucide-react";
import {
  formatUtcScheduleRangeForLocalDisplay,
  isCurrentWithinUtcScheduleWindow,
} from "@/lib/timezone";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { Market, MarketTiming } from "@/types/kalyan";

interface MarketCardProps {
  market: Market;
  playTypeSlug: string;
}

export function MarketCard({ market, playTypeSlug }: MarketCardProps) {
  const router = useRouter();
  const [timings, setTimings] = useState<MarketTiming[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    KalyanUserService.getMarketTiming(market.id)
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data
            ? [res.data]
            : [];
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

  const sessionLabels = { OPEN: "Open", CLOSE: "Close" } as const;

  const SessionRow = ({
    timing,
    sessionType,
  }: {
    timing?: MarketTiming;
    sessionType: "OPEN" | "CLOSE";
  }) => {
    const isDayOff =
      market.status === "INACTIVE" || timing?.status === "INACTIVE";

    const active =
      !isDayOff &&
      timing?.status === "ACTIVE" &&
      !!timing?.openTime &&
      !!timing?.closeTime &&
      isCurrentWithinUtcScheduleWindow(timing.openTime, timing.closeTime);

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Clock className="h-3 w-3 shrink-0 text-slate-500" />
          <span className="text-[11px] font-medium text-slate-400">
            {sessionLabels[sessionType]}
          </span>
          {timing?.openTime ? (
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-500">
                {formatUtcScheduleRangeForLocalDisplay(timing.openTime, timing.closeTime)}
              </span>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="h-7 w-20 animate-pulse rounded-lg bg-slate-700/50" />
        ) : active ? (
          <button
            onClick={() => navigate(sessionType)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-green-700"
          >
            <PlayCircle className="h-3 w-3" />
            Play Now
          </button>
        ) : isDayOff ? (
          <span className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-200">
            <CircleSlash className="h-3 w-3" />
            Day Off
          </span>
        ) : (
          <span className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-600/40 bg-slate-700/60 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
            <TimerOff className="h-3 w-3" />
            Time Over
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
      <p className="text-sm font-bold text-white">{market.name}</p>
      <div className="space-y-2.5">
        <SessionRow timing={openTiming} sessionType="OPEN" />
        <div className="border-t border-slate-700/40" />
        <SessionRow timing={closeTiming} sessionType="CLOSE" />
      </div>
    </div>
  );
}
