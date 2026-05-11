import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-4 pb-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-44 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Skeleton className="h-4 w-52 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-8 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-[16px] bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-24 rounded-[16px] bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-44 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        <Skeleton className="mb-2 h-3 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-9 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:shadow-none">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-[10px] bg-slate-200 dark:bg-slate-700" />
              <Skeleton className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <Skeleton className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
