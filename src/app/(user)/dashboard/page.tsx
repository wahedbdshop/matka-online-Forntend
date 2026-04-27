"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, Trophy, Users } from "lucide-react";
import { FloatingChatButton } from "@/components/user/floating-chat-button";
import { GlobalNoticeBar } from "@/components/shared/global-notice-bar";
import { HomeService } from "@/services/home.service";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";

import { BannerSlider } from "./_components/banner-slider";
import { PopupBanner } from "./_components/popup-banner";
import { PaymentMethodsRow } from "./_components/payment-methods-row";
import { HomeGameHub } from "./_components/home-game-hub";
import { WinnerCard } from "./_components/winner-card";

function matchesGameType(
  winner: Record<string, unknown>,
  target: "thai" | "kalyan",
) {
  const source = String(winner?.source ?? "").trim().toUpperCase();
  return target === "kalyan" ? source === "KALYAN" : source === "THAI";
}

function getWinAmount(w: Record<string, unknown>) {
  return Number(
    w.actualWin ?? w.winningAmount ?? w.winAmount ?? w.payoutAmount ?? 0,
  );
}

function sortByAmountDesc(winners: Record<string, unknown>[]) {
  return [...winners].sort((a, b) => getWinAmount(b) - getWinAmount(a));
}

function extractList(payload: any): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.winners)) return payload.data.winners;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.winners)) return payload.winners;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function filterLatestDraw(winners: Record<string, unknown>[]) {
  if (!winners.length) return winners;

  const getDrawKey = (w: Record<string, unknown>) =>
    String(w.roundId ?? w.drawId ?? w.drawNumber ?? "").trim();

  const withKey = winners.filter((w) => getDrawKey(w));
  if (!withKey.length) return winners;

  const sorted = [...withKey].sort((a, b) => {
    const aTime = new Date(String(a.createdAt ?? 0)).getTime();
    const bTime = new Date(String(b.createdAt ?? 0)).getTime();
    return bTime - aTime;
  });

  const latestKey = getDrawKey(sorted[0]);
  return winners.filter((w) => getDrawKey(w) === latestKey);
}

