export default function AdminProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-slate-800/80" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-slate-800/60" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-800/70" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 animate-pulse rounded-2xl bg-slate-800" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-800" />
              <div className="h-4 w-56 animate-pulse rounded-lg bg-slate-800/70" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-800/70" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-800/70" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-slate-800" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="space-y-3">
            <div className="h-6 w-36 animate-pulse rounded-lg bg-slate-800" />
            <div className="h-4 w-48 animate-pulse rounded-lg bg-slate-800/70" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
