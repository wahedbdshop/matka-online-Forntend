"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { FloatingChatButton } from "@/components/user/floating-chat-button";
import { HomeService } from "@/services/home.service";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { cn } from "@/lib/utils";

import { BannerSlider } from "./_components/banner-slider";
import { PopupBanner } from "./_components/popup-banner";
import { PaymentMethodsRow } from "./_components/payment-methods-row";
import { HomeGameHub } from "./_components/home-game-hub";
import { WinnerCard } from "./_components/winner-card";
import { GlobalNoticeBar } from "@/components/shared/global-notice-bar";

function matchesGameType(
  winner: Record<string, unknown>,
  target: "thai" | "kalyan",
) {
  const source = String(winner?.source ?? "").trim().toUpperCase();

  return target === "kalyan" ? source === "KALYAN" : source === "THAI";
}

export default function DashboardPage() {
  const { data: homeData } = useQuery({
    queryKey: ["home-data"],
    queryFn: () => HomeService.getHomeData(),
  });
  const { data: thaiRatesData } = useQuery({
    queryKey: ["thai-rates"],
    queryFn: () => ThaiLotteryUserService.getRates(),
  });
  const { data: thaiWinnersData } = useQuery({
    queryKey: ["thai-winners"],
    queryFn: () => ThaiLotteryUserService.getRecentWinners(),
  });
  const { data: kalyanWinnersData } = useQuery({
    queryKey: ["kalyan-winners"],
    queryFn: () => HomeService.getRecentWinners(),
  });
  const home = homeData?.data;
  const banners = home?.banners ?? [];
  const popularGames = home?.popularGames ?? [];
  const popup = home?.popup ?? null;
  const paymentMethods = home?.paymentMethods ?? [];
  const thaiRatesCount = thaiRatesData?.data?.length ?? 0;
  const thaiWinners = (thaiWinnersData?.data ?? []).filter(
    (winner: Record<string, unknown>) => matchesGameType(winner, "thai"),
  );
  const recentWinners = kalyanWinnersData?.data ?? [];
  const kalyanWinners = recentWinners.filter((winner: Record<string, unknown>) =>
    matchesGameType(winner, "kalyan"),
  );

  return (
    <>
      <PopupBanner popup={popup} />
      <FloatingChatButton bottomClassName="bottom-[88px]" />

      <div className="space-y-2 pb-6">
        <BannerSlider banners={banners} />
        <GlobalNoticeBar />
        <HomeGameHub popularGames={popularGames} />
        <WinnerCard title="Last Kalyan Winners" bets={kalyanWinners} theme="kalyan" />
        <WinnerCard title="Last Thai Winners" bets={thaiWinners} />
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: TrendingUp,
              label: "Popular",
              value: String(popularGames.length || 0),
              color: "text-blue-400",
              bg: "from-blue-500/10 to-blue-600/5",
              border: "border-blue-500/20",
            },
            {
              icon: Trophy,
              label: "Winners",
              value: "₹0",
              color: "text-green-400",
              bg: "from-green-500/10 to-green-600/5",
              border: "border-green-500/20",
            },
            {
              icon: Users,
              label: "Thai Rates",
              value: String(thaiRatesCount),
              color: "text-purple-400",
              bg: "from-purple-500/10 to-purple-600/5",
              border: "border-purple-500/20",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={cn(
                "relative overflow-hidden rounded-xl border p-3 text-center bg-linear-to-br shadow-lg transition-all hover:scale-[1.04]",
                s.bg,
                s.border,
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white/5 border",
                  s.border,
                )}
              >
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
              <p
                className={cn(
                  "font-extrabold text-base tracking-tight leading-none mb-1",
                  s.color,
                )}
              >
                {s.value}
              </p>
              <p className="text-slate-400 text-[10px] font-medium tracking-wide uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Referral Banner */}
        <div className="rounded-xl border border-green-500/20 bg-linear-to-br from-green-900/20 to-slate-800/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl shrink-0">
              🎁
            </div>
            <div>
              <p className="text-green-400 font-bold text-sm">
                Get 5% Referral Bonus
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                For every deposit — lifetime · Level 1~5
              </p>
            </div>
            <Link href="/referral" className="ml-auto shrink-0">
              <div className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors">
                Invite
              </div>
            </Link>
          </div>
        </div>

        <PaymentMethodsRow methods={paymentMethods} />

        <div className="rounded-xl border border-[#3e4873] bg-[#242c4c] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Quick Access</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Thai and Kalyan are live. More sections are being prepared.
              </p>
            </div>
            <Link
              href="/games"
              className="rounded-full bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-3 py-1.5 text-xs font-black text-[#1a1f39]"
            >
              View All
            </Link>
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
          <p className="text-sm font-bold text-white">Top Betting Exchange</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            India, Pakistan, Sri Lanka, Nepal, Bangladesh & South East Asia.
            Safe, trusted, and reliable online lottery & betting platform.
          </p>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            {[
              "⭐ 5% Referral bonus for every deposit lifetime — Level 1~5",
              "💰 1% Register bonus & quick customer support",
              "🌍 www.matkaonline24.online",
              "🌍 www.matkaonline24.com",
            ].map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </>
  );
}

