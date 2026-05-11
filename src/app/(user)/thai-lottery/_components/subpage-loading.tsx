import { Skeleton } from "@/components/ui/skeleton";

export function ThaiLotterySubpageLoading({
  titleWidth = "w-40",
  statCards = 3,
  listRows = 6,
}: {
  titleWidth?: string;
  statCards?: number;
  listRows?: number;
}) {
  const statsGridClass =
    statCards === 3
      ? "grid grid-cols-3 gap-2"
      : statCards === 2
        ? "grid grid-cols-2 gap-2"
        : "grid grid-cols-1 gap-2";

  return (
    <div className="min-h-screen bg-[#020810] text-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-1 pb-20">
        <Skeleton className="mb-3 h-9 w-20 rounded-full bg-[#101935]" />

        <div className="mb-4 text-center">
          <div className="mx-auto mb-3">
            <Skeleton className="mx-auto h-12 w-12 rounded-2xl bg-[#101935]" />
          </div>
          <Skeleton className="mx-auto mb-2 h-4 w-24 rounded-full bg-[#101935]" />
          <Skeleton className={`mx-auto h-8 ${titleWidth} rounded-xl bg-[#101935]`} />
          <Skeleton className="mx-auto mt-2 h-3 w-36 rounded-lg bg-[#101935]" />
        </div>

        {statCards > 0 ? (
          <div className={`mb-4 ${statsGridClass}`}>
            {Array.from({ length: statCards }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[#0f2244] bg-[#060f22] px-3 py-3"
              >
                <Skeleton className="mx-auto mb-2 h-4 w-4 rounded bg-[#101935]" />
                <Skeleton className="mx-auto h-5 w-16 rounded-lg bg-[#101935]" />
                <Skeleton className="mx-auto mt-2 h-3 w-12 rounded-lg bg-[#101935]" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-[#0f2244] bg-[#060f22] shadow-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent" />
          {Array.from({ length: listRows }).map((_, index) => (
            <div
              key={index}
              className="border-b border-[#0a1a38]/60 px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-10 rounded bg-[#101935]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 rounded bg-[#101935]" />
                  <Skeleton className="h-3 w-20 rounded bg-[#101935]" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full bg-[#101935]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
