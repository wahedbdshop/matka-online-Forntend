/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Zap, Info, Star } from "lucide-react";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";

const PLAY_TYPE_LABELS: Record<string, string> = {
  THREE_UP_DIRECT: "3Up Direct",
  THREE_UP_RUMBLE: "3Up Rumble",
  THREE_UP_SINGLE: "3Up Single Digit",
  THREE_UP_TOTAL: "3Up Game Total",
  TWO_UP_DIRECT: "2Up Direct",
  DOWN_DIRECT: "Down Direct",
  DOWN_SINGLE: "Down Single Digit",
  DOWN_TOTAL: "Down Game Total",
};

export default function GameRatePage() {
  const router = useRouter();
  const { data: ratesData, isLoading } = useQuery({
    queryKey: ["thai-rates-page"],
    queryFn: ThaiLotteryUserService.getRates,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const rates: any[] = ratesData?.data ?? [];

  const highest = rates.reduce(
    (max: any, r: any) =>
      Number(r.multiplier) > Number(max?.multiplier ?? 0) ? r : max,
    null,
  );

  return (
    <div className="min-h-screen bg-[#020810] text-white">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-blue-700/10 blur-[80px]" />
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-yellow-600/6 blur-[90px]" />
        <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-blue-500/5 blur-[60px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-4 pt-0.5 pb-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-0.5 inline-flex items-center gap-1.5 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-3 py-1.5 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f8fcc] hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-[0.08em]">
            Back
          </span>
        </button>

        {/* HERO HEADER */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/[0.08] shadow-[0_0_20px_rgba(234,179,8,0.1)]">
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/25 bg-yellow-500/[0.08] px-2.5 py-0.5">
            <Star className="h-2 w-2 text-yellow-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-yellow-400">
              Payout Table
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight">
            <span className="bg-gradient-to-br from-white via-blue-100 to-yellow-300 bg-clip-text text-transparent">
              Game Rates
            </span>
          </h1>
          <div className="mx-auto mt-1.5 h-px w-32 bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent" />
          <p className="mt-1.5 text-[11px] text-white/35 tracking-wide">
            Thai Lottery · Official payout multipliers
          </p>
        </div>

        {/* RATE TABLE */}
        <div className="overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] shadow-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-600/50 to-yellow-600/30" />

          {/* Header */}
          <div className="grid grid-cols-[36px_1fr_76px_80px] items-center gap-2 border-b-2 border-yellow-500/40 bg-yellow-500/[0.12] px-4 py-3">
            {[
              { label: "Sl.No", align: "" },
              { label: "Name", align: "" },
              { label: "Rate", align: "text-center" },
              { label: "Discount", align: "text-right" },
            ].map((h) => (
              <p
                key={h.label}
                className={`text-[10px] font-bold uppercase tracking-widest text-yellow-400 ${h.align}`}
              >
                {h.label}
              </p>
            ))}
          </div>

          {/* Skeleton */}
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 border-b border-[#0a1a38]/60 animate-pulse bg-slate-800/30"
              />
            ))}

          {/* Empty */}
          {!isLoading && rates.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">
              No rates found
            </div>
          )}

          {/* Rows */}
          {!isLoading &&
            rates.map((item: any, idx: number) => {
              const isGold = Number(item.multiplier) >= 500;
              const discount = Number(
                item.baseDiscountPct ?? 0,
              ) + Number(item.globalDiscountPct ?? 0);
              const hasDiscount = discount > 0;
              const label =
                PLAY_TYPE_LABELS[item.playType] ?? item.label ?? item.playType;

              return (
                <div
                  key={item.id ?? idx}
                  className={`grid grid-cols-[36px_1fr_76px_80px] items-center gap-2 border-b border-[#0a1a38]/60 px-4 py-3.5 transition-colors last:border-0 hover:bg-white/[0.02] ${
                    !item.isActive
                      ? "opacity-40"
                      : isGold
                        ? "bg-yellow-500/[0.04]"
                        : idx % 2 === 0
                          ? "bg-[#060f22]"
                          : "bg-[#04091a]/50"
                  }`}
                >
                  {/* Sl. No */}
                  <span className="font-mono text-xs font-bold text-white/25">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Name */}
                  <div className="flex min-w-0 items-center gap-2">
                    {isGold && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border border-yellow-500/30 bg-yellow-500/15">
                        <Star className="h-2.5 w-2.5 text-yellow-400" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p
                        className={`truncate text-[13px] font-semibold leading-snug ${
                          isGold ? "text-yellow-100" : "text-white/80"
                        }`}
                      >
                        {label}
                      </p>
                      {!item.isActive && (
                        <span className="text-[10px] text-red-400">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rate badge */}
                  <div className="flex justify-center">
                    <span
                      className={`rounded-lg border px-2 py-1 font-mono text-[11px] font-black ${
                        isGold
                          ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-400"
                          : "border-blue-500/20 bg-blue-500/[0.08] text-blue-400"
                      }`}
                    >
                      1 × {Number(item.multiplier)}
                    </span>
                  </div>

                  {/* Discount badge */}
                  <div className="flex justify-end">
                    {hasDiscount ? (
                      <div className="text-right">
                        <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400">
                          {discount}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        {/* INFO CARD */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22]">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/[0.08]">
                <Info className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                  How Payouts Work
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                  Rate = return per $1 bet. Discount shows the live admin-set
                  value for that game type. e.g.{" "}
                  <span className="font-semibold text-yellow-400">
                    3Up Direct
                  </span>{" "}
                  rate 1 × 500 with 5% discount means the effective value is{" "}
                  <span className="font-semibold text-yellow-400">1 × 475</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* HIGHLIGHT BAR */}
        {highest && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-[#0f0e04] to-[#060f22]">
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <p className="text-xs font-bold text-yellow-300">
                  Highest Payout
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/40">
                  {PLAY_TYPE_LABELS[highest.playType] ??
                    highest.label ??
                    highest.playType}
                </span>
                <span className="font-mono text-xl font-black text-yellow-400">
                  1 × {Number(highest.multiplier)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
