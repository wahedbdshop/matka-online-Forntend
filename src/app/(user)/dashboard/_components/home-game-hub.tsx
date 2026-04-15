/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Flame,
  Goal,
  Cherry,
  Rocket,
  ChevronRight,
  Dices,
} from "lucide-react";
import { toast } from "sonner";
import { GAME_LOGO_SRC } from "@/lib/game-branding";
import { cn } from "@/lib/utils";

type HubTabId =
  | "hot"
  | "thai"
  | "kalyan"
  | "ludo"
  | "pcso"
  | "sports"
  | "slot"
  | "crash";

type HubGame = {
  id: string;
  name: string;
  subtitle: string;
  logoSrc?: string;
  href?: string;
  isComingSoon?: boolean;
};

const tabs: {
  id: HubTabId;
  label: string;
  icon: typeof Flame;
  logoSrc?: string;
}[] = [
  { id: "hot", label: "HOT", icon: Flame },
  { id: "thai", label: "Thai", icon: Flame, logoSrc: GAME_LOGO_SRC.thai },
  { id: "kalyan", label: "Kalyan", icon: Flame, logoSrc: GAME_LOGO_SRC.kalyan },
  { id: "ludo", label: "Ludo", icon: Dices, logoSrc: GAME_LOGO_SRC.ludo },
  { id: "pcso", label: "PCSO", icon: Flame, logoSrc: GAME_LOGO_SRC.pcso },
  { id: "sports", label: "Sports", icon: Goal },
  { id: "slot", label: "Slot", icon: Cherry },
  { id: "crash", label: "Crash", icon: Rocket },
];

const sectionMeta: Record<
  HubTabId,
  {
    title: string;
    subtitle: string;
    accent: string;
  }
> = {
  hot: {
    title: "Trending Games",
    subtitle: "Popular picks and featured sections",
    accent: "from-amber-400 to-yellow-600",
  },
  thai: {
    title: "Thai Lottery",
    subtitle: "Official-style Thai experience with dedicated entry",
    accent: "from-sky-400 to-blue-600",
  },
  kalyan: {
    title: "Kalyan Lottery",
    subtitle: "Kalyan matka games with open and close sessions",
    accent: "from-purple-400 to-violet-600",
  },
  ludo: {
    title: "Ludo Bet",
    subtitle: "Quick 1 vs 1 stake rooms and fast queue join",
    accent: "from-blue-400 to-cyan-600",
  },
  pcso: {
    title: "PCSO",
    subtitle: "PCSO section is being prepared for launch",
    accent: "from-violet-400 to-purple-600",
  },
  sports: {
    title: "Sports",
    subtitle: "Sportsbook style entries with upcoming games",
    accent: "from-cyan-400 to-sky-600",
  },
  slot: {
    title: "Slots",
    subtitle: "Fast slot games and colorful reels",
    accent: "from-amber-400 to-orange-600",
  },
  crash: {
    title: "Crash",
    subtitle: "High-energy multiplier style crash games",
    accent: "from-rose-400 to-red-600",
  },
};

