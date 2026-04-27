"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GAME_LOGO_SRC } from "@/lib/game-branding";
import { AdminService } from "@/services/admin.service";
import { getLudoConfig } from "@/lib/ludo-settings";
import { useLanguage } from "@/providers/language-provider";

type GameItem = {
  href: string;
  titleKey: keyof GamesText;
  subtitleKey: keyof GamesText;
  logoSrc: string;
  active: boolean;
  accentFrom: string;
  accentTo: string;
  glow: string;
};

const games: GameItem[] = [
  {
    href: "/thai-lottery",
    titleKey: "thaiTitle",
    subtitleKey: "thaiSubtitle",
    logoSrc: GAME_LOGO_SRC.thai,
    active: true,
    accentFrom: "#1d4ed8",
    accentTo: "#60a5fa",
    glow: "59,130,246",
  },
  {
    href: "/kalyan",
    titleKey: "kalyanTitle",
    subtitleKey: "kalyanSubtitle",
    logoSrc: GAME_LOGO_SRC.kalyan,
    active: true,
    accentFrom: "#7c3aed",
    accentTo: "#a78bfa",
    glow: "124,58,237",
  },
  {
    href: "/games/ludo",
    titleKey: "ludoTitle",
    subtitleKey: "ludoSubtitle",
    logoSrc: GAME_LOGO_SRC.ludo,
    active: true,
    accentFrom: "#1e40af",
    accentTo: "#60a5fa",
    glow: "59,130,246",
  },
  {
    href: "/games",
    titleKey: "pcsoTitle",
    subtitleKey: "pcsoSubtitle",
    logoSrc: GAME_LOGO_SRC.pcso,
    active: false,
    accentFrom: "#4c1d95",
    accentTo: "#a78bfa",
    glow: "124,58,237",
  },
];

type GamesText = {
  title: string;
  subtitle: string;
  comingSoon: string;
  play: string;
  soon: string;
  live: string;
  launchingSoon: string;
  temporarilyClosed: string;
  thaiTitle: string;
  thaiSubtitle: string;
  kalyanTitle: string;
  kalyanSubtitle: string;
  ludoTitle: string;
  ludoSubtitle: string;
  pcsoTitle: string;
  pcsoSubtitle: string;
};

