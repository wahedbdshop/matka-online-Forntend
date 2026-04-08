import { UseFormRegister } from "react-hook-form";

interface NumberAmountCellProps {
  number: string;
  register: UseFormRegister<Record<string, string>>;
}

export function NumberAmountCell({ number, register }: NumberAmountCellProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-linear-to-r from-slate-800/80 to-purple-900/30 px-3 py-2.5 shadow-sm">
      <div className="flex min-w-[2.9rem] justify-center">
        <span className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-purple-400/40 bg-linear-to-br from-purple-500/30 to-blue-500/20 px-2 text-sm font-bold tracking-[0.02em] text-purple-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {number}
        </span>
      </div>
      <div className="flex min-w-0 w-30 items-center gap-1.5 rounded-lg border border-pink-500/40 bg-linear-to-r from-pink-900/40 to-purple-900/40 px-2.5 py-2.5 transition-all focus-within:border-pink-400/70 focus-within:ring-1 focus-within:ring-pink-400/30 focus-within:shadow-[0_0_8px_rgba(236,72,153,0.2)]">
        <span className="text-[10px] font-medium text-pink-400/80">Rs.</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          {...register(number)}
          className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-white placeholder-slate-500 outline-none"
        />
      </div>
    </div>
  );
}
