import { UseFormRegister } from "react-hook-form";
import { NumberAmountCell } from "./NumberAmountCell";

interface NumberSectionCardProps {
  title: string;
  numbers: string[];
  register: UseFormRegister<Record<string, string>>;
  accentColor?: string;
}

export function NumberSectionCard({
  title,
  numbers,
  register,
  accentColor = "bg-slate-700/50 text-slate-300",
}: NumberSectionCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-[#060b1d]">
      <div className={`flex justify-center px-4 py-2.5 ${accentColor}`}>
        <span className="text-sm font-extrabold tracking-[0.08em] uppercase">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {numbers.map((num) => (
          <NumberAmountCell key={num} number={num} register={register} />
        ))}
      </div>
    </div>
  );
}
