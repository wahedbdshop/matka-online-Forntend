/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ListOrdered, Star } from "lucide-react";
import { ThaiPublicResultService } from "@/services/thai-public-result.service";
import { formatBangladeshDate } from "@/lib/bangladesh-time";

const LIMIT = 20;

const formatDate = (date?: string) => {
  if (!date) return "-";

  return formatBangladeshDate(date, {
    locale: "en-GB",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-");
};

function ResultBox({
  value,
  tone,
  className = "",
}: {
  value: string;
  tone: "three-up" | "two-up" | "two-down";
  className?: string;
}) {
  return (
    <div
      className={`thai-result-number-box thai-result-number-box--${tone} flex min-h-[52px] items-center justify-center rounded-[10px] px-2 py-2 text-center sm:min-h-[60px] sm:px-3 sm:py-3 ${className}`}
    >
      <span className="thai-result-number text-[17px] font-bold tracking-[0.04em] sm:text-[20px]">
        {value}
      </span>
    </div>
  );
}

function HeaderMetric({
  label,
  stars,
}: {
  label: string;
  stars: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="thai-result-metric-label text-[11px] font-semibold uppercase tracking-[0.08em]">
        {label}
      </span>
      <div className="thai-result-star-row flex items-center gap-0.5">
        {Array.from({ length: stars }).map((_, index) => (
          <Star key={`${label}-${index}`} className="h-3.5 w-3.5 fill-current" />
        ))}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="thai-result-row-shell rounded-[10px] p-[1px]">
      <div className="thai-result-row grid grid-cols-[1.35fr_0.9fr_0.9fr_0.9fr] items-center gap-2 rounded-[10px] px-3 py-3 sm:px-4 sm:py-4">
        <div className="space-y-2">
          <div className="h-5 w-28 animate-pulse rounded-full bg-current/10" />
        </div>
        <div className="h-12 animate-pulse rounded-none bg-current/10 sm:h-14" />
        <div className="h-12 animate-pulse rounded-none bg-current/10 sm:h-14" />
        <div className="h-12 animate-pulse rounded-none bg-current/10 sm:h-14" />
      </div>
    </div>
  );
}

export default function ThaiLotteryResultsView({
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
    <>
      <style>{`
        .thai-result-shell {
          position: relative;
          overflow: hidden;
          border-radius: 0;
        }

        .thai-result-shell::before,
        .thai-result-shell::after {
          content: "";
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(56px);
          opacity: 0.95;
        }

        .thai-result-shell::before {
          top: -110px;
          left: 50%;
          width: 320px;
          height: 220px;
          transform: translateX(-50%);
        }

        .thai-result-shell::after {
          right: -80px;
          bottom: 90px;
          width: 220px;
          height: 220px;
        }

        .thai-result-inner {
          position: relative;
          z-index: 1;
        }

        .thai-result-icon-wrap {
          box-shadow: 0 18px 40px rgba(91, 156, 245, 0.24);
        }

        .thai-result-number-box {
          position: relative;
          overflow: hidden;
          transform: translateZ(0);
        }

        .thai-result-number-box::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(120deg, rgba(255, 255, 255, 0.03), transparent 55%);
          opacity: 0.12;
          pointer-events: none;
        }

        .thai-result-number-box::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 5px;
          height: 6px;
          border-radius: 999px;
          opacity: 0.96;
          filter: blur(0.4px);
          pointer-events: none;
        }

        .thai-result-number-box--three-up::after {
          background: linear-gradient(90deg, rgba(255, 181, 92, 0.08), rgba(255, 181, 92, 0.98), rgba(255, 181, 92, 0.08));
        }

        .thai-result-number-box--two-up::after {
          background: linear-gradient(90deg, rgba(120, 206, 255, 0.08), rgba(120, 206, 255, 0.98), rgba(120, 206, 255, 0.08));
        }

        .thai-result-number-box--two-down::after {
          background: linear-gradient(90deg, rgba(173, 138, 255, 0.08), rgba(173, 138, 255, 0.98), rgba(173, 138, 255, 0.08));
        }

        .thai-result-number {
          position: relative;
          z-index: 1;
        }

        .thai-result-row-shell {
          position: relative;
          box-shadow: 0 18px 45px rgba(163, 148, 130, 0.12);
          transform: translateZ(0);
          isolation: isolate;
        }

        .thai-result-row-shell::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 28%);
          opacity: 0.9;
          transform-origin: center top;
          animation: thai-card-sheen 6.5s ease-in-out infinite;
          z-index: 0;
          pointer-events: none;
        }

        .thai-result-row-shell::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 12px;
          opacity: 0.88;
          background-size: 220% 220%;
          animation: thai-card-border-flow 8s linear infinite;
          z-index: 0;
          pointer-events: none;
        }

        .thai-result-row {
          position: relative;
          overflow: hidden;
          transform: translateZ(0);
          z-index: 1;
        }

        .thai-result-row::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 26%);
          pointer-events: none;
        }

        @keyframes thai-card-sheen {
          0%,
          100% {
            opacity: 0.82;
            transform: translate3d(0, 0, 0) scaleX(1);
          }
          50% {
            opacity: 1;
            transform: translate3d(0, 1px, 0) scaleX(1.02);
          }
        }

        @keyframes thai-card-border-flow {
          0% {
            background-position: 0% 50%;
            filter: brightness(0.96);
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.08);
          }
          100% {
            background-position: 0% 50%;
            filter: brightness(0.96);
          }
        }

        .thai-result-page-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        @media (prefers-reduced-motion: reduce) {
          .thai-result-icon-wrap,
          .thai-result-row-shell,
          .thai-result-row-shell::before,
          .thai-result-row-shell::after,
          .thai-result-number-box::before {
            animation: none !important;
          }
        }

        .light .thai-result-shell {
          background:
            radial-gradient(circle at top, rgba(255, 154, 127, 0.33), transparent 34%),
            radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.9), transparent 42%),
            linear-gradient(180deg, #fbf7f2 0%, #f8f4ef 42%, #f3f0ec 100%);
          color: #2d2745;
          box-shadow: 0 30px 80px rgba(207, 188, 167, 0.28);
        }

        .light .thai-result-shell::before {
          background: rgba(255, 133, 102, 0.42);
        }

        .light .thai-result-shell::after {
          background: rgba(196, 220, 255, 0.5);
        }

        .light .thai-result-back {
          background: rgba(255, 244, 238, 0.92);
          border-color: rgba(230, 207, 191, 0.84);
          color: #2c2455;
          box-shadow: 0 12px 28px rgba(225, 198, 178, 0.28);
        }

        .light .thai-result-icon-card {
          background:
            linear-gradient(180deg, rgba(254, 239, 217, 0.95), rgba(240, 246, 255, 0.98));
          border-color: rgba(204, 216, 244, 0.8);
          color: #b58c46;
        }

        .light .thai-result-kicker {
          color: #22316c;
        }

        .light .thai-result-title {
          color: #b7925d;
          text-shadow: 0 8px 25px rgba(201, 171, 126, 0.14);
        }

        .light .thai-result-subtitle,
        .light .thai-result-date-label,
        .light .thai-result-metric-label {
          color: rgba(76, 72, 87, 0.58);
        }

        .light .thai-result-star-row,
        .light .thai-result-number {
          color: #c29a58;
        }

        .light .thai-result-row-shell {
          background: rgba(231, 220, 209, 0.72);
          box-shadow:
            0 18px 36px rgba(206, 191, 176, 0.2),
            0 3px 0 rgba(255, 255, 255, 0.55);
        }

        .light .thai-result-row-shell::after {
          background:
            linear-gradient(120deg, rgba(255, 191, 122, 0.5), rgba(129, 205, 255, 0.38), rgba(184, 149, 255, 0.46), rgba(255, 191, 122, 0.5));
        }

        .light .thai-result-row {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(230, 220, 210, 0.95);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.96),
            inset 0 -1px 0 rgba(225, 214, 205, 0.72),
            0 12px 26px rgba(214, 200, 187, 0.12);
        }

        .light .thai-result-date {
          color: #86818f;
        }

        .light .thai-result-number-box {
          background:
            linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(252, 247, 240, 0.98));
          border: 1px solid rgba(225, 213, 199, 0.92);
          color: #d8b882;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(223, 214, 205, 0.7),
            0 14px 26px rgba(222, 204, 183, 0.24);
        }

        .light .thai-result-number-box::before {
          background-image:
            linear-gradient(120deg, rgba(255, 193, 111, 0.14), rgba(122, 208, 255, 0.1), rgba(180, 147, 255, 0.14));
          background-size: 180% 180%;
          opacity: 0.22;
        }

        .light .thai-result-empty,
        .light .thai-result-page-btn {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(230, 220, 210, 0.95);
          color: #7d6c57;
          box-shadow: 0 14px 28px rgba(206, 191, 176, 0.18);
        }

        .light .thai-result-page-indicator {
          color: rgba(125, 108, 87, 0.7);
        }

        .dark .thai-result-shell {
          background:
            radial-gradient(circle at top, rgba(128, 88, 224, 0.34), transparent 32%),
            radial-gradient(circle at 85% 82%, rgba(66, 92, 188, 0.16), transparent 26%),
            linear-gradient(180deg, #1d1834 0%, #171229 44%, #120f21 100%);
          color: #f8f5ff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 28px 80px rgba(3, 2, 16, 0.34);
        }

        .dark .thai-result-shell::before {
          background: rgba(129, 90, 236, 0.24);
        }

        .dark .thai-result-shell::after {
          background: rgba(90, 128, 255, 0.14);
        }

        .dark .thai-result-back {
          background: rgba(35, 29, 64, 0.78);
          border-color: rgba(112, 94, 182, 0.52);
          color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
        }

        .dark .thai-result-icon-card {
          background:
            linear-gradient(180deg, rgba(51, 41, 96, 0.82), rgba(28, 24, 55, 0.92));
          border-color: rgba(125, 107, 198, 0.4);
          color: #f0d693;
        }

        .dark .thai-result-kicker {
          color: #cdbfff;
        }

        .dark .thai-result-title {
          color: #f2d898;
          text-shadow: 0 8px 24px rgba(245, 204, 122, 0.1);
        }

        .dark .thai-result-subtitle,
        .dark .thai-result-date-label,
        .dark .thai-result-metric-label {
          color: rgba(244, 240, 255, 0.68);
        }

        .dark .thai-result-star-row,
        .dark .thai-result-number {
          color: #f0d28a;
        }

        .dark .thai-result-row-shell {
          background: rgba(102, 82, 171, 0.56);
          box-shadow:
            0 18px 34px rgba(0, 0, 0, 0.22),
            0 2px 0 rgba(143, 119, 227, 0.26);
        }

        .dark .thai-result-row-shell::after {
          background:
            linear-gradient(120deg, rgba(245, 191, 96, 0.42), rgba(90, 205, 255, 0.28), rgba(149, 111, 255, 0.46), rgba(245, 191, 96, 0.42));
        }

        .dark .thai-result-row {
          background: linear-gradient(180deg, rgba(31, 25, 56, 0.96), rgba(24, 20, 43, 0.98));
          border: 1px solid rgba(102, 82, 171, 0.62);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(111, 92, 184, 0.12),
            0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .dark .thai-result-date {
          color: rgba(241, 236, 255, 0.9);
        }

        .dark .thai-result-number-box {
          background:
            linear-gradient(180deg, rgba(45, 37, 80, 0.95), rgba(30, 24, 55, 0.98));
          border: 1px solid rgba(108, 89, 178, 0.62);
          color: #f5d997;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(76, 61, 132, 0.4),
            0 14px 26px rgba(0, 0, 0, 0.24);
        }

        .dark .thai-result-number-box::before {
          background-image:
            linear-gradient(120deg, rgba(248, 191, 93, 0.14), rgba(86, 206, 255, 0.1), rgba(159, 124, 255, 0.18));
          background-size: 180% 180%;
          opacity: 0.24;
        }

        .dark .thai-result-empty,
        .dark .thai-result-page-btn {
          background: rgba(34, 28, 60, 0.88);
          border-color: rgba(102, 82, 171, 0.56);
          color: rgba(255, 255, 255, 0.86);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
        }

        .dark .thai-result-page-indicator {
          color: rgba(233, 227, 255, 0.62);
        }
      `}</style>

      <section className="thai-result-shell min-h-[calc(100vh-7.5rem)]">
        <div className="thai-result-inner mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-[480px] flex-col px-5 pt-3 pb-8">
          <div className="mb-5 flex items-center justify-between">
            {publicView ? (
                <Link
                  href="/"
                  className="thai-result-back inline-flex h-12 items-center gap-2 rounded-[14px] border px-4 text-sm font-semibold"
                >
                <ChevronLeft className="h-5 w-5" />
                <span>Lottery</span>
              </Link>
            ) : (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="thai-result-back inline-flex h-12 items-center gap-2 rounded-[14px] border px-4 text-sm font-semibold"
                  aria-label="Go back"
                >
                <ChevronLeft className="h-5 w-5" />
                <span>Lottery</span>
              </button>
            )}
          </div>

          <div className="mb-8 -mt-1 text-center">
            <div className="thai-result-icon-wrap thai-result-icon-card mx-auto mb-4 flex h-[74px] w-[74px] items-center justify-center rounded-none border">
              <ListOrdered className="h-9 w-9" strokeWidth={1.75} />
            </div>
            <p className="thai-result-kicker text-base font-semibold uppercase tracking-[0.06em]">
              Thai Lottery
            </p>
            <h1 className="thai-result-title mt-3 px-2 text-center text-[clamp(1.45rem,5.8vw,2.2rem)] font-medium leading-[1.08] tracking-[-0.045em] sm:whitespace-nowrap">
              Thai Lottery Results
            </h1>
          </div>

          <div className="mb-4 grid grid-cols-[1.35fr_0.9fr_0.9fr_0.9fr] items-end gap-3 px-2">
            <div className="thai-result-date-label text-left text-[14px] font-semibold">
              Date
            </div>
            <HeaderMetric label="3Up" stars={3} />
            <HeaderMetric label="2Up" stars={2} />
            <HeaderMetric label="2Down" stars={2} />
          </div>

          <div className="space-y-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}

            {!isLoading && results.length === 0 && (
              <div className="thai-result-empty rounded-[30px] border px-6 py-14 text-center">
                <p className="text-lg font-semibold">No results yet</p>
                <p className="thai-result-subtitle mt-2 text-sm">
                  Results will appear here after each draw.
                </p>
              </div>
            )}

            {!isLoading &&
              results.length > 0 &&
              results.map((item: any, index: number) => {
                const threeUp =
                  item.threeUpDirect ||
                  (Array.isArray(item.firstThreeDigits) &&
                  item.firstThreeDigits.length > 0
                    ? item.firstThreeDigits.join(" ")
                    : "-");
                const twoUp =
                  typeof threeUp === "string" && /^\d{3}$/.test(threeUp)
                    ? threeUp.slice(1)
                    : "-";
                const down: string = item.downDirect || item.lastTwoDigits || "-";

                return (
                  <div key={item.id ?? index} className="thai-result-row-shell rounded-[10px] p-[1px]">
                    <div className="thai-result-row grid grid-cols-[1.35fr_0.9fr_0.9fr_0.9fr] items-center gap-2 rounded-[10px] px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                      <div className="min-w-0 px-1 py-1 sm:px-3">
                        <p className="thai-result-date whitespace-nowrap text-[12px] font-medium tracking-[0.01em] sm:text-[15px]">
                          {formatDate(item.drawDate)}
                        </p>
                      </div>

                      <ResultBox value={threeUp} tone="three-up" />
                      <ResultBox value={twoUp} tone="two-up" />
                      <ResultBox value={down} tone="two-down" />
                    </div>
                  </div>
                );
              })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="thai-result-page-btn inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <span className="thai-result-page-indicator text-sm font-medium">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="thai-result-page-btn inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
              >
                Next
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
