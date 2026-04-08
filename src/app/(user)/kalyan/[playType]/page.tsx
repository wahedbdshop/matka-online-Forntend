"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { Market, MarketTiming } from "@/types/kalyan";
import {
  PLAY_TYPE_SLUG_MAP,
  PLAY_TYPE_LABELS,
  PLAY_TYPE_DESCRIPTIONS,
} from "@/constants/kalyan-play-numbers";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { SessionCard } from "@/components/kalyan/user/SessionCard";
import { ErrorState } from "@/components/kalyan/user/ErrorState";
import { EmptyState } from "@/components/kalyan/user/EmptyState";

// ─── Flat item shape ──────────────────────────────────────────────────────────
interface SessionItem {
  key: string;
  marketId: string;
  title: string;
  sessionType: "OPEN" | "CLOSE";
  timing?: MarketTiming;
  marketStatus?: "ACTIVE" | "INACTIVE";
}

function sortMarketsByOldest<T extends { createdAt?: string; id?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function formatGameTitle(value?: string | null) {
  if (!value) return "Kalyan Game";

  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/(\bclose\b)(\s+\bclose\b)+/gi, "Close")
    .trim();

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-3.5 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-slate-700" />
      <div className="h-3 w-1/2 rounded bg-slate-700/60" />
      <div className="mt-auto h-8 w-full rounded-xl bg-slate-700/50" />
    </div>
  );
}

export default function MarketSelectionPage() {
  const params = useParams();
  const playTypeSlug = params.playType as string;
  const playTypeEnum = PLAY_TYPE_SLUG_MAP[playTypeSlug];

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const marketsRes = await KalyanUserService.getActiveMarkets();
      const markets: Market[] = sortMarketsByOldest(
        Array.isArray(marketsRes.data)
        ? marketsRes.data
        : Array.isArray(marketsRes.data?.markets)
          ? marketsRes.data.markets
          : [],
      );

      // Fetch all timings in parallel
      const timingResults = await Promise.allSettled(
        markets.map((m) => KalyanUserService.getMarketTiming(m.id)),
      );

      // Build flat session list: one card per timing entry
      const flat: SessionItem[] = [];
      markets.forEach((market, idx) => {
        const result = timingResults[idx];
        const timings: MarketTiming[] =
          result.status === "fulfilled"
            ? Array.isArray(result.value.data)
              ? result.value.data
              : result.value.data
                ? [result.value.data]
                : []
            : [];

        timings
          .filter((timing) =>
            playTypeEnum === "JORI" ? timing.sessionType === "OPEN" : true,
          )
          .forEach((timing) => {
          const rawTitle =
            timing.sessionType === "CLOSE"
              ? market.closeName ?? `${market.name} Close`
              : market.openName ?? market.name;

          flat.push({
            key: `${market.id}-${timing.sessionType}`,
            marketId: market.id,
            title: formatGameTitle(rawTitle),
            sessionType: timing.sessionType,
            timing,
            marketStatus: market.status,
          });
          });

        // If no timings returned, still show both sessions as TIME OVER
        if (timings.length === 0) {
          (playTypeEnum === "JORI" ? (["OPEN"] as const) : (["OPEN", "CLOSE"] as const)).forEach((st) => {
            const rawTitle =
              st === "CLOSE"
                ? market.closeName ?? `${market.name} Close`
                : market.openName ?? market.name;

            flat.push({
              key: `${market.id}-${st}`,
              marketId: market.id,
              title: formatGameTitle(rawTitle),
              sessionType: st,
              timing: undefined,
              marketStatus: market.status,
            });
          });
        }
      });

      setSessions(flat);
    } catch {
      setError("Failed to load markets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [playTypeEnum]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!playTypeEnum) {
    return (
      <div className="space-y-5 pb-6">
        <KalyanPageHeader title="Unknown Game" backHref="/kalyan" />
        <ErrorState message="Invalid play type selected." />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader
        title={PLAY_TYPE_LABELS[playTypeEnum] ?? playTypeSlug}
        subtitle={PLAY_TYPE_DESCRIPTIONS[playTypeEnum]}
        backHref="/kalyan"
      />

      {/* Section heading */}
      <p className="text-center text-base font-extrabold tracking-[0.06em] text-white sm:text-lg">
        Select Game
      </p>

      {/* Loading skeleton grid */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <ErrorState message={error} onRetry={fetchAll} />
      )}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          title="No markets available"
          description="No active markets found. Please check back later."
        />
      )}

      {/* Flat 2-column grid */}
      {!loading && !error && sessions.length > 0 && (() => {
        const openSessions = sessions.filter((item) => item.sessionType === "OPEN");
        const closeSessions = sessions.filter((item) => item.sessionType === "CLOSE");
        const showCloseColumn = playTypeEnum !== "JORI" && closeSessions.length > 0;

        // Jori: show all open cards in a 2-column grid (serial order left→right)
        if (playTypeEnum === "JORI") {
          return (
            <div className="grid grid-cols-2 gap-3">
              {openSessions.map((item) => (
                <SessionCard
                  key={item.key}
                  title={item.title}
                  sessionType={item.sessionType}
                  marketId={item.marketId}
                  playTypeSlug={playTypeSlug}
                  timing={item.timing}
                  marketStatus={item.marketStatus}
                />
              ))}
            </div>
          );
        }

        return (
          <div className={`grid gap-4 ${showCloseColumn ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-3">
              {openSessions.map((item) => (
                <SessionCard
                  key={item.key}
                  title={item.title}
                  sessionType={item.sessionType}
                  marketId={item.marketId}
                  playTypeSlug={playTypeSlug}
                  timing={item.timing}
                  marketStatus={item.marketStatus}
                />
              ))}
            </div>

            {showCloseColumn ? (
              <div className="space-y-3">
                {closeSessions.map((item) => (
                  <SessionCard
                    key={item.key}
                    title={item.title}
                    sessionType={item.sessionType}
                    marketId={item.marketId}
                    playTypeSlug={playTypeSlug}
                    timing={item.timing}
                    marketStatus={item.marketStatus}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}
