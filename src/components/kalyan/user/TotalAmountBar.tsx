import { IndianRupee } from "lucide-react";

interface TotalAmountBarProps {
  total: number;
  discountAmount?: number;
  payableAmount?: number;
}

export function TotalAmountBar({
  total,
  discountAmount = 0,
  payableAmount = total,
}: TotalAmountBarProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/95 dark:shadow-none">
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/70">
          <p className="text-[9px] text-slate-500">Total Amount</p>
          <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-950 dark:text-white">
            <IndianRupee className="h-3 w-3 text-green-400" />
            <span>{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/70">
          <p className="text-[9px] text-slate-500">Discount</p>
          <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-300">
            Rs. {discountAmount.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/70">
          <p className="text-[9px] text-slate-500">Payable Amount</p>
          <p className="mt-0.5 font-semibold text-green-700 dark:text-green-300">
            Rs. {payableAmount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-1 h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-1 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${Math.min((total / 10000) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
