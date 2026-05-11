import { Skeleton } from "@/components/ui/skeleton";

export default function GamesLoading() {
  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-44 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-[60px] w-[60px] rounded-[16px] bg-slate-200 dark:bg-slate-700" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <Skeleton className="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <Skeleton className="h-4 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <Skeleton className="h-10 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
