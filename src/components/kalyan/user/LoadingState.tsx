import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export function LoadingState({ message = "Loading…", rows = 4 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">{message}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-slate-800/60"
        />
      ))}
    </div>
  );
}
