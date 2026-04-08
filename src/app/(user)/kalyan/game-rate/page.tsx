"use client";

import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Percent, TrendingUp } from "lucide-react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { PLAY_TYPE_LABEL, type PlayType, type Rate } from "@/types/kalyan";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { LoadingState } from "@/components/kalyan/user/LoadingState";
import { ErrorState } from "@/components/kalyan/user/ErrorState";

const RATE_CARD_COLORS: Record<string, { bg: string; icon: string; badge: string }> = {
  GAME_TOTAL:   { bg: "from-blue-600/20 to-blue-500/5 border-blue-500/20",   icon: "bg-blue-500/15 text-blue-400",   badge: "text-blue-300" },
  SINGLE_PATTI: { bg: "from-emerald-600/20 to-emerald-500/5 border-emerald-500/20", icon: "bg-emerald-500/15 text-emerald-400", badge: "text-emerald-300" },
  DOUBLE_PATTI: { bg: "from-purple-600/20 to-purple-500/5 border-purple-500/20", icon: "bg-purple-500/15 text-purple-400", badge: "text-purple-300" },
  TRIPLE_PATTI: { bg: "from-orange-600/20 to-orange-500/5 border-orange-500/20", icon: "bg-orange-500/15 text-orange-400", badge: "text-orange-300" },
  JORI:         { bg: "from-pink-600/20 to-pink-500/5 border-pink-500/20",   icon: "bg-pink-500/15 text-pink-400",   badge: "text-pink-300" },
};

const EXAMPLE_BET_AMOUNT = 100;
const PLAY_TYPES = Object.keys(PLAY_TYPE_LABEL) as PlayType[];

function isPlayType(value: unknown): value is PlayType {
  return typeof value === "string" && PLAY_TYPES.includes(value as PlayType);
}

export function KalyanGameRatePageContent({ backHref = "/kalyan" }: { backHref?: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kalyan-public-rates"],
    queryFn: () => KalyanUserService.getGameRates(),
  });

  const rates: Rate[] = Array.isArray(data?.data) ? (data.data as Rate[]) : [];

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader title="Game Rate" subtitle="Payout multipliers per play type" backHref={backHref} />

      <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          The shown rate means the total payout for a
          <span className="text-white font-semibold"> Rs. {EXAMPLE_BET_AMOUNT}</span> bet.
          For smaller bets, payout is calculated proportionally.
          Rates are subject to change.
        </p>
      </div>

      {isLoading && <LoadingState message="Loading rates..." rows={5} />}

      {isError && !isLoading && (
        <ErrorState message="Failed to load game rates." onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {rates.map((rate) => {
            const playType = isPlayType(rate.playType) ? rate.playType : undefined;
            const colors = (playType ? RATE_CARD_COLORS[playType] : undefined) ?? {
              bg: "from-slate-700/30 to-slate-600/5 border-slate-600/20",
              icon: "bg-slate-600/15 text-slate-300",
              badge: "text-slate-300",
            };
            const label = playType ? PLAY_TYPE_LABEL[playType] : String(rate.playType ?? "");

            return (
              <div
                key={String(rate.playType)}
                className={`group rounded-2xl border bg-gradient-to-r ${colors.bg} p-4 shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:brightness-110 hover:shadow-[0_22px_48px_rgba(59,130,246,0.18)]`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon} transition-transform duration-300 group-hover:scale-110`}>
                      <Percent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Status: <span className={rate.status === "ACTIVE" ? "text-green-400" : "text-red-400"}>{rate.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-2xl font-bold ${colors.badge}`}>
                      <IndianRupee className="h-5 w-5" />
                      {rate.rate}
                    </div>
                    <p className="mt-0.5 text-[12px] font-semibold text-slate-300">
                      for Rs. {EXAMPLE_BET_AMOUNT} bet
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && rates.length > 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
          <div className="bg-slate-700/50 px-4 py-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Example Payouts
            </span>
          </div>
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              <span>Play Type</span>
              <span className="text-center">Bet Rs.</span>
              <span className="text-right">Win Rs.</span>
            </div>
            {rates.slice(0, 5).map((rate) => {
              const playType = isPlayType(rate.playType) ? rate.playType : undefined;

              return (
              <div key={String(rate.playType)} className="grid grid-cols-3 text-xs text-slate-300 py-1.5 border-t border-slate-700/30">
                <span className="text-slate-400">{playType ? PLAY_TYPE_LABEL[playType] : String(rate.playType ?? "")}</span>
                <span className="text-center">{EXAMPLE_BET_AMOUNT}</span>
                <span className="text-right font-bold text-green-400">{Number(rate.rate).toLocaleString("en-IN")}</span>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GameRatePage() {
  return <KalyanGameRatePageContent />;
}
