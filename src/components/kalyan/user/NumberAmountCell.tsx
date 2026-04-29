import { UseFormRegister } from "react-hook-form";

interface NumberAmountCellProps {
  number: string;
  register: UseFormRegister<Record<string, string>>;
}

export function NumberAmountCell({ number, register }: NumberAmountCellProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-linear-to-r from-white to-purple-50 px-3 py-2.5 shadow-sm dark:border-purple-500/45 dark:bg-[linear-gradient(90deg,rgb(48_37_86_/_0.92)_0%,rgb(43_24_76_/_0.95)_100%)]">
      <div className="flex min-w-[2.9rem] justify-center">
        <span className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-purple-300 bg-linear-to-br from-purple-100 to-blue-50 px-2 text-sm font-bold tracking-[0.02em] text-purple-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-purple-400/55 dark:bg-[linear-gradient(135deg,rgb(107_75_170_/_0.78)_0%,rgb(55_74_135_/_0.62)_100%)] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          {number}
        </span>
      </div>
      <div className="flex min-w-0 w-30 items-center gap-1.5 rounded-lg border border-pink-300 bg-white px-2.5 py-2.5 transition-all focus-within:border-pink-500/70 focus-within:ring-1 focus-within:ring-pink-400/30 focus-within:shadow-[0_0_8px_rgba(236,72,153,0.16)] dark:h-[42px] dark:rounded-[8px] dark:border-[#b11b8c] dark:bg-[linear-gradient(90deg,#57184f_0%,#4b174f_48%,#3f1b5a_100%)] dark:px-2.5 dark:py-0 dark:focus-within:border-[#e14ac1] dark:focus-within:shadow-none dark:focus-within:ring-0">
        <span className="text-[10px] font-medium text-pink-600 dark:text-[10px] dark:font-semibold dark:text-[#ff4fc7]">Rs.</span>
        <input
          type="number"
          min={0}
          placeholder="0"
          {...register(number)}
          className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-slate-950 placeholder-slate-500 outline-none dark:text-[16px] dark:font-bold dark:text-white dark:placeholder-[#6f86b3]"
        />
      </div>
    </div>
  );
}
