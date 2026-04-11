"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Minus, ArrowLeftRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import Link from "next/link";
import { useProfileQuery } from "@/hooks/use-profile-query";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";

export const BalanceCard = () => {
  const [showBalance, setShowBalance] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);

  const { data } = useProfileQuery();

  const { data: bonusHistoryData } = useQuery({
    queryKey: ["bonus-history-summary"],
    queryFn: UserService.getBonusHistory,
    enabled: isAuthReady && isAuthenticated,
  });

  const { fmt } = useCurrency();

  const balance = Number(data?.data?.balance ?? 0);
  const profileBonusBalance = Number(data?.data?.bonusBalance ?? 0);
  const bonusSummary = bonusHistoryData?.data?.summary;
  const availableBonusBalance = Number(
    bonusSummary?.availableBonusBalance ?? 0,
  );
  const totalBonusEarned = Number(bonusSummary?.totalBonusEarned ?? 0);
  const totalReferralBonus = Number(bonusSummary?.totalReferralBonus ?? 0);
  const totalDepositBonus = Number(bonusSummary?.totalDepositBonus ?? 0);
  const totalJoinBonus = Number(bonusSummary?.totalJoinBonus ?? 0);
  const fallbackBonusBalance =
    availableBonusBalance ||
    totalBonusEarned ||
    totalReferralBonus + totalDepositBonus + totalJoinBonus;
  const bonusBalance =
    profileBonusBalance > 0 ? profileBonusBalance : fallbackBonusBalance;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a0a3e] via-[#2d1060] to-[#120830] p-5 shadow-[0_8px_40px_rgba(139,92,246,0.25)]">
      <div className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-purple-300/70">
              Total Balance
            </p>

            <div className="mt-1.5 flex items-center gap-2">
              {showBalance ? (
                <h2 className="text-[32px] font-extrabold leading-none tracking-tight text-white">
                  {fmt(balance)}
                </h2>
              ) : (
                <h2 className="text-[32px] font-extrabold leading-none tracking-tight text-white">
                  ••••••
                </h2>
              )}
              <button
                onClick={() => setShowBalance((p) => !p)}
                className="mt-1 text-purple-300/60 hover:text-white transition-colors"
              >
                {showBalance ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-purple-300/60">Bonus Balance</p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {showBalance ? fmt(bonusBalance) : "••••"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { href: "/deposit", icon: Plus, label: "Deposit" },
            { href: "/withdrawal", icon: Minus, label: "Withdraw" },
            { href: "/transfer", icon: ArrowLeftRight, label: "Transfer" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <div className="flex h-12 w-full flex-col items-center justify-center gap-1 rounded-[14px] bg-white/10 transition-all hover:bg-white/18 active:scale-95">
                <Icon className="h-4 w-4 text-white" />
                <span className="text-[10px] font-medium text-white/80">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
