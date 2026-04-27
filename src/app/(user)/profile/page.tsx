"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Copy,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Lock,
  BadgeDollarSign,
  Gift,
  Languages,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfileQuery } from "@/hooks/use-profile-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppLanguage,
  LANGUAGE_OPTIONS,
  resolvePreferredLanguage,
} from "@/lib/language";
import { useLanguage } from "@/providers/language-provider";

const menuItems = [
  {
    href: "/profile/edit",
    icon: User,
    labelKey: "editProfile" as const,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/10",
  },
  {
    href: "/profile/change-password",
    icon: Lock,
    labelKey: "changePassword" as const,
    color: "text-amber-600 dark:text-yellow-400",
    bg: "bg-amber-100 dark:bg-yellow-500/10",
  },
  {
    href: "/notifications/settings",
    icon: Bell,
    labelKey: "notificationSettings" as const,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-500/10",
  },
  {
    href: "/referral",
    icon: BadgeDollarSign,
    labelKey: "referralEarnings" as const,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-500/10",
  },
  {
    href: "/profile/bonus",
    icon: Gift,
    labelKey: "bonusHistory" as const,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
  },
  {
    href: "/kyc",
    icon: Shield,
    labelKey: "kycVerification" as const,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/10",
  },
  {
    href: "/support",
    icon: HelpCircle,
    labelKey: "support" as const,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-500/10",
  },
];