export default function DashboardPage() {
  const { language } = useLanguage();
  const text = {
    en: {
      kalyanWinners: "Last Kalyan Winners",
      thaiWinners: "Last Thai Winners",
      popular: "Popular",
      winners: "Winners",
      thaiRates: "Thai Rates",
      referralTitle: "Get 5% Referral Bonus",
      referralSubtitle: "For every deposit - lifetime · Level 1~5",
      invite: "Invite",
      quickAccess: "Quick Access",
      quickAccessSubtitle:
        "Thai and Kalyan are live. More sections are being prepared.",
      viewAll: "View All",
      topBetting: "Top Betting Exchange",
      topBettingBody:
        "India, Pakistan, Sri Lanka, Nepal, Bangladesh & South East Asia. Safe, trusted, and reliable online lottery & betting platform.",
      seo1: "5% Referral bonus for every deposit lifetime - Level 1~5",
      seo2: "1% Register bonus & quick customer support",
    },
    bn: {
      kalyanWinners: "সর্বশেষ কল্যাণ বিজয়ী",
      thaiWinners: "সর্বশেষ থাই বিজয়ী",
      popular: "জনপ্রিয়",
      winners: "বিজয়ী",
      thaiRates: "থাই রেট",
      referralTitle: "৫% রেফারেল বোনাস নিন",
      referralSubtitle: "প্রতিটি ডিপোজিটে - লাইফটাইম · লেভেল ১~৫",
      invite: "ইনভাইট",
      quickAccess: "দ্রুত প্রবেশ",
      quickAccessSubtitle:
        "থাই ও কল্যাণ লাইভ আছে। আরও সেকশন প্রস্তুত হচ্ছে।",
      viewAll: "সব দেখুন",
      topBetting: "শীর্ষ বেটিং এক্সচেঞ্জ",
      topBettingBody:
        "ভারত, পাকিস্তান, শ্রীলঙ্কা, নেপাল, বাংলাদেশ ও দক্ষিণ-পূর্ব এশিয়ার জন্য নিরাপদ ও নির্ভরযোগ্য অনলাইন লটারি ও বেটিং প্ল্যাটফর্ম।",
      seo1: "প্রতিটি ডিপোজিটে ৫% রেফারেল বোনাস - লাইফটাইম · লেভেল ১~৫",
      seo2: "১% রেজিস্টার বোনাস ও দ্রুত কাস্টমার সাপোর্ট",
    },
    hi: {
      kalyanWinners: "हाल के कल्याण विजेता",
      thaiWinners: "हाल के थाई विजेता",
      popular: "लोकप्रिय",
      winners: "विजेता",
      thaiRates: "थाई रेट",
      referralTitle: "5% रेफरल बोनस पाएं",
      referralSubtitle: "हर डिपॉजिट पर - लाइफटाइम · लेवल 1~5",
      invite: "इनवाइट",
      quickAccess: "क्विक एक्सेस",
      quickAccessSubtitle:
        "थाई और कल्याण लाइव हैं। बाकी सेक्शन तैयार हो रहे हैं।",
      viewAll: "सब देखें",
      topBetting: "टॉप बेटिंग एक्सचेंज",
      topBettingBody:
        "भारत, पाकिस्तान, श्रीलंका, नेपाल, बांग्लादेश और दक्षिण-पूर्व एशिया के लिए सुरक्षित और भरोसेमंद ऑनलाइन लॉटरी व बेटिंग प्लेटफॉर्म।",
      seo1: "हर डिपॉजिट पर 5% रेफरल बोनस - लाइफटाइम · लेवल 1~5",
      seo2: "1% रजिस्टर बोनस और तेज कस्टमर सपोर्ट",
    },
  }[language];

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
  const banners = Array.isArray(home?.banners) ? home.banners : [];
  const popularGames = Array.isArray(home?.popularGames) ? home.popularGames : [];
  const popup = home?.popup ?? null;
  const paymentMethods = Array.isArray(home?.paymentMethods)
    ? home.paymentMethods
    : [];
  const thaiRatesCount = thaiRatesData?.data?.length ?? 0;
  const allThaiWinners = extractList(thaiWinnersData);
  const filteredThaiWinners = filterLatestDraw(allThaiWinners);
  const thaiWinners = sortByAmountDesc(
    filteredThaiWinners.length ? filteredThaiWinners : allThaiWinners,
  );
  const recentWinners = extractList(kalyanWinnersData);
  const kalyanWinners = sortByAmountDesc(
    recentWinners.filter((winner: Record<string, unknown>) =>
      matchesGameType(winner, "kalyan"),
    ),
  );

  return (
    <>
      <PopupBanner popup={popup} />
      <FloatingChatButton bottomClassName="bottom-[88px]" />

      <div className="space-y-2 pb-6">
        <BannerSlider banners={banners} />
        <GlobalNoticeBar />
        <HomeGameHub popularGames={popularGames} />
        <WinnerCard
          title={text.kalyanWinners}
          bets={kalyanWinners}
          theme="kalyan"
        />
        <WinnerCard title={text.thaiWinners} bets={thaiWinners} />

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: TrendingUp,
              label: text.popular,
              value: String(popularGames.length || 0),
              color: "text-blue-600 dark:text-blue-400",
              bg: "from-blue-50 to-white dark:from-blue-500/10 dark:to-blue-600/5",
              border: "border-blue-200 dark:border-blue-500/20",
            },
            {
              icon: Trophy,
              label: text.winners,
              value: "Rs 0",
              color: "text-green-600 dark:text-green-400",
              bg: "from-green-50 to-white dark:from-green-500/10 dark:to-green-600/5",
              border: "border-green-200 dark:border-green-500/20",
            },
            {
              icon: Users,
              label: text.thaiRates,
              value: String(thaiRatesCount),
              color: "text-purple-600 dark:text-purple-400",
              bg: "from-purple-50 to-white dark:from-purple-500/10 dark:to-purple-600/5",
              border: "border-purple-200 dark:border-purple-500/20",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={cn(
                "relative overflow-hidden rounded-xl border p-3 text-center bg-linear-to-br shadow-sm transition-all hover:scale-[1.04] dark:shadow-lg",
                s.bg,
                s.border,
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white border dark:bg-white/5",
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
              <p className="text-slate-600 dark:text-slate-400 text-[10px] font-medium tracking-wide uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-green-200 bg-linear-to-br from-green-50 to-white p-4 shadow-sm dark:border-green-500/20 dark:from-green-900/20 dark:to-slate-800/60 dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl shrink-0">
              G
            </div>
            <div>
              <p className="text-green-600 dark:text-green-400 font-bold text-sm">
                {text.referralTitle}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                {text.referralSubtitle}
              </p>
            </div>
            <Link href="/referral" className="ml-auto shrink-0">
              <div className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors">
                {text.invite}
              </div>
            </Link>
          </div>
        </div>

        <PaymentMethodsRow methods={paymentMethods} />

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#3e4873] dark:bg-[#242c4c] dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                {text.quickAccess}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {text.quickAccessSubtitle}
              </p>
            </div>
            <Link
              href="/games"
              className="rounded-full bg-linear-to-r from-[#f0bf38] to-[#d18e09] px-3 py-1.5 text-xs font-black text-[#1a1f39]"
            >
              {text.viewAll}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40 dark:shadow-none">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {text.topBetting}
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed dark:text-slate-400">
            {text.topBettingBody}
          </p>
          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            {[
              `* ${text.seo1}`,
              `* ${text.seo2}`,
              "www.matkaonline24.online",
              "www.matkaonline24.com",
              "www.matka24.org",
            ].map((item) => (
              <p key={item}>{item}</p>
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
