/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Copy, Share2, TrendingUp, Clock, Gift, ChevronLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReferralService } from "@/services/referral.service";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ReferralPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: ReferralService.getMyReferrals,
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["my-referral-earnings"],
    queryFn: () => ReferralService.getMyEarnings(),
  });

  const { data: configData } = useQuery({
    queryKey: ["referral-config"],
    queryFn: ReferralService.getConfig,
  });

  const { data: bonusStatusData } = useQuery({
    queryKey: ["monthly-bonus-status"],
    queryFn: ReferralService.getMonthlyBonusStatus,
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: ReferralService.claimMonthlyBonus,
    onSuccess: () => {
      toast.success("Monthly bonus claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["monthly-bonus-status"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        "Could not claim bonus. Please try again.";
      toast.error(msg);
    },
  });

  const referrals = referralsData?.data?.referrals || [];
  const totalReferrals = referralsData?.data?.totalReferrals || 0;
  const earnings = earningsData?.data?.earnings || [];
  const totalEarned = earningsData?.data?.totalEarned || 0;
  const rawConfig = configData?.data;
  const config: any[] = Array.isArray(rawConfig)
    ? rawConfig
    : (rawConfig?.configs ?? []);
  const monthlyLoginBonus = !Array.isArray(rawConfig)
    ? rawConfig?.monthlyLoginBonus
    : null;

  const bonusStatus = bonusStatusData?.data;
  const canClaim = bonusStatus?.canClaim ?? true;
  const alreadyClaimed = bonusStatus?.alreadyClaimed ?? false;

  const referralCode = (user?.referralCode || "").toLowerCase();
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://matkaonline24.com"}/register?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join Matka Online 24",
        text: `Join using my referral code: ${referralCode}`,
        url: referralLink,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-2.5 py-1 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f8fcc] hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="text-[10px] font-semibold tracking-[0.06em]">Back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-950 dark:text-white">Referral Program</h1>
      </div>

      {/* Referral Code Card */}
      <Card className="border-0 bg-gradient-to-br from-purple-600 to-purple-800">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 !text-purple-100" />
            <p className="text-sm !text-purple-100">Your Referral Code</p>
          </div>

          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <p className="text-center font-mono text-3xl font-bold tracking-widest !text-white">
              {referralCode}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCopyCode}
              variant="ghost"
              className="flex-1 bg-white/10 !text-white hover:bg-white/20"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Code
            </Button>
            <Button
              onClick={handleShare}
              variant="ghost"
              className="flex-1 bg-white/10 !text-white hover:bg-white/20"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-950 dark:text-white">{totalReferrals}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Referrals</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-950 dark:text-white">
              ৳{Number(totalEarned).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Levels */}
      {config.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-950 dark:text-white">
              Commission Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {config.map((level: any) => {
                const displayLevel = level.level + 1;
                const commissionPct =
                  level.depositCommissionPct ?? level.commissionPct ?? 0;
                const signupBonus = level.signupBonus ?? level.bonusAmount ?? 0;
                return (
                  <div
                    key={level.level}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 text-xs font-bold">
                          L{displayLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-900 dark:text-white">
                          Level {displayLevel}
                        </span>
                        {signupBonus > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Signup Bonus: ৳{signupBonus}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        level.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-slate-500/20 text-slate-400",
                      )}
                    >
                      {commissionPct}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="referrals">
        <TabsList className="w-full bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="referrals" className="flex-1">
            Referrals ({totalReferrals})
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex-1">
            Earnings
          </TabsTrigger>
        </TabsList>

        {/* Referrals List */}
        <TabsContent value="referrals" className="space-y-2">
          {referralsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-slate-200 dark:bg-slate-700" />
            ))
          ) : referrals.length === 0 ? (
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-3 dark:text-slate-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No referrals yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Share your code to earn commissions
                </p>
                <Button
                  onClick={handleShare}
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            referrals.map((referral: any) => (
              <Card
                key={referral.id}
                className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
                      <AvatarFallback className="bg-purple-600/20 text-purple-400">
                        {referral.name?.charAt(0)?.toLowerCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-950 dark:text-white">
                        {referral.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        @{referral.username}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        Joined{" "}
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={cn("text-[10px]", {
                        "bg-green-500/20 text-green-400":
                          referral.status === "ACTIVE",
                        "bg-yellow-500/20 text-yellow-400":
                          referral.status === "PENDING",
                        "bg-red-500/20 text-red-400":
                          referral.status === "BANNED",
                      })}
                    >
                      {referral.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Earnings */}
        <TabsContent value="earnings" className="space-y-2">
          {earningsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-slate-200 dark:bg-slate-700" />
            ))
          ) : earnings.length === 0 ? (
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-3 dark:text-slate-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">No earnings yet</p>
                <p className="text-slate-500 text-xs mt-1">
                  Earnings appear when your referrals deposit
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Total */}
              <Card className="border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-gradient-to-r dark:from-green-600/20 dark:to-green-800/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Earned</p>
                    <p className="text-xl font-bold text-slate-950 dark:text-white">
                      ৳{Number(totalEarned).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-400" />
                </CardContent>
              </Card>

              {earnings.map((earning: any) => (
                <Card
                  key={earning.id}
                  className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-400 text-xs font-bold">
                            L{earning.level}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-950 dark:text-white">
                            Level {earning.level} Commission
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            From @{earning.fromUser?.username}
                          </p>
                          <p className="text-slate-500 text-xs">
                            Deposit: ৳
                            {Number(earning.depositAmount).toLocaleString()} •{" "}
                            {earning.commissionRate}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">
                          +৳{Number(earning.earnedAmount).toLocaleString()}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(earning.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Monthly Login Bonus */}
      {monthlyLoginBonus?.isActive && Number(monthlyLoginBonus?.amount) > 0 && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm dark:border-amber-400/25 dark:from-[#3a2409] dark:to-[#221406] dark:shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Monthly Login Bonus</p>
              <p className="text-xl font-bold text-slate-950 dark:text-amber-50">
                ৳{Number(monthlyLoginBonus.amount).toLocaleString()}
              </p>
              <p className="text-xs text-slate-700 dark:text-amber-100/80">
                ৩০ দিন active থাকলে প্রতি মাসে পাবেন
              </p>
              {alreadyClaimed && (
                <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ এই মাসে claim করা হয়েছে</p>
              )}
            </div>
            <button
              type="button"
              disabled={!canClaim || alreadyClaimed || claimMutation.isPending}
              onClick={() => claimMutation.mutate()}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-200",
                canClaim && !alreadyClaimed
                  ? "cursor-pointer hover:scale-110 active:scale-95"
                  : "cursor-not-allowed opacity-50"
              )}
              aria-label="Claim monthly bonus"
            >
              {claimMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-300" />
              ) : (
                <Gift className="h-8 w-8 text-amber-600 dark:text-amber-300" />
              )}
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {alreadyClaimed ? "Claimed" : "Claim"}
              </span>
            </button>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-950 dark:text-white">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              step: "1",
              title: "Share your code",
              desc: "Share your referral code with friends",
            },
            {
              step: "2",
              title: "Friend registers",
              desc: "They sign up using your code — you get instant signup bonus",
            },
            {
              step: "3",
              title: "Earn commission",
              desc: "Get % commission every time they deposit",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-400 text-xs font-bold">
                  {item.step}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
