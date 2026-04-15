/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ReceiptText } from "lucide-react";
import { ThaiPublicResultService } from "@/services/thai-public-result.service";
import { formatBangladeshDate } from "@/lib/bangladesh-time";

const LIMIT = 20;

const formatDate = (
  date?: string,
): { compact: string; year: string } => {
  if (!date) return { compact: "-", year: "-" };
  return {
    compact: formatBangladeshDate(date, {
      locale: "en-GB",
      day: "2-digit",
      month: "short",
      year: undefined,
    }),
    year: formatBangladeshDate(date, {
      locale: "en-GB",
      year: "2-digit",
      month: undefined,
      day: undefined,
    }),
  };
};

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1.1fr_0.75fr_0.75fr] items-center rounded-[22px] border border-[#153055] bg-[#071427] px-4 py-4 shadow-[0_12px_28px_rgba(2,8,20,0.28)]">
      <div className="space-y-1.5">
        <div className="h-4 w-24 animate-pulse rounded-lg bg-[#142848]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#142848]" />
      </div>
      <div className="mx-auto h-12 w-20 animate-pulse rounded-2xl bg-[#142848]" />
      <div className="mx-auto h-12 w-20 animate-pulse rounded-2xl bg-[#142848]" />
    </div>
  );
}

export default function ThaiLotteryResultsPage({
  publicView = false,
}: {
  publicView?: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["thai-results", page],
    queryFn: () => ThaiPublicResultService.getFeed(page, LIMIT),
  });

  const results = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-[#020810] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-violet-700/10 blur-[80px]" />
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-yellow-600/6 blur-[90px]" />
        <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-blue-500/5 blur-[60px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-4 pt-0.5 pb-20 space-y-4.5">
        {!publicView && (
          <>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-3 py-1.5 text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/45 hover:text-white"
              aria-label="Go back"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold tracking-[0.08em]">
                Back
              </span>
            </button>

            <div className="text-center">
              <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/8 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                <ReceiptText className="h-5.5 w-5.5 text-violet-400" />
              </div>

              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                  Draw History
                </span>
              </div>

              <h1 className="text-[28px] font-extrabold tracking-tight">
                <span className="bg-gradient-to-br from-white via-violet-100 to-yellow-300 bg-clip-text text-transparent">
                  Lottery Results
                </span>
              </h1>

              <div className="mx-auto mt-1.5 h-px w-40 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
              <p className="mt-1.5 text-[11px] text-white/35 tracking-wide">
                Thai Lottery · Public draw results
              </p>
            </div>
          </>
        )}

        {isLoading && (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && (
          <div className="overflow-hidden border border-[#0f2244] bg-[#060f22] py-16 text-center">
            <div className="mb-10 h-px bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/8">
              <ReceiptText className="h-7 w-7 text-violet-400/50" />
            </div>
            <p className="text-sm font-semibold text-white/60">No results yet</p>
            <p className="mt-1 text-xs text-white/25">
              Results will appear after each draw
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1.1fr_0.75fr_0.75fr] items-center rounded-[18px] border border-[#173866] bg-[#0d223f] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
              <div className="text-left text-slate-200">Date</div>
              <div className="text-violet-300">3Up</div>
              <div className="text-yellow-300">Down</div>
            </div>

            <div className="space-y-3">
              {results.map((item: any, idx: number) => {
                const dt = formatDate(item.drawDate);
                const threeUp =
                  item.threeUpDirect ||
                  (Array.isArray(item.firstThreeDigits) &&
                  item.firstThreeDigits.length > 0
                    ? item.firstThreeDigits.join(" ")
                    : "-");
                const down: string = item.downDirect || item.lastTwoDigits || "-";
                const rowTone =
                  idx % 2 === 0
                    ? "from-[#08172c] via-[#0c1d37] to-[#0b1b31]"
                    : "from-[#0b1b31] via-[#10233f] to-[#0d2038]";

                return (
                  <div
                    key={item.id ?? idx}
                    className={`grid grid-cols-[1.1fr_0.75fr_0.75fr] items-center rounded-[22px] border border-[#143156] bg-gradient-to-r ${rowTone} px-4 py-4 text-white shadow-[0_16px_32px_rgba(2,8,20,0.22)]`}
                  >
                    <div className="text-left">
                      <p className="text-[14px] font-bold leading-none text-white">
                        {dt.compact}
                      </p>
                      <p className="mt-1 text-[12px] font-semibold tracking-[0.08em] text-slate-400">
                        {dt.year}
                      </p>
                    </div>

                    <div className="mx-auto flex min-h-12 min-w-[84px] items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 text-center font-mono text-[20px] font-black tracking-[0.16em] text-violet-200">
                      {threeUp}
                    </div>

                    <div className="mx-auto flex min-h-12 min-w-[76px] items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-3 text-center font-mono text-[20px] font-black tracking-[0.16em] text-yellow-200">
                      {down}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold transition-colors hover:border-violet-700/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="font-mono text-xs text-white/30">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-10 items-center gap-1.5 rounded-[14px] border border-[#0f2244] bg-[#060f22] px-4 text-sm font-semibold transition-colors hover:border-violet-700/50 disabled:opacity-30"
            >
              Next
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
