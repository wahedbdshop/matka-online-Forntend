"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  Trophy,
  Percent,
  ListChecks,
  Layers,
  Hash,
  Dices,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    label: "Bet History",
    href: "/kalyan/bet-history",
    icon: History,
    color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-400/10",
  },
  {
    label: "Win History",
    href: "/kalyan/win-history",
    icon: Trophy,
    color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-400/10",
  },
  {
    label: "Game Rate",
    href: "/kalyan/game-rate",
    icon: Percent,
    color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-400/10",
  },
  {
    label: "Result",
    href: "/kalyan/result",
    icon: ListChecks,
    color: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-400/10",
  },
];

const PLAY_TYPES = [
  {
    slug: "game-total",
    label: "Game Total",
    subtitle: "Pick digits 0–9",
    icon: Hash,
    gradient: "from-blue-50 to-white dark:from-blue-600/20 dark:to-blue-500/5",
    border: "border-blue-200 dark:border-blue-500/20",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    btn: "bg-blue-600 hover:bg-blue-700",
  },
  {
    slug: "single-patti",
    label: "Single Patti",
    subtitle: "3-digit single patti picks",
    icon: Layers,
    gradient: "from-emerald-50 to-white dark:from-emerald-600/20 dark:to-emerald-500/5",
    border: "border-emerald-200 dark:border-emerald-500/20",
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    slug: "double-patti",
    label: "Double Patti",
    subtitle: "3-digit double patti picks",
    icon: Star,
    gradient: "from-purple-50 to-white dark:from-purple-600/20 dark:to-purple-500/5",
    border: "border-purple-200 dark:border-purple-500/20",
    iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
    btn: "bg-purple-600 hover:bg-purple-700",
  },
  {
    slug: "triple-patti",
    label: "Triple Patti",
    subtitle: "Triple digit — 000 to 999",
    icon: Zap,
    gradient: "from-orange-50 to-white dark:from-orange-600/20 dark:to-orange-500/5",
    border: "border-orange-200 dark:border-orange-500/20",
    iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    btn: "bg-orange-600 hover:bg-orange-700",
  },
  {
    slug: "jori",
    label: "Jori",
    subtitle: "2-digit jori pair play",
    icon: Dices,
    gradient: "from-pink-50 to-white dark:from-pink-600/20 dark:to-pink-500/5",
    border: "border-pink-200 dark:border-pink-500/20",
    iconBg: "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400",
    btn: "bg-pink-600 hover:bg-pink-700",
  },
];

export default function KalyanLandingPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 pb-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-950 transition-colors dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Hero */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-100 via-indigo-50 to-white p-5 text-center shadow-sm dark:border-purple-500/20 dark:from-purple-700/30 dark:via-indigo-600/20 dark:to-slate-900/40 dark:shadow-none">
        <div className="mb-3 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute bottom-1 h-6 w-10 rounded-full bg-purple-400/25 blur-xl" />
            <Image
              src="/kalyanHome.png"
              alt="Kalyan Lottery"
              width={56}
              height={56}
              className="h-14 w-14 scale-[2] object-contain"
              priority
            />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-950 dark:text-white">Kalyan Lottery</h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          India&apos;s most trusted satta matka game
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-center shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/50 dark:shadow-none dark:hover:bg-slate-800"
          >
            <div className={`rounded-lg p-2 ${action.color}`}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Play Types */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-200">
          Select Play Type
        </h2>
        <div className="space-y-2.5">
          {PLAY_TYPES.map((pt) => (
            <div
              key={pt.slug}
              onClick={() => router.push(`/kalyan/${pt.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/kalyan/${pt.slug}`);
                }
              }}
              className={`group cursor-pointer overflow-hidden rounded-[22px] border bg-gradient-to-r ${pt.gradient} ${pt.border} p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:brightness-105 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_12px_30px_rgba(15,23,42,0.18)] dark:hover:border-white/30 dark:hover:brightness-110 dark:hover:shadow-[0_22px_50px_rgba(59,130,246,0.20)]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${pt.iconBg} ring-1 ring-white/5 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <pt.icon className="relative z-10 h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[18px] font-extrabold tracking-[0.01em] text-slate-950 dark:text-white">
                      {pt.label}
                    </p>
                    <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300/85">
                      {pt.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/kalyan/${pt.slug}`);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_24px_rgba(0,0,0,0.26)] active:scale-[0.97] ${pt.btn}`}
                >
                  Play Now
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
