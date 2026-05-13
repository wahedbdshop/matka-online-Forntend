"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ShieldCheck, Trophy } from "lucide-react";

const rules = [
  "Each Ludo match has 2 players.",
  "Both players join with the selected stake amount before the game starts.",
  "Roll the dice on your turn and move only your own tokens.",
  "A token usually needs a 6 to leave home and enter the board.",
  "If you land on an opponent token on a non-safe box, that token returns home.",
  "Safe boxes protect tokens from being captured.",
  "The first player to finish all 4 tokens wins the match.",
  "When you win, the prize is credited after admin commission is deducted.",
  "If a player leaves or times out, the other player can be declared the winner.",
];

export default function LudoRulesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.18),transparent_30%),linear-gradient(180deg,#f6f7ff_0%,#eef2ff_45%,#f8fafc_100%)] px-4 py-5 text-slate-950 dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_28%),linear-gradient(180deg,#181a42_0%,#0a1028_100%)] dark:text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/games/ludo"
          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/14"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ludo
        </Link>

        <div className="mt-5 rounded-[28px] border border-violet-200/80 bg-white/80 p-5 shadow-[0_20px_50px_rgba(76,29,149,0.12)] backdrop-blur dark:border-violet-300/18 dark:bg-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/18 dark:text-violet-200">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">
                Rules of Ludo
              </h1>
              <p className="text-sm text-slate-500 dark:text-white/65">
                Simple guide for playing Ludo Bet.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {rules.map((rule, index) => (
              <div
                key={rule}
                className="rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3 shadow-sm dark:border-white/12 dark:bg-slate-950/20 dark:shadow-none"
              >
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200/75">
                  Rule {index + 1}
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-700 dark:text-white/92">
                  {rule}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 dark:border-emerald-300/18 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-black">Winning Tip</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-white/85">
                Bring tokens out quickly, protect them on safe cells, and focus on finishing all 4.
              </p>
            </div>

            <div className="rounded-[20px] border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-300/18 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-100">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-black">Fair Play</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-white/85">
                Avoid leaving the match midway. Timeout or exit can turn the result against you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
