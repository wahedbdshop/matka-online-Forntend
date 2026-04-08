import { Volume2 } from "lucide-react";

export function MarqueeText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-2 overflow-hidden rounded-full border border-[#6b5a1f] bg-[#1a2134] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#f0bf38]" />
      <div className="overflow-hidden flex-1">
        <div className="flex w-max animate-[marquee-loop_20s_linear_infinite]">
          <span className="whitespace-nowrap pr-16 text-xs font-medium text-[#d9b23f]">{text}</span>
          <span className="whitespace-nowrap pr-16 text-xs font-medium text-[#d9b23f]">{text}</span>
        </div>
      </div>
      <style>{`
        @keyframes marquee-loop {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
