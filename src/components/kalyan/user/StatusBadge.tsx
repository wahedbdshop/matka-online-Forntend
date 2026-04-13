import { cn } from "@/lib/utils";
import { ENTRY_STATUS_STYLE } from "@/types/kalyan";

const EXTRA_STYLES: Record<string, string> = {
  OPEN: "bg-green-500/15 text-green-400 border-green-500/30",
  CLOSE: "bg-red-500/15 text-red-400 border-red-500/30",
  CLOSED: "bg-red-500/15 text-red-400 border-red-500/30",
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
  INACTIVE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  PUBLISHED: "bg-green-500/15 text-green-400 border-green-500/30",
  WAITING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  CANCELLED: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  WON: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  LOST: "bg-red-500/15 text-red-400 border-red-500/30",
  REMOVED: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  REVERSED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const ALL_STYLES = { ...ENTRY_STATUS_STYLE, ...EXTRA_STYLES };

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = ALL_STYLES[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        style,
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
