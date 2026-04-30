/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Flame,
  Gamepad2,
  Gift,
  LogIn,
  MessageCircle,
  Radio,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { HomeService } from "@/services/home.service";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { cn } from "@/lib/utils";
import { BannerSlider } from "./(user)/dashboard/_components/banner-slider";
import { HomeGameHub } from "./(user)/dashboard/_components/home-game-hub";
import { FavSlider } from "./(user)/dashboard/_components/fav-slider";
import { PopularGames } from "./(user)/dashboard/_components/popular-games";
import { WinnerCard } from "./(user)/dashboard/_components/winner-card";
import { RateTable } from "./(user)/dashboard/_components/rate-table";
import { PaymentMethodsRow } from "./(user)/dashboard/_components/payment-methods-row";
import { AuthPopupProvider } from "@/components/shared/auth-popup";
import { FloatingChatButton } from "@/components/user/floating-chat-button";
import { GlobalNoticeBar } from "@/components/shared/global-notice-bar";
import { SITE_LOGO_SRC } from "@/lib/branding";

function matchesGameType(
  winner: Record<string, unknown>,
  target: "thai" | "kalyan",
) {
  const source = String(winner?.source ?? "")
    .trim()
    .toUpperCase();

  return target === "kalyan" ? source === "KALYAN" : source === "THAI";
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.winners)) return payload.data.winners;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.winners)) return payload.winners;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function AndroidAppLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
    >
      <path
        d="M15 18h18v14a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7V18Z"
        fill="currentColor"
      />
      <path
        d="M15 17c.7-5.2 4.3-9 9-9s8.3 3.8 9 9H15Z"
        fill="currentColor"
      />
      <path
        d="M16.5 9.5 13 5.5M31.5 9.5 35 5.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M9 20v10M39 20v10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="21" cy="14" r="1.4" fill="#06101f" />
      <circle cx="27" cy="14" r="1.4" fill="#06101f" />
    </svg>
  );
}

const publicBottomNavItems = [
  { href: "#games-hub", label: "HOT", icon: Flame, highlighted: true },
  { href: "#winners", label: "Live", icon: Radio, highlighted: false },
  { href: "#", label: "Page", icon: FileText, highlighted: false },
  { href: "#", label: "Games", icon: Gamepad2, highlighted: false },
  { href: "/login", label: "Log in", icon: LogIn, highlighted: false },
] as const;

const pageLinks = [
  { href: "/about", label: "About", icon: FileText },
  { href: "/privacy-policy", label: "Privacy Policy", icon: Shield },
];

const gameLinks = [
  { href: "/thai-result", label: "Thai Lottery Result", icon: FileText },
  { href: "/kalyan-result", label: "Kalyan Lottery Result", icon: FileText },
];

