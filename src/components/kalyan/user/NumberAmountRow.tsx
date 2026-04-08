import { UseFormRegister } from "react-hook-form";
import { cn } from "@/lib/utils";

interface NumberAmountRowProps {
  number: string;
  register: UseFormRegister<Record<string, string>>;
  highlight?: boolean;
}

export function NumberAmountRow({ number, register, highlight }: NumberAmountRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl px-3 py-2 border",
        highlight
          ? "border-purple-500/20 bg-purple-500/5"
          : "border-slate-700/40 bg-slate-800/40",
      )}
    >
      <span className="min-w-[3rem] text-sm font-bold text-white tracking-wider">
        {number}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 font-medium">Rs.</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          {...register(number)}
          className="w-24 rounded-lg border border-slate-600/60 bg-slate-700/60 px-2.5 py-1.5 text-right text-sm font-semibold text-white placeholder-slate-600 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors"
        />
      </div>
    </div>
  );
}
