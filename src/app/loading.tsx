import Image from "next/image";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/30">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/10 via-transparent to-amber-400/10" />
          <Image
            src="/logo.png"
            alt="Matka Online"
            width={72}
            height={72}
            priority
            className="relative h-[72px] w-[72px] animate-pulse object-contain"
          />
        </div>
        <p className="text-sm font-medium tracking-[0.24em] uppercase text-slate-400">
          Loading
        </p>
      </div>
    </div>
  );
}
