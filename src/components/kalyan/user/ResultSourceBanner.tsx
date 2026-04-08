import { Database, ShieldAlert } from "lucide-react";

interface ResultSourceBannerProps {
  sourceLabel: string;
  fallbackActive: boolean;
  warning?: string | null;
  lastUpdated?: string | null;
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ResultSourceBanner({
  sourceLabel,
  fallbackActive,
  warning,
  lastUpdated,
}: ResultSourceBannerProps) {
  const formattedUpdatedAt = formatDateTime(lastUpdated);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-[0_14px_28px_rgba(15,23,42,0.18)] ${
        fallbackActive
          ? "border-amber-500/25 bg-amber-500/10"
          : "border-emerald-500/20 bg-emerald-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            fallbackActive
              ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {fallbackActive ? (
            <ShieldAlert className="h-4.5 w-4.5" />
          ) : (
            <Database className="h-4.5 w-4.5" />
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Result source
          </p>
          <p className="text-sm font-semibold text-white">{sourceLabel}</p>
          {formattedUpdatedAt ? (
            <p className="text-xs text-slate-400">
              Last update {formattedUpdatedAt}
            </p>
          ) : null}
          {warning ? <p className="text-xs text-slate-300/90">{warning}</p> : null}
        </div>
      </div>
    </div>
  );
}
