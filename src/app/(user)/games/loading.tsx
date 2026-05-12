import Image from "next/image";

export default function GamesLoading() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center pb-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[28px] border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/30">
          <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_58%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_60%)]" />
          <Image
            src="/logo.png"
            alt="Matka Online"
            width={76}
            height={76}
            priority
            className="relative h-[76px] w-[76px] animate-pulse object-contain"
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
            Loading
          </p>
          <p className="text-xs text-slate-500">Games page is opening...</p>
        </div>
      </div>
    </div>
  );
}
