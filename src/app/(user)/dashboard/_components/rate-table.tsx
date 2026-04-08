/* eslint-disable @typescript-eslint/no-explicit-any */
import { Star } from "lucide-react";

export function RateTable({ title, rates }: { title: string; rates: any[] }) {
  if (!rates?.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e3560] bg-[#111f38] shadow-lg">
      {/* Title */}
      <div className="border-b border-[#1e3560] bg-[#0c1628] px-4 py-3">
        <p className="text-sm font-bold text-white">{title} Rates</p>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[36px_1fr_72px_76px] items-center gap-2 border-b border-yellow-500/30 bg-yellow-500/[0.08] px-4 py-2.5">
        {[
          { label: "Sl.No", cls: "text-left" },
          { label: "Name", cls: "text-left" },
          { label: "Rate", cls: "text-center" },
          { label: "Discount", cls: "text-right" },
        ].map((h) => (
          <p
            key={h.label}
            className={`text-[9px] font-bold uppercase tracking-widest text-yellow-400 ${h.cls}`}
          >
            {h.label}
          </p>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#0f2244]/60">
        {rates.map((r: any, idx: number) => {
          const multiplier = Number(r.multiplier ?? 0);
          const isGold = multiplier >= 500;
          const discount =
            Number(r.baseDiscountPct ?? 0) + Number(r.globalDiscountPct ?? 0);
          const hasDiscount = discount > 0;

          return (
            <div
              key={r.id ?? r.playType}
              className={`grid grid-cols-[36px_1fr_72px_76px] items-center gap-2 px-4 py-3 transition-colors hover:bg-white/[0.02] ${
                isGold
                  ? "bg-yellow-500/[0.04]"
                  : idx % 2 !== 0
                    ? "bg-[#0c1628]/40"
                    : ""
              }`}
            >
              {/* Sl.No */}
              <span className="font-mono text-[11px] font-bold text-white/25">
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Name */}
              <div className="flex min-w-0 items-center gap-1.5">
                {isGold && (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-yellow-500/30 bg-yellow-500/15">
                    <Star className="h-2 w-2 text-yellow-400" />
                  </span>
                )}
                <p
                  className={`truncate text-xs font-medium ${isGold ? "text-yellow-100" : "text-slate-300"}`}
                >
                  {r.label ?? r.playType}
                </p>
              </div>

              {/* Rate */}
              <div className="flex justify-center">
                <span
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] font-black ${
                    isGold
                      ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-400"
                      : "border-blue-500/20 bg-blue-500/[0.08] text-blue-400"
                  }`}
                >
                  ×{multiplier}
                </span>
              </div>

              {/* Discount */}
              <div className="flex justify-end">
                {hasDiscount ? (
                  <div className="text-right">
                    <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                      {discount}%
                    </span>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-white/20">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
