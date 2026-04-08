"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface KalyanPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
}

export function KalyanPageHeader({ title, subtitle, backHref }: KalyanPageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <div className="flex items-center gap-3 mb-5">
      <button
        type="button"
        onClick={handleBack}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div>
        <h1 className="text-base font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