export default function LandingPage() {
  const [activeBottomTab, setActiveBottomTab] = useState("HOT");
  const { data: homeData } = useQuery({
    queryKey: ["home-data-public"],
    queryFn: () => HomeService.getHomeData(),
  });

  const { data: thaiRatesData } = useQuery({
    queryKey: ["thai-rates-public"],
    queryFn: () => ThaiLotteryUserService.getRates(),
  });

  const { data: thaiWinnersData } = useQuery({
    queryKey: ["thai-winners-public"],
    queryFn: () => ThaiLotteryUserService.getRecentWinners(),
  });

  const { data: recentWinnersData } = useQuery({
    queryKey: ["home-winners-public"],
    queryFn: () => HomeService.getRecentWinners(),
  });

  const { data: kalyanRatesData } = useQuery({
    queryKey: ["kalyan-rates-public"],
    queryFn: () => KalyanUserService.getGameRates(),
  });

  const home = homeData?.data;
  const banners = Array.isArray(home?.banners) ? home.banners : [];
  const favSlides = Array.isArray(home?.favouriteSlides)
    ? home.favouriteSlides
    : [];
  const popularGames = Array.isArray(home?.popularGames) ? home.popularGames : [];
  const paymentMethods = Array.isArray(home?.paymentMethods)
    ? home.paymentMethods
    : [];
  const thaiRates = extractList(thaiRatesData);
  const KALYAN_LABELS: Record<string, string> = {
    GAME_TOTAL: "Game Total",
    SINGLE_PATTI: "Single Patti",
    DOUBLE_PATTI: "Double Patti",
    TRIPLE_PATTI: "Triple Patti",
    JORI: "Jori",
  };
  const kalyanRates = extractList(kalyanRatesData).map((r: any) => ({
    ...r,
    multiplier: r.rate ?? r.multiplier ?? 0,
    label: KALYAN_LABELS[r.playType] ?? r.playType,
  }));
  const recentWinners = extractList(recentWinnersData);
  const thaiWinners = extractList(thaiWinnersData) as Record<string, unknown>[];
  const kalyanWinners = recentWinners.filter((winner: Record<string, unknown>) =>
    matchesGameType(winner, "kalyan"),
  );
  const isHotTab = activeBottomTab === "HOT";
  const isLiveTab = activeBottomTab === "Live";
  const isPageTab = activeBottomTab === "Page";
  const isGamesTab = activeBottomTab === "Games";

  return (
    <AuthPopupProvider>
      <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,#1f2d59_0%,#0d1327_42%,#090d1a_100%)] text-white">
        <header className="sticky top-0 z-50 border-b border-[#2b3962] bg-[#131a31]/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg flex-col">
            <div className="relative flex items-center justify-between gap-3 bg-[linear-gradient(90deg,#10182d_0%,#182441_52%,#10182d_100%)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Image
                  src={SITE_LOGO_SRC}
                  alt="Matka Online 24"
                  width={132}
                  height={40}
                  priority
                  className="h-8 w-auto object-contain"
                />
                <div className="rounded-full border border-[#2e6a95] bg-[#16314d] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8edbff]">
                  Trusted Play
                </div>
              </div>

              <Link
                href="/register"
                className="inline-flex shrink-0 items-center rounded-md border border-[#42608f] bg-[linear-gradient(180deg,#29456d_0%,#203759_100%)] px-4 py-2 text-sm font-bold text-[#d9ecff] shadow-[0_8px_18px_rgba(5,12,24,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform hover:scale-[1.02] hover:bg-[#28466f]"
              >
                Join
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-24">
          {isHotTab ? <BannerSlider banners={banners} /> : null}
          {isHotTab ? <GlobalNoticeBar /> : null}

          <div className="space-y-5 px-4 pt-4">
            {isHotTab ? (
              <section id="games-hub">
                <HomeGameHub popularGames={popularGames} />
              </section>
            ) : null}

            {isHotTab ? (
              <div className="relative overflow-hidden rounded-[26px] border border-[#5f2db0] bg-[linear-gradient(180deg,#3c1f72_0%,#272b69_48%,#1c2554_100%)] p-5 text-center shadow-[0_22px_45px_rgba(9,14,31,0.45)]">
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#d4a2ff,transparent)]" />
                <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-[#ffcc33]/12 blur-3xl" />
                <div className="absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#9f69ff]/18 blur-3xl" />
                <div className="relative">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#ffd232]">
                    Welcome Bonus
                  </p>
                  <p className="mb-1 text-2xl font-black text-white">
                    5% Referral Bonus
                  </p>
                  <p className="mb-4 text-xs text-[#b6bee0]">
                    For every deposit - Lifetime - Level 1-5
                  </p>
                  <div className="flex justify-center gap-2">
                    <Link href="/register">
                      <button className="rounded-xl bg-[linear-gradient(90deg,#ffd94c_0%,#f3af16_100%)] px-5 py-2.5 text-sm font-black text-[#1a1f39] shadow-lg shadow-[#f0bf38]/20 transition-all hover:scale-[1.02]">
                        Start Playing
                      </button>
                    </Link>
                    <Link href="/login">
                      <button className="rounded-xl border border-[#4f5d91] bg-[#1a2540]/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:text-white">
                        Login
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {isHotTab ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: "👥",
                    label: "Players",
                    value: "10K+",
                    color: "text-[#f0bf38]",
                    border: "border-[#6b5a1f]/50",
                    bg: "from-[#f0bf38]/10 to-[#d18e09]/5",
                  },
                  {
                    icon: "🏆",
                    label: "Winners/Day",
                    value: "500+",
                    color: "text-green-400",
                    border: "border-green-500/20",
                    bg: "from-green-500/10 to-green-600/5",
                  },
                  {
                    icon: "💰",
                    label: "Total Paid",
                    value: "₹1Cr+",
                    color: "text-sky-400",
                    border: "border-sky-500/20",
                    bg: "from-sky-500/10 to-sky-600/5",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-linear-to-br p-3 text-center",
                      s.border,
                      s.bg,
                    )}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0bf38]/30 to-transparent" />
                    <p className="mb-0.5 text-xl">{s.icon}</p>
                    <p className={cn("text-base font-black", s.color)}>
                      {s.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {isHotTab ? <FavSlider slides={favSlides} /> : null}
            {isHotTab ? <PopularGames games={popularGames} /> : null}

            {isHotTab || isLiveTab ? (
              <section id="winners" className="space-y-4">
                {isLiveTab ? (
                  <div className="rounded-[26px] border border-[#3a4a74] bg-[#17213a] p-4 shadow-[0_18px_40px_rgba(3,8,20,0.28)]">
                    <p className="text-lg font-black text-white">Live Winners</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Latest public winner boards
                    </p>
                  </div>
                ) : null}
                
              <WinnerCard title="🏆 Last Thai Winners" bets={thaiWinners} />
              <WinnerCard
                title="Last Kalyan Winners"
                bets={kalyanWinners}
                theme="kalyan"
              />
              </section>
            ) : null}

            {isPageTab ? (
              <section
                id="page-links"
                className="rounded-[26px] border border-[#3a4a74] bg-[#17213a] p-4 shadow-[0_18px_40px_rgba(3,8,20,0.28)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-white">Page Links</p>
                    <p className="text-xs text-slate-400">
                      Public information pages
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-[#f0bf38]" />
                </div>

                <div className="grid gap-3">
                  {pageLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#31436d] bg-[#202b46] px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-[#273554]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d4f7b] bg-[#1b2540]">
                          <Icon className="h-4.5 w-4.5 text-[#f0bf38]" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {isGamesTab ? (
              <section
                id="game-links"
                className="rounded-[26px] border border-[#3a4a74] bg-[#17213a] p-4 shadow-[0_18px_40px_rgba(3,8,20,0.28)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-white">Game Links</p>
                    <p className="text-xs text-slate-400">Public result pages</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-[#73cfff]" />
                </div>

                <div className="grid gap-3">
                  {gameLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#31436d] bg-[#202b46] px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-[#273554]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d4f7b] bg-[#1b2540]">
                          <Icon className="h-4.5 w-4.5 text-[#73cfff]" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {isHotTab ? (
              <>
                <RateTable title="Thai Lottery" rates={thaiRates} />
                <RateTable title="Kalyan Lottery" rates={kalyanRates} variant="payouts" />

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: Shield,
                      label: "100% Secure",
                      sub: "SSL encrypted",
                      color: "text-green-400",
                      bg: "border-green-500/20 bg-green-500/10",
                    },
                    {
                      icon: Zap,
                      label: "Fast Withdrawal",
                      sub: "Within 10 minutes",
                      color: "text-[#f0bf38]",
                      bg: "border-[#6b5a1f]/50 bg-[#f0bf38]/10",
                    },
                    {
                      icon: Users,
                      label: "24/7 Support",
                      sub: "Always available",
                      color: "text-sky-400",
                      bg: "border-sky-500/20 bg-sky-500/10",
                    },
                    {
                      icon: Gift,
                      label: "Bonus Program",
                      sub: "5% lifetime",
                      color: "text-[#f0bf38]",
                      bg: "border-[#6b5a1f]/50 bg-[#f0bf38]/10",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.label}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-4",
                        feature.bg,
                      )}
                    >
                      <feature.icon className={cn(
                        "mb-2 h-5 w-5",
                        feature.color,
                      )} />
                      <p className="text-sm font-bold text-white">
                        {feature.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {feature.sub}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[#6b5a1f]/50 bg-linear-to-br from-[#1e1a08] via-[#1a2540] to-[#0f1828] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#6b5a1f]/50 bg-[#f0bf38]/10 text-2xl">
                      🎁
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#f0bf38]">
                        Get 5% Referral Bonus
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        For every deposit - lifetime · Level 1-5
                      </p>
                    </div>
                    <Link href="/register" className="ml-auto shrink-0">
                      <div className="rounded-xl bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-3 py-1.5 text-xs font-black text-[#1a1f39] transition-opacity hover:opacity-90">
                        Join Now
                      </div>
                    </Link>
                  </div>
                </div>

                <PaymentMethodsRow methods={paymentMethods} />

                <div className="space-y-3 rounded-2xl border border-[#2e3a5c] bg-[#1a2540]/60 p-5 text-center">
                  <MessageCircle className="mx-auto h-7 w-7 text-[#f0bf38]" />
                  <div>
                    <p className="text-sm font-bold text-white">Need Help?</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Our support team is always ready to help
                    </p>
                  </div>
                  <Link href="/register">
                    <button className="w-full rounded-xl bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-6 py-2.5 text-sm font-black text-[#1a1f39] transition-all hover:opacity-90">
                      <MessageCircle className="mr-2 inline h-4 w-4" />
                      Start Chat
                    </button>
                  </Link>
                </div>

                <div
                  id="seo"
                  className="space-y-3 rounded-[24px] border border-[#3e4873] bg-[#1a2540] p-4"
                >
                  <p className="text-sm font-bold text-white">
                    Top Betting Exchange - South East Asia
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    India, Pakistan, Sri Lanka, Nepal, Bangladesh & South East
                    Asia&apos;s most trusted online lottery platform. Enjoy fast
                    withdrawals, secure payments, and 24/7 customer support.
                  </p>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {[
                      "5% referral bonus for every deposit - lifetime · Level 1-5",
                      "1% register bonus with quick customer support",
                      "www.matkaonline24.online",
                      "www.matkaonline24.com",
                      "www.matka24.org",
                    ].map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#35507f] bg-[linear-gradient(180deg,#182849_0%,#121d35_100%)] p-4 shadow-[0_18px_42px_rgba(3,7,18,0.32)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#3ddc84]/45 bg-[#3ddc84]/12 text-[#3ddc84] shadow-sm shadow-[#3ddc84]/15">
                      <AndroidAppLogo />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white">
                        Official Matka Online 24 App
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Secure APK from our official website. Download and play
                        faster from your Android phone.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[
                          "matka24.org",
                          "matkaonline24.com",
                          "matkaonline24.online",
                        ].map((site) => (
                          <span
                            key={site}
                            className="rounded-full border border-[#3b5f92] bg-[#10213d] px-2.5 py-1 text-[10px] font-semibold text-[#9fd2ff]"
                          >
                            {site}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a
                    href="/matka24.apk"
                    download="matka24.apk"
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-5 py-3 text-sm font-black text-[#1a1f39] shadow-lg shadow-[#f0bf38]/15 transition-all hover:scale-[1.01] hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Download Official App
                  </a>
                </div>

                <div className="space-y-3 pt-2 text-center">
                  <Link href="/register">
                    <button className="w-full rounded-xl bg-linear-to-r from-[#f0bf38] to-[#d18e09] py-4 text-base font-black text-[#1a1f39] shadow-lg shadow-[#f0bf38]/20 transition-all hover:scale-[1.01] hover:opacity-90">
                      Create Free Account
                    </button>
                  </Link>
                  <p className="text-xs text-slate-500">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-[#f0bf38] hover:text-[#d18e09]"
                    >
                      Login here
                    </Link>
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </main>

        <footer className="border-t border-[#2e3a5c] bg-[#0d1120] px-4 pb-24 pt-6">
          <div className="mx-auto max-w-lg space-y-2 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-linear-to-br from-[#f0bf38] to-[#d18e09] text-xs font-black text-[#1a1f39]">
                M
              </div>
              <span className="text-sm font-black text-white">
                Matka Online 24
              </span>
            </div>
            <p className="text-xs text-slate-500">
              © 2026 Matka Online 24. All rights reserved.
            </p>
            <p className="text-[10px] text-slate-600">
              18+ only. Play responsibly.
            </p>
          </div>
        </footer>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2c3f69] bg-[linear-gradient(180deg,#121a30_0%,#0d1528_100%)] text-[#c2cee5] shadow-[0_-8px_24px_rgba(0,0,0,0.3)]">
          <div className="mx-auto flex max-w-lg items-center justify-between px-2 py-1.5">
            {publicBottomNavItems.map((item) => {
              const Icon = item.icon;
              const href =
                item.label === "Page" || item.label === "Games" || item.label === "Live"
                  ? "#"
                  : item.href;
              const sharedClassName = cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition-colors",
                activeBottomTab === item.label
                  ? "mx-1 border border-[#6f5b24] bg-[#35456c] text-[#ffe170] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-[#9ca9c5] hover:text-white",
              );

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={sharedClassName}
                  onClick={(event) => {
                    if (
                      item.label === "Page" ||
                      item.label === "Games" ||
                      item.label === "Live" ||
                      item.label === "HOT"
                    ) {
                      event.preventDefault();
                    }
                    setActiveBottomTab(item.label);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {activeBottomTab === item.label ? (
                    <span className="h-1 w-10 rounded-full bg-[#ffd33f]" />
                  ) : null}
                </Link>
              );
            })}

          </div>
        </nav>

        <FloatingChatButton />
      </div>
    </AuthPopupProvider>
  );
}

