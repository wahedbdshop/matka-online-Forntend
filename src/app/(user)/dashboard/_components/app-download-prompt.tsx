"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import {
  consumeAppDownloadPromptPending,
  dismissAppDownloadPrompt,
  hasDismissedAppDownloadPrompt,
} from "@/lib/app-download-prompt";

const APK_URL = "/matka24.apk";

export function AppDownloadPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const shouldForceShow = consumeAppDownloadPromptPending();
    if (!shouldForceShow && hasDismissedAppDownloadPrompt()) return;

    setShow(true);
  }, []);

  const closePrompt = () => {
    dismissAppDownloadPrompt();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed left-4 bottom-[84px] z-[110] w-[176px]">
      <div className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-xl shadow-slate-950/20 dark:border-amber-400/30 dark:bg-[#1d2540]">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
            <Smartphone className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-slate-950 dark:text-white">
              Matka24 App
            </p>
            <p className="truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Official APK
            </p>
          </div>

          <button
            type="button"
            onClick={closePrompt}
            aria-label="Close app download"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <a
          href={APK_URL}
          download="matka24.apk"
          onClick={closePrompt}
          className="flex w-full items-center justify-center gap-1.5 bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-2 py-1.5 text-[11px] font-black text-[#1a1f39] transition hover:brightness-105"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}