function GameCard({
  game,
  index,
  text,
}: {
  game: GameItem & { title: string; subtitle: string };
  index: number;
  text: GamesText;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handlePlay = () => {
    if (!game.active) {
      toast(text.comingSoon, {
        description: `${game.title} ${text.launchingSoon}`,
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
        border: `1px solid rgba(${game.glow}, ${hovered ? "0.38" : "0.18"})`,
        boxShadow: hovered
          ? `0 12px 36px rgba(${game.glow}, 0.18), 0 10px 24px rgba(15,23,42,0.12)`
          : `0 10px 24px rgba(15,23,42,0.1)`,
        transform: pressed
          ? "scale(0.985)"
          : hovered
            ? "translateY(-3px)"
            : "translateY(0)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
      className="games-card relative overflow-hidden rounded-[24px] bg-[#0d1120] animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, rgba(${game.glow},0.12), transparent 60%)`,
          opacity: hovered ? 1 : 0.4,
        }}
      />

      {!game.active && (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
          {text.comingSoon}
        </div>
      )}

      <div className="relative flex items-center gap-4 p-5">
        <div
          className="games-logo-shell h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[16px] transition-transform duration-300"
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="games-card-title text-[17px] font-bold leading-tight text-white">
              {game.title}
            </h3>
            {game.active && (
              <span className="games-live-pill flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="games-live-text text-[10px] font-semibold text-green-400">
                  {text.live}
                </span>
              </span>
            )}
          </div>
          <p className="games-card-subtitle mt-0.5 text-xs text-slate-400">
            {game.subtitle}
          </p>
        </div>

        <div
          className="games-play-pill shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white transition-all duration-200"
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
          {game.active ? text.play : text.soon}
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const text: GamesText = {
    en: {
      title: "Games",
      subtitle: "Pick a game and start playing",
      comingSoon: "Coming Soon",
      play: "Play ->",
      soon: "Soon",
      live: "Live",
      launchingSoon: "is launching soon. Stay tuned!",
      temporarilyClosed: "Temporarily closed by admin",
      thaiTitle: "Thai Lottery",
      thaiSubtitle: "Thailand Official Lottery",
      kalyanTitle: "Kalyan Lottery",
      kalyanSubtitle: "India's most trusted satta matka",
      ludoTitle: "Ludo Bet",
      ludoSubtitle: "1 vs 1 token battle",
      pcsoTitle: "PCSO Lottery",
      pcsoSubtitle: "Philippine Charity Sweepstakes",
    },
    bn: {
      title: "গেমস",
      subtitle: "একটি গেম বেছে নিয়ে খেলা শুরু করুন",
      comingSoon: "শীঘ্রই আসছে",
      play: "খেলুন ->",
      soon: "শীঘ্রই",
      live: "লাইভ",
      launchingSoon: "শীঘ্রই চালু হবে। সাথে থাকুন!",
      temporarilyClosed: "অ্যাডমিন সাময়িকভাবে বন্ধ রেখেছে",
      thaiTitle: "থাই লটারি",
      thaiSubtitle: "থাইল্যান্ড অফিসিয়াল লটারি",
      kalyanTitle: "কল্যাণ লটারি",
      kalyanSubtitle: "ভারতের বিশ্বস্ত সাট্টা মাটকা",
      ludoTitle: "লুডু বেট",
      ludoSubtitle: "১ বনাম ১ টোকেন ব্যাটল",
      pcsoTitle: "পিসিএসও লটারি",
      pcsoSubtitle: "ফিলিপাইন চ্যারিটি সুইপস্টেকস",
    },
    hi: {
      title: "गेम्स",
      subtitle: "कोई गेम चुनें और खेलना शुरू करें",
      comingSoon: "जल्द आ रहा है",
      play: "खेलें ->",
      soon: "जल्द",
      live: "लाइव",
      launchingSoon: "जल्द लॉन्च होगा। जुड़े रहें!",
      temporarilyClosed: "एडमिन ने अस्थायी रूप से बंद किया है",
      thaiTitle: "थाई लॉटरी",
      thaiSubtitle: "थाईलैंड ऑफिशियल लॉटरी",
      kalyanTitle: "कल्याण लॉटरी",
      kalyanSubtitle: "भारत का भरोसेमंद सट्टा मटका",
      ludoTitle: "लूडो बेट",
      ludoSubtitle: "1 बनाम 1 टोकन बैटल",
      pcsoTitle: "PCSO लॉटरी",
      pcsoSubtitle: "फिलिपीन चैरिटी स्वीपस्टेक्स",
    },
  }[language];

  const { data: globalData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });

  const globalSettings = useMemo(
    () => globalData?.data ?? [],
    [globalData?.data],
  );
  const ludoConfig = useMemo(
    () => getLudoConfig(globalSettings),
    [globalSettings],
  );

  const visibleGames = useMemo(
    () =>
      games.map((game) => ({
        ...game,
        title: text[game.titleKey],
        subtitle:
          game.href === "/games/ludo"
            ? ludoConfig.enabled
              ? text[game.subtitleKey]
              : text.temporarilyClosed
            : text[game.subtitleKey],
        active: game.href === "/games/ludo" ? ludoConfig.enabled : game.active,
      })),
    [ludoConfig.enabled, text],
  );

  return (
    <>
      <style>{`
        .light .games-page-title {
          color: #0f172a;
        }
        .light .games-page-subtitle,
        .light .games-card-subtitle {
          color: #64748b;
        }
        .light .games-back-button {
          color: #334155;
        }
        .light .games-back-button:hover {
          color: #0f172a;
        }
        .light .games-card {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.98), rgba(241,245,249,0.96));
          box-shadow:
            0 14px 32px rgba(148,163,184,0.16),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .light .games-card-title {
          color: #0f172a;
        }
        .light .games-logo-shell {
          background: rgba(248,250,252,0.95);
        }
        .light .games-live-pill {
          background: rgba(16,185,129,0.12);
        }
        .light .games-live-text {
          color: #047857;
        }
        .light .games-play-pill {
          box-shadow: 0 10px 22px rgba(59,130,246,0.18);
        }
      `}</style>
      <div className="space-y-5 pb-6">
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="games-back-button text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="games-page-title text-2xl font-extrabold tracking-tight text-white">
              {text.title}
            </h1>
            <p className="games-page-subtitle mt-1 text-sm text-slate-400">
              {text.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {visibleGames.map((game, index) => (
            <GameCard key={game.href} game={game} index={index} text={text} />
          ))}
        </div>
      </div>
    </>
  );
}
