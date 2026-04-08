"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GAME_LOGO_SRC } from "@/lib/game-branding";
import { AdminService } from "@/services/admin.service";
import { getLudoConfig } from "@/lib/ludo-settings";

const games = [
  {
    href: "/thai-lottery",
    title: "Thai Lottery",
    subtitle: "Thailand Official Lottery",
    logoSrc: GAME_LOGO_SRC.thai,
    active: true,
    accentFrom: "#1d4ed8",
    accentTo: "#60a5fa",
    glow: "59,130,246",
  },
  {
    href: "/kalyan",
    title: "Kalyan Lottery",
    subtitle: "India's most trusted satta matka",
    logoSrc: GAME_LOGO_SRC.kalyan,
    active: true,
    accentFrom: "#7c3aed",
    accentTo: "#a78bfa",
    glow: "124,58,237",
  },
  {
    href: "/games/ludo",
    title: "Ludo Bet",
    subtitle: "1 vs 1 token battle",
    logoSrc: GAME_LOGO_SRC.ludo,
    active: true,
    accentFrom: "#1e40af",
    accentTo: "#60a5fa",
    glow: "59,130,246",
  },
  {
    href: "/games",
    title: "PCSO Lottery",
    subtitle: "Philippine Charity Sweepstakes",
    logoSrc: GAME_LOGO_SRC.pcso,
    active: false,
    accentFrom: "#4c1d95",
    accentTo: "#a78bfa",
    glow: "124,58,237",
  },
];

function GameCard({ game, index }: { game: (typeof games)[0]; index: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handlePlay = () => {
    if (!game.active) {
      toast("🚀 Coming Soon", {
        description: `${game.title} is launching soon. Stay tuned!`,
      });
      return;
    }
    router.push(game.href);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={handlePlay}
      style={{
        animationDelay: `${index * 100}ms`,
        border: `1px solid rgba(${game.glow}, ${hovered ? "0.5" : "0.2"})`,
        boxShadow: hovered
          ? `0 8px 40px rgba(${game.glow}, 0.25), 0 2px 8px rgba(0,0,0,0.4)`
          : `0 2px 12px rgba(0,0,0,0.3)`,
        transform: pressed
          ? "scale(0.985)"
          : hovered
            ? "translateY(-3px)"
            : "translateY(0)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
      className="relative overflow-hidden rounded-[24px] bg-[#0d1120] animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      {/* hover background wash */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, rgba(${game.glow},0.12), transparent 60%)`,
          opacity: hovered ? 1 : 0.4,
        }}
      />

      {/* Coming Soon */}
      {!game.active && (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
          Coming Soon
        </div>
      )}

      <div className="relative flex items-center gap-4 p-5">
        {/* Logo */}
        <div
          className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[16px] transition-transform duration-300"
          style={{
            boxShadow: `0 4px 20px rgba(${game.glow},0.35)`,
            transform: hovered ? "scale(1.06)" : "scale(1)",
          }}
        >
          <Image
            src={game.logoSrc}
            alt={game.title}
            width={60}
            height={60}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold leading-tight text-white">
              {game.title}
            </h3>
            {game.active && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-green-400">
                  Live
                </span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{game.subtitle}</p>
        </div>

        {/* Play pill */}
        <div
          className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white transition-all duration-200"
          style={{
            background: game.active
              ? `linear-gradient(135deg, ${game.accentFrom}, ${game.accentTo})`
              : "rgba(255,255,255,0.06)",
            boxShadow:
              game.active && hovered
                ? `0 4px 16px rgba(${game.glow},0.45)`
                : "none",
            color: game.active ? "white" : "#64748b",
          }}
        >
          {game.active ? "Play →" : "Soon"}
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { data: globalData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });
  const globalSettings = useMemo(() => globalData?.data ?? [], [globalData?.data]);
  const ludoConfig = useMemo(
    () => getLudoConfig(globalSettings),
    [globalSettings],
  );
  const visibleGames = useMemo(
    () =>
      games.map((game) =>
        game.href === "/games/ludo"
          ? {
              ...game,
              active: ludoConfig.enabled,
              subtitle: ludoConfig.enabled
                ? game.subtitle
                : "Temporarily closed by admin",
            }
          : game,
      ),
    [ludoConfig.enabled],
  );

  return (
    <div className="space-y-5 pb-6">
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Games
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick a game and start playing
        </p>
      </div>

      <div className="space-y-3">
        {visibleGames.map((game, index) => (
          <GameCard key={game.href} game={game} index={index} />
        ))}
      </div>
    </div>
  );
}
