/* eslint-disable @typescript-eslint/no-explicit-any */
import { Star } from "lucide-react";

const EXAMPLE_BET = 100;

function PayoutsTable({ title, rates }: { title: string; rates: any[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(148,163,184,0.18)] dark:border-[#1e3560] dark:bg-[#111f38] dark:shadow-lg">
      {/* Title */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e3560] dark:bg-[#0c1628]">
        <p className="text-sm font-bold text-slate-950 dark:text-white">{title} Rates</p>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 items-center gap-2 border-b border-amber-300/70 bg-amber-50 px-4 py-2.5 dark:border-yellow-500/30 dark:bg-yellow-500/8">
        <p className="text-left text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-yellow-400">
          Play Type
        </p>
        <p className="text-center text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-yellow-400">
          Bet Rs.
        </p>
        <p className="text-right text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-yellow-400">
          Win Rs.
        </p>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-200 dark:divide-[#0f2244]/60">
        {rates.map((r: any, idx: number) => (
          <div
            key={r.id ?? r.playType}
            className={`grid grid-cols-3 items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/2 ${
              idx % 2 !== 0 ? "bg-slate-50/90 dark:bg-[#0c1628]/40" : ""
            }`}
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {r.label ?? r.playType}
            </span>
            <span className="text-center font-mono text-xs text-slate-500 dark:text-slate-400">
              {EXAMPLE_BET}
            </span>
            <span className="text-right font-mono text-xs font-black text-emerald-600 dark:text-green-400">
              {Number(r.multiplier ?? r.rate ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RateTable({
  title,
  rates,
  variant,
}: {
  title: string;
  rates: any[];
  variant?: "payouts";
}) {
  if (!rates?.length) return null;

  if (variant === "payouts") {
    return <PayoutsTable title={title} rates={rates} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(148,163,184,0.18)] dark:border-[#1e3560] dark:bg-[#111f38] dark:shadow-lg">
      {/* Title */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e3560] dark:bg-[#0c1628]">
        <p className="text-sm font-bold text-slate-950 dark:text-white">{title} Rates</p>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[36px_1fr_72px_76px] items-center gap-2 border-b border-amber-300/70 bg-amber-50 px-4 py-2.5 dark:border-yellow-500/30 dark:bg-yellow-500/8">
        {[
          { label: "Sl.No", cls: "text-left" },
          { label: "Name", cls: "text-left" },
          { label: "Rate", cls: "text-center" },
          { label: "Discount", cls: "text-right" },
        ].map((h) => (
          <p
            key={h.label}
            className={`text-[9px] font-bold uppercase tracking-widest text-amber-700 dark:text-yellow-400 ${h.cls}`}
          >
            {h.label}
          </p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-200 dark:divide-[#0f2244]/60">
        {rates.map((r: any, idx: number) => {
          const multiplier = Number(r.multiplier ?? 0);
          const isGold = multiplier >= 500;
          const discount =
            Number(r.baseDiscountPct ?? 0) + Number(r.globalDiscountPct ?? 0);
          const hasDiscount = discount > 0;

          return (
            <div
              key={r.id ?? r.playType}
              className={`grid grid-cols-[36px_1fr_72px_76px] items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/2 ${
                isGold
                  ? "bg-amber-50 dark:bg-yellow-500/[0.04]"
                  : idx % 2 !== 0
                    ? "bg-slate-50/90 dark:bg-[#0c1628]/40"
                    : ""
              }`}
            >
              {/* Sl.No */}
              <span className="font-mono text-[11px] font-bold text-slate-400 dark:text-white/25">
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Name */}
              <div className="flex min-w-0 items-center gap-1.5">
                {isGold && (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-amber-300 bg-amber-100 dark:border-yellow-500/30 dark:bg-yellow-500/15">
                    <Star className="h-2 w-2 text-amber-600 dark:text-yellow-400" />
                  </span>
                )}
                <p
                  className={`truncate text-xs font-medium ${isGold ? "text-amber-900 dark:text-yellow-100" : "text-slate-700 dark:text-slate-300"}`}
                >
                  {r.label ?? r.playType}
                </p>
              </div>

              {/* Rate */}
              <div className="flex justify-center">
                <span
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] font-black ${
                    isGold
                      ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-yellow-500/35 dark:bg-yellow-500/10 dark:text-yellow-400"
                      : "border-sky-200 bg-sky-50 text-sky-700 dark:border-blue-500/20 dark:bg-blue-500/[0.08] dark:text-blue-400"
                  }`}
                >
                  ×{multiplier}
                </span>
              </div>

              {/* Discount */}
              <div className="flex justify-end">
                {hasDiscount ? (
                  <div className="text-right">
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {discount}%
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-slate-300 dark:text-white/20">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
