"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function FloatingChatButton({
  bottomClassName = "bottom-20",
}: {
  bottomClassName?: string;
}) {
  return (
    <Link
      href="/chat"
      className={`group fixed ${bottomClassName} right-4 z-[120] flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-[#0b1328] via-[#0f1d3d] to-[#050b18] text-white shadow-[0_14px_32px_rgba(2,8,20,0.55)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.05] hover:shadow-[0_18px_38px_rgba(34,211,238,0.22)] active:scale-[0.97]`}
      aria-label="Open chat support"
    >
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,_rgba(125,211,252,0.24),_transparent_38%),radial-gradient(circle_at_70%_75%,_rgba(34,197,94,0.18),_transparent_32%)]" />
      <div className="pointer-events-none absolute -inset-1 -z-10 rounded-full bg-cyan-400/20 blur-xl opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full border border-cyan-300/20 bg-white/[0.04]">
        <MessageCircle className="absolute h-4.5 w-4.5 -translate-y-[7px] text-cyan-100 transition-transform duration-300 group-hover:scale-110" />
        <span className="translate-y-[7px] text-[8px] font-black tracking-[0.1em] text-white">
          24/7
        </span>
      </span>
      <span className="absolute right-[5px] top-[5px] h-2.5 w-2.5 rounded-full border border-[#081428] bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]" />
    </Link>
  );
}
