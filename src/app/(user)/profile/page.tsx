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

const menuItems = [
  {
    href: "/profile/edit",
    icon: User,
    label: "Edit Profile",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    href: "/profile/change-password",
    icon: Lock,
    label: "Change Password",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    href: "/notifications/settings",
    icon: Bell,
    label: "Notification Settings",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    href: "/referral",
    icon: BadgeDollarSign,
    label: "Referral & Earnings",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    href: "/profile/bonus",
    icon: Gift,
    label: "Bonus History",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/kyc",
    icon: Shield,
    label: "KYC Verification",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    href: "/support",
    icon: HelpCircle,
    label: "Support",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export default function ProfilePage() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const userStatus = useAuthStore((state) => state.user?.status);
  const router = useRouter();
  const isBanned = userStatus === "BANNED";
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

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
      clearAuth();
      router.push("/login");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message
          : "Failed to log out";
      toast.error(message || "Failed to log out");
    },
  });

  const profile = data?.data;
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
      : `₹${balance.toLocaleString("en-BD")}`;

  const displayBonus =
    currency === "USD"
      ? `$${(bonusBalance / usdToBdt).toFixed(2)}`
      : `₹${bonusBalance.toLocaleString("en-BD")}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(profile?.referralCode || "");
    toast.success("Referral code copied!");
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-[24px] bg-slate-800" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-[20px] bg-slate-800" />
          <div className="h-24 rounded-[20px] bg-slate-800" />
        </div>
        <div className="h-32 rounded-[20px] bg-slate-800" />
        <div className="h-64 rounded-[20px] bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {isBanned && (
        <div className="bg-red-600 text-white text-center py-3 font-semibold rounded-lg">
          ⛔ Your account has been banned. Please contact support.
        </div>
      )}
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a0a3e] via-[#2d1060] to-[#1a0a3e] p-5 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-600/15 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-blue-500 blur-md opacity-60" />
            <Avatar className="relative h-[72px] w-[72px] border-2 border-purple-500/60 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <AvatarImage src={profile?.image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-2xl font-bold">
                {profile?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-semibold text-sm">Name :</span>
              <h2 className="text-white font-bold text-xl leading-tight">
                {profile?.name}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-blue-400 font-semibold text-sm">User Name :</span>
              <p className="text-slate-300 text-sm font-medium">
                @{profile?.username}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  profile?.emailVerified
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {profile?.emailVerified ? "✓ Verified" : "Unverified"}
              </span>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-purple-400">
                {profile?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-4 space-y-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-slate-500" />
            <span>{profile?.phone || "Not set"}</span>
          </div>
        </div>
      </div>

      {/* Currency Toggle + Balance */}
      <div className="rounded-[22px] border border-slate-700 bg-slate-800/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Balance
          </p>
          <div className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-900 p-0.5">
            <button
              onClick={() => setCurrency("BDT")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                currency === "BDT"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[16px] border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-purple-900/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Main Balance
            </p>
            <p
              key={`main-${currency}`}
              className="mt-1.5 text-xl font-bold text-white animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              {displayBalance}
            </p>
          </div>
          <div className="rounded-[16px] border border-green-500/20 bg-gradient-to-br from-green-600/10 to-green-900/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Bonus Balance
            </p>
            <p
              key={`bonus-${currency}`}
              className="mt-1.5 text-xl font-bold text-[#4ade80] animate-in fade-in slide-in-from-bottom-1 duration-300"
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

      {/* Referral Code */}
      <div className="rounded-[22px] border border-purple-500/30 bg-gradient-to-r from-purple-600/10 to-blue-600/10 p-4">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
          Your Referral Code
        </p>
        <div className="flex items-center justify-between">
          <p className="font-mono text-lg font-bold tracking-widest text-white">
            {String(profile?.referralCode || "").toLowerCase()}
          </p>
          <button
            onClick={handleCopyReferral}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-400 transition-all hover:bg-purple-600/30 active:scale-95"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="rounded-[22px] border border-slate-700 bg-slate-800/50 overflow-hidden">
        {menuItems.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-700/40 active:bg-slate-700/60 ${
                index !== menuItems.length - 1
                  ? "border-b border-slate-700/50"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${item.bg}`}
                >
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="text-sm font-medium text-white">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}
