import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-slate-300">Error</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
