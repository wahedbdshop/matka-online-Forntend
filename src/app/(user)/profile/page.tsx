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
  X,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Lock,
  BadgeDollarSign,
  Gift,
  Languages,
  Gauge,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth.store";
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfileQuery } from "@/hooks/use-profile-query";
import { useLanguage } from "@/providers/language-provider";
import { useUIStore } from "@/store/ui.store";
import ProfileLoading from "./loading";

const menuItems = [
  {
    href: "/profile/edit",
    icon: User,
    labelKey: "editProfile" as const,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/10",
  },
  {
    href: "/profile/language",
    icon: Languages,
    labelKey: "languageTitle" as const,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-500/10",
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
    href: "/profile/turnover",
    icon: Gauge,
    labelKey: "turnoverTitle" as const,
    color: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/10",
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
  const { t } = useLanguage();
  const theme = useUIStore((state) => state.theme);
  const isDarkTheme = theme === "dark";
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const userStatus = useAuthStore((state) => state.user?.status);
  const router = useRouter();
  const isBanned = userStatus === "BANNED";
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const { usdToBdt } = useCurrency();
  const { data, isLoading } = useProfileQuery();

  const { data: bonusHistoryData } = useQuery({
    queryKey: ["bonus-history-summary"],
    queryFn: UserService.getBonusHistory,
    enabled: isAuthReady && isAuthenticated,
  });

  const { mutate: logout } = useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      setIsLogoutDialogOpen(false);
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
  const shouldShowLoading =
    !isAuthReady || (isAuthenticated && isLoading && !profile);
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
  const logoutConfirmName =
    profile?.name?.trim() || t.profile.logoutConfirmFallbackName;
  const logoutConfirmMessage = t.profile.logoutConfirmDescription.replace(
    "{name}",
    logoutConfirmName,
  );

  const displayBalance =
    currency === "USD"
      ? `$${(balance / usdToBdt).toFixed(2)}`
      : `Rs ${balance.toLocaleString("en-BD")}`;

  const displayBonus =
    currency === "USD"
      ? `$${(bonusBalance / usdToBdt).toFixed(2)}`
      : `Rs ${bonusBalance.toLocaleString("en-BD")}`;
  const signupDate = profile?.createdAt
    ? new Intl.DateTimeFormat("en-BD", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: "Asia/Dhaka",
      }).format(new Date(profile.createdAt))
    : null;

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(profile?.username || "");
    toast.success(t.profile.copied);
  };

  const handleLogout = () => {
    logout();
  };

  if (shouldShowLoading) {
    return <ProfileLoading />;
  }

  return (
    <div className="space-y-4 pb-6">
      {isBanned && (
        <div className="rounded-lg bg-red-600 py-3 text-center font-semibold text-white">
          {t.profile.accountBanned} {t.profile.contactSupport}
        </div>
      )}

      <div className="relative overflow-hidden rounded-[14px] border border-violet-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,247,255,0.95)_52%,rgba(239,246,255,0.95))] p-4 shadow-[0_18px_50px_rgba(79,70,229,0.12)] dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(24,27,34,0.98),rgba(34,24,60,0.95)_55%,rgba(20,28,46,0.98))] dark:shadow-[0_0_40px_rgba(139,92,246,0.18)]">
        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-violet-300/25 blur-3xl dark:bg-purple-600/20" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl dark:bg-blue-600/15" />

        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:flex sm:items-center">
          <div className="relative shrink-0">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-blue-500 blur-md opacity-50" />
            <Avatar className="relative h-16 w-16 border-2 border-purple-400/60 shadow-[0_0_20px_rgba(139,92,246,0.28)] sm:h-[72px] sm:w-[72px]">
              <AvatarImage src={profile?.image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-xl font-bold text-white sm:text-2xl">
                {profile?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-2 border-slate-200/80 sm:gap-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] sm:items-start dark:border-white/10">
              <div className="min-w-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Full name :
                  </p>
                  <h2 className="break-words text-[clamp(1.02rem,4.8vw,1.7rem)] font-bold leading-tight text-slate-950 sm:text-[1.7rem] dark:text-white">
                    {profile?.name}
                  </h2>
                </div>
              </div>
              <div className="min-w-0 border-l border-slate-200/80 pl-3 dark:border-white/10 sm:pl-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Username :
                  </p>
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 truncate pt-0.5 text-sm font-semibold text-slate-800 sm:text-lg dark:text-slate-200">
                      @{profile?.username}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyUsername}
                      className="shrink-0 rounded-md border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-purple-500/30 dark:hover:text-purple-300"
                      aria-label="Copy username"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
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
            {signupDate ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Sign up date : {signupDate}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4 space-y-2 border-t border-slate-200/80 pt-3 dark:border-white/10">
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
            <span className="min-w-0 break-all">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
            <span>{profile?.phone || t.profile.notSet}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[14px] border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
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

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-2.5 text-center dark:border-purple-500/20 dark:from-purple-600/10 dark:to-purple-900/10">
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
          <div className="rounded-[10px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-2.5 text-center dark:border-green-500/20 dark:from-green-600/10 dark:to-green-900/10">
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

      <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        {menuItems.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center justify-between px-3.5 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-700/40 dark:active:bg-slate-700/60 ${
                index !== menuItems.length - 1
                  ? "border-b border-slate-200 dark:border-slate-700/50"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-[5px] ${item.bg}`}
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
        onClick={() => setIsLogoutDialogOpen(true)}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-red-500/14 hover:shadow-[0_10px_24px_rgba(239,68,68,0.12)] active:translate-y-0 active:scale-[0.985]"
      >
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/10 opacity-0 blur-md transition-all duration-500 group-hover:left-full group-hover:opacity-100" />
        <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
          {t.profile.logout}
        </span>
      </button>

      <Dialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      >
        <DialogContent
          showCloseButton={false}
          className={`max-w-[350px] overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 ${
            isDarkTheme ? "text-white" : "text-slate-950"
          }`}
        >
          <div
            className={`rounded-[28px] px-6 py-7 text-center backdrop-blur-sm ${
              isDarkTheme
                ? "border border-white/10 bg-[#171b22] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                : "border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_26px_70px_rgba(15,23,42,0.16)]"
            }`}
          >
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(false)}
              className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition ${
                isDarkTheme
                  ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  : "border border-slate-200 bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
              aria-label="Close logout dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                isDarkTheme
                  ? "bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.55),transparent_58%),linear-gradient(135deg,rgba(14,165,233,0.28),rgba(59,130,246,0.08))] shadow-[0_10px_35px_rgba(14,165,233,0.22)] ring-1 ring-cyan-300/20"
                  : "bg-[radial-gradient(circle_at_30%_30%,rgba(125,211,252,0.55),transparent_58%),linear-gradient(135deg,rgba(186,230,253,0.95),rgba(224,242,254,0.88))] shadow-[0_12px_30px_rgba(14,165,233,0.18)] ring-1 ring-cyan-200/80"
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  isDarkTheme
                    ? "bg-[#0f141b] text-cyan-300 ring-1 ring-white/10"
                    : "bg-white text-cyan-600 ring-1 ring-cyan-100"
                }`}
              >
                <LogOut className="h-7 w-7" />
              </div>
            </div>

            <DialogHeader className="mt-6 space-y-3">
              <DialogTitle
                className={`text-[2rem] font-semibold tracking-tight ${
                  isDarkTheme ? "text-white" : "text-slate-900"
                }`}
              >
                {t.profile.logoutConfirmTitle}
              </DialogTitle>
              <DialogDescription
                className={`mx-auto max-w-[260px] text-base leading-7 ${
                  isDarkTheme ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {logoutConfirmMessage}
              </DialogDescription>
              <p
                className={`mx-auto max-w-[260px] text-sm leading-6 ${
                  isDarkTheme ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {t.profile.logoutConfirmHint}
              </p>
            </DialogHeader>

            <div className="mt-7 space-y-3">
              <Button
                type="button"
                onClick={handleLogout}
                className={`h-12 w-full rounded-2xl text-base font-semibold text-white ${
                  isDarkTheme
                    ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-600 shadow-[0_12px_30px_rgba(124,58,237,0.35)] hover:from-violet-500 hover:via-fuchsia-500 hover:to-blue-500"
                    : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 shadow-[0_12px_30px_rgba(14,165,233,0.28)] hover:from-cyan-400 hover:via-sky-400 hover:to-blue-400"
                }`}
              >
                {t.profile.logout}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsLogoutDialogOpen(false)}
                className={`h-12 w-full rounded-2xl text-base font-medium ${
                  isDarkTheme
                    ? "border border-white/10 bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white"
                    : "border border-slate-200 bg-white text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t.profile.no}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