export default function ProfilePage() {
  const { language, setLanguage, t } = useLanguage();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const userStatus = useAuthStore((state) => state.user?.status);
  const updateUser = useAuthStore((state) => state.updateUser);
  const router = useRouter();
  const isBanned = userStatus === "BANNED";
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

  const { usdToBdt } = useCurrency();
  const { data, isLoading } = useProfileQuery();

  const { mutate: saveLanguage, isPending: isLanguageSaving } = useMutation({
    mutationFn: (nextLanguage: AppLanguage) =>
      UserService.updateProfile({ preferredLanguage: nextLanguage }),
    onSuccess: (_, nextLanguage) => {
      updateUser({ preferredLanguage: nextLanguage, language: nextLanguage });
      toast.success(t.profile.languageSaved);
    },
    onError: () => {
      toast.message(t.profile.languageSaveFailed);
    },
  });

  const { data: bonusHistoryData } = useQuery({
    queryKey: ["bonus-history-summary"],
    queryFn: UserService.getBonusHistory,
    enabled: isAuthReady && isAuthenticated,
  });

  const { mutate: logout } = useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      clearAuth();
      router.push("/login");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message
          : t.profile.logoutFailed;
      toast.error(message || t.profile.logoutFailed);
    },
  });

  const profile = data?.data;
  const profileLanguage = resolvePreferredLanguage(
    profile?.preferredLanguage ?? profile?.language ?? language,
  );
  const balance = Number(profile?.balance ?? 0);
  const profileBonusBalance = Number(profile?.bonusBalance ?? 0);
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

  const displayBalance =
    currency === "USD"
      ? `$${(balance / usdToBdt).toFixed(2)}`
      : `Rs ${balance.toLocaleString("en-BD")}`;

  const displayBonus =
    currency === "USD"
      ? `$${(bonusBalance / usdToBdt).toFixed(2)}`
      : `Rs ${bonusBalance.toLocaleString("en-BD")}`;

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    updateUser({ preferredLanguage: nextLanguage, language: nextLanguage });
    saveLanguage(nextLanguage);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(profile?.referralCode || "");
    toast.success(t.profile.copied);
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-[24px] bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-[20px] bg-slate-200 dark:bg-slate-800" />
          <div className="h-24 rounded-[20px] bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-32 rounded-[20px] bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-[20px] bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {isBanned && (
        <div className="rounded-lg bg-red-600 py-3 text-center font-semibold text-white">
          {t.profile.accountBanned} {t.profile.contactSupport}
        </div>
      )}

      <div className="relative overflow-hidden rounded-[24px] border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 p-5 shadow-[0_18px_50px_rgba(79,70,229,0.12)] dark:border-transparent dark:from-[#1a0a3e] dark:via-[#2d1060] dark:to-[#1a0a3e] dark:shadow-[0_0_40px_rgba(139,92,246,0.2)]">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-violet-300/30 blur-3xl dark:bg-purple-600/20" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-300/25 blur-3xl dark:bg-blue-600/15" />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-blue-500 blur-md opacity-60" />
            <Avatar className="relative h-[72px] w-[72px] border-2 border-purple-500/60 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <AvatarImage src={profile?.image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-2xl font-bold text-white">
                {profile?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-violet-600 dark:text-purple-400">
                {t.profile.nameLabel} :
              </span>
              <h2 className="text-xl font-bold leading-tight text-slate-950 dark:text-white">
                {profile?.name}
              </h2>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {t.profile.usernameLabel} :
              </span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                @{profile?.username}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  profile?.emailVerified
                    ? "bg-emerald-100 text-emerald-700 dark:bg-green-500/20 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                }`}
              >
                {profile?.emailVerified
                  ? `✓ ${t.profile.verified}`
                  : t.profile.unverified}
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-purple-500/20 dark:text-purple-400">
                {profile?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
            <span className="truncate">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
            <span>{profile?.phone || t.profile.notSet}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.profile.balance}
          </p>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-900">
            <button
              onClick={() => setCurrency("BDT")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                currency === "BDT"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Rs INR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-3 text-center dark:border-purple-500/20 dark:from-purple-600/10 dark:to-purple-900/10">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.profile.mainBalance}
            </p>
            <p
              key={`main-${currency}`}
              className="mt-1.5 animate-in fade-in slide-in-from-bottom-1 text-xl font-bold text-slate-950 duration-300 dark:text-white"
            >
              {displayBalance}
            </p>
          </div>
          <div className="rounded-[16px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 text-center dark:border-green-500/20 dark:from-green-600/10 dark:to-green-900/10">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.profile.bonusBalance}
            </p>
            <p
              key={`bonus-${currency}`}
              className="mt-1.5 animate-in fade-in slide-in-from-bottom-1 text-xl font-bold text-emerald-600 duration-300 dark:text-[#4ade80]"
            >
              {displayBonus}
            </p>
          </div>
        </div>

        {currency === "USD" && (
          <p className="text-center text-[10px] text-slate-600">
            1 USD = {usdToBdt} BDT
          </p>
        )}
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            <Languages className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                {t.profile.languageTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.profile.languageDescription}
              </p>
            </div>

            <Select
              value={profileLanguage}
              onValueChange={(value) =>
                handleLanguageChange(value as AppLanguage)
              }
              disabled={isLanguageSaving}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-3 text-left dark:border-slate-600 dark:bg-slate-900">
                <SelectValue placeholder={t.common.selectLanguage} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.nativeLabel} ({option.englishLabel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-violet-200 bg-gradient-to-r from-violet-50 to-blue-50 p-4 shadow-sm dark:border-purple-500/30 dark:from-purple-600/10 dark:to-blue-600/10 dark:shadow-none">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
          {t.profile.referralCode}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-lg font-bold tracking-widest text-slate-950 dark:text-white">
            {String(profile?.referralCode || "").toLowerCase()}
          </p>
          <button
            onClick={handleCopyReferral}
            className="flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 transition-all hover:bg-violet-200 active:scale-95 dark:border-purple-500/30 dark:bg-purple-600/20 dark:text-purple-400 dark:hover:bg-purple-600/30"
          >
            <Copy className="h-3.5 w-3.5" /> {t.profile.copy}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        {menuItems.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-700/40 dark:active:bg-slate-700/60 ${
                index !== menuItems.length - 1
                  ? "border-b border-slate-200 dark:border-slate-700/50"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${item.bg}`}
                >
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-950 dark:text-white">
                  {t.profile[item.labelKey]}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" /> {t.profile.logout}
      </button>
    </div>
  );
}