const sectionGames: Record<HubTabId, HubGame[]> = {
  hot: [
    {
      id: "thai-hot",
      name: "Thai Lottery",
      subtitle: "Open main board",
      logoSrc: GAME_LOGO_SRC.thai,
      href: "/thai-lottery",
    },
    {
      id: "kalyan-hot",
      name: "Kalyan Lottery",
      subtitle: "Open Kalyan board",
      logoSrc: GAME_LOGO_SRC.kalyan,
      href: "/kalyan",
    },
    {
      id: "ludo-hot",
      name: "Ludo Bet",
      subtitle: "Open 1 vs 1 rooms",
      logoSrc: GAME_LOGO_SRC.ludo,
      href: "/games/ludo",
    },
    {
      id: "pcso-hot",
      name: "PCSO Lottery",
      subtitle: "PCSO board preview",
      logoSrc: GAME_LOGO_SRC.pcso,
      isComingSoon: true,
    },
  ],
  thai: [
    {
      id: "thai-main",
      name: "Thai Lottery",
      subtitle: "Open main board",
      logoSrc: GAME_LOGO_SRC.thai,
      href: "/thai-lottery",
    },
  ],
  kalyan: [
    {
      id: "kalyan-main",
      name: "Kalyan Lottery",
      subtitle: "Open Kalyan board",
      logoSrc: GAME_LOGO_SRC.kalyan,
      href: "/kalyan",
    },
  ],
  ludo: [
    {
      id: "ludo-main",
      name: "Ludo Bet",
      subtitle: "Open 1 vs 1 lobby",
      logoSrc: GAME_LOGO_SRC.ludo,
      href: "/games/ludo",
    },
  ],
  pcso: [
    {
      id: "pcso-main",
      name: "PCSO Lottery",
      subtitle: "PCSO board preview",
      logoSrc: GAME_LOGO_SRC.pcso,
      isComingSoon: true,
    },
  ],
  sports: [
    {
      id: "football",
      name: "Football",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "cricket",
      name: "Cricket",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "tennis",
      name: "Tennis",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "basketball",
      name: "Basketball",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
  ],
  slot: [
    {
      id: "lucky-777",
      name: "Lucky 777",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "super-ace",
      name: "Super Ace",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "fortune-gems",
      name: "Fortune Gems",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "money-burst",
      name: "Money Burst",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
  ],
  crash: [
    {
      id: "aviator",
      name: "Aviator",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    { id: "jetx", name: "JetX", subtitle: "Coming soon", isComingSoon: true },
    {
      id: "rocket-x",
      name: "Rocket X",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
    {
      id: "sky-burst",
      name: "Sky Burst",
      subtitle: "Coming soon",
      isComingSoon: true,
    },
  ],
};

function GameTile({ game }: { game: HubGame }) {
  const tile = (
    <div className="group relative overflow-hidden rounded-lg border border-slate-700 bg-[#222a4a] p-2 transition-all hover:-translate-y-0.5 hover:border-[#f0bf38]/40 hover:bg-[#2a3358]">
      <div className="absolute right-0 top-0 h-5 w-5 bg-gradient-to-bl from-[#f0bf38] to-transparent opacity-90" />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-900/70">
            {game.logoSrc ? (
              <Image
                src={game.logoSrc}
                alt={game.name}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-[#f0bf38]">
                {game.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="truncate text-[11px] font-bold leading-4 text-white">
            {game.name}
          </p>
        </div>
      </div>
    </div>
  );

  if (game.href && !game.isComingSoon) {
    return <Link href={game.href}>{tile}</Link>;
  }

  return (
    <button
      type="button"
      onClick={() =>
        toast("Coming soon", {
          description: `${game.name} will be available soon.`,
        })
      }
      className="text-left"
    >
      {tile}
    </button>
  );
}

export function HomeGameHub({ popularGames }: { popularGames: any[] }) {
  const [activeTab, setActiveTab] = useState<HubTabId>("hot");

  const activeGames = useMemo(() => {
    if (activeTab === "hot" && popularGames.length) {
      return popularGames.slice(0, 6).map((game: any, index: number) => ({
        id: String(game.id ?? `popular-${index}`),
        name: game.name ?? "Game",
        subtitle: game.subtitle ?? "Featured game",
        logoSrc: game.imageUrl ?? undefined,
        href: game.href ?? undefined,
        isComingSoon: !game.href,
      }));
    }

    return sectionGames[activeTab];
  }, [activeTab, popularGames]);

  const meta = sectionMeta[activeTab];

  return (
    <section className="overflow-hidden rounded-xl border border-[#414a73] bg-[#2e355c] shadow-[0_18px_45px_rgba(6,12,27,0.45)]">
      <div className="border-b border-[#8e6d20] bg-[linear-gradient(90deg,#f7d154_0%,#f0bf38_45%,#dd9e1b_100%)] px-4 py-3 text-[11px] font-semibold text-[#11162b] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
        Latest links, banners, and featured games update area
      </div>

      <div className="space-y-4 p-3">
        <div
          className="-mx-1 overflow-x-auto pb-1 hide-scrollbar hub-tab-scroll"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}
        >
          <div className="flex min-w-max gap-2 px-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-w-[76px] shrink-0 flex-col items-center rounded-lg border px-3 py-3 text-center transition-all duration-200",
                    isActive
                      ? "border-[#f0bf38]/70 bg-[linear-gradient(180deg,#445186_0%,#37406c_55%,#2d355b_100%)] text-white shadow-[0_10px_24px_rgba(240,191,56,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]"
                      : "border-[#485483] bg-[#36406b] text-[#d5b969] hover:border-[#7b6a2f] hover:bg-[#3b4774] hover:text-white",
                  )}
                >
                  {tab.logoSrc ? (
                    <span
                      className={cn(
                        "mb-1.5 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border transition-all",
                        isActive
                          ? "border-[#f0bf38]/60 bg-white/10 shadow-[0_0_12px_rgba(240,191,56,0.35)]"
                          : "border-white/5 bg-white/5",
                      )}
                    >
                      <Image
                        src={tab.logoSrc}
                        alt={tab.label}
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : (
                    <Icon
                      className={cn(
                        "mx-auto mb-1.5 h-4 w-4",
                        isActive && "text-[#ffd75e] drop-shadow-[0_0_6px_rgba(255,215,94,0.55)]",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      isActive && "text-[#fff4cc]",
                    )}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="mt-1 h-1.5 w-10 rounded-full bg-[linear-gradient(90deg,#f0bf38_0%,#ffe58f_50%,#f0bf38_100%)] shadow-[0_0_10px_rgba(240,191,56,0.45)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#495482] bg-[#2a3153] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">{meta.title}</p>
              <p className="text-xs text-slate-300">{meta.subtitle}</p>
            </div>
            <div
              className={cn(
                "h-10 w-10 rounded-xl bg-gradient-to-br",
                meta.accent,
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {activeGames.map((game) => (
              <GameTile key={game.id} game={game} />
            ))}
          </div>

          {(activeTab === "thai" ||
            activeTab === "kalyan" ||
            activeTab === "ludo" ||
            activeTab === "pcso") && (
            <div className="mt-4 rounded-lg border border-[#3e4772] bg-[#2d355a] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-600 bg-slate-900/60">
                  <Image
                    src={
                      activeTab === "thai"
                        ? GAME_LOGO_SRC.thai
                        : activeTab === "kalyan"
                          ? GAME_LOGO_SRC.kalyan
                          : activeTab === "ludo"
                            ? GAME_LOGO_SRC.ludo
                            : GAME_LOGO_SRC.pcso
                    }
                    alt={activeTab}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">
                    {activeTab === "thai"
                      ? "Thai Lottery Board"
                      : activeTab === "kalyan"
                        ? "Kalyan Lottery Board"
                        : activeTab === "ludo"
                          ? "Ludo 1 vs 1 Lobby"
                          : "PCSO Board"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activeTab === "pcso"
                      ? "This section will show as coming soon for now."
                      : activeTab === "ludo"
                        ? "Stake rooms, active players, and fast queue join."
                        : activeTab === "kalyan"
                          ? "Open and close sessions, Jori, Patti and more."
                          : "Dedicated logo, nice section card, and direct access."}
                  </p>
                </div>
                {activeTab === "pcso" ? (
                  <button
                    type="button"
                    onClick={() =>
                      toast("Coming soon", {
                        description: "PCSO section is under preparation.",
                      })
                    }
                    className="rounded-full bg-white/8 px-3 py-2 text-xs font-bold text-slate-200"
                  >
                    Soon
                  </button>
                ) : (
                  <Link
                    href={
                      activeTab === "thai"
                        ? "/thai-lottery"
                        : activeTab === "kalyan"
                          ? "/kalyan"
                          : "/games/ludo"
                    }
                    className="rounded-full bg-gradient-to-r from-[#f0bf38] to-[#d99100] px-3 py-2 text-xs font-black text-[#1c2037]"
                  >
                    Open{" "}
                    <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
