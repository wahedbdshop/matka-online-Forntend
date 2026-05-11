import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <Skeleton className="h-8 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/30 dark:shadow-none"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="mt-2 h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 w-36 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <Skeleton className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <Skeleton className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-4 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-3 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
