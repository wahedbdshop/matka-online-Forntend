import { Calendar, Hash, IndianRupee } from "lucide-react";
import { EntrySlip } from "@/types/kalyan";
import { PLAY_TYPE_LABEL } from "@/types/kalyan";
import { StatusBadge } from "./StatusBadge";

interface BetHistoryCardProps {
  entry: EntrySlip;
}

export function BetHistoryCard({ entry }: BetHistoryCardProps) {
  const dateStr = new Date(entry.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const playTypes = [...new Set(entry.items?.map((i) => i.playType) ?? [])];
  const numbers = entry.items?.map((i) => i.selectedNumber).join(", ") ?? "–";
  const truncatedNumbers = numbers.length > 60 ? numbers.slice(0, 57) + "…" : numbers;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {entry.market?.name ?? `Market #${entry.marketId?.slice(-6)}`}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-700/60 rounded-md px-1.5 py-0.5">
              {entry.sessionType}
            </span>
            {playTypes.map((pt, index) => (
              <span
                key={`${entry.id}-${pt}-${index}`}
                className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 rounded-md px-1.5 py-0.5"
              >
                {PLAY_TYPE_LABEL[pt]}
              </span>
            ))}
          </div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Numbers summary */}
      <div className="flex items-start gap-2 rounded-xl bg-slate-900/50 border border-slate-700/30 px-3 py-2">
        <Hash className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-relaxed">{truncatedNumbers}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          {dateStr}
        </div>
        <div className="flex items-center gap-0.5 font-bold text-sm text-white">
          <IndianRupee className="h-3.5 w-3.5 text-green-400" />
          {Number(entry.totalAmount ?? entry.items?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}
