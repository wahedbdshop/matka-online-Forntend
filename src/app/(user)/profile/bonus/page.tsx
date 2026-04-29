"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Gift,
  TrendingUp,
  Wallet,
  Users,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserService } from "@/services/user.service";
import { cn } from "@/lib/utils";

const BONUS_TYPE_META: Record<
  string,
  { label: string; badge: string; icon: typeof Gift }
> = {
  DEPOSIT_BONUS: {
    label: "Deposit Bonus",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    icon: Wallet,
  },
  MANUAL_DEPOSIT_BONUS: {
    label: "Manual Deposit Bonus",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
    icon: Wallet,
  },
  REFERRAL_DEPOSIT_BONUS: {
    label: "Referral Bonus",
    badge: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    icon: Users,
  },
  JOIN_BONUS: {
    label: "Join Bonus",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
    icon: Sparkles,
  },
};

type BonusHistoryItem = {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  amount?: number | string;
  createdAt?: string;
};

const fmt = (n: number | string) => `₹${Number(n ?? 0).toLocaleString("en-BD")}`;

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: typeof Gift;
  color: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("rounded-xl p-2", color)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
          {title}
        </p>
      </div>
      <p className="text-lg font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export default function BonusHistoryPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["bonus-history"],
    queryFn: UserService.getBonusHistory,
  });

  const summary = data?.data?.summary ?? {};
  const history: BonusHistoryItem[] = data?.data?.history ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <Skeleton className="h-72 bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-2.5 py-1 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f8fcc] hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="text-[10px] font-semibold tracking-[0.06em]">
            Back
          </span>
        </button>
        <h1 className="text-xl font-bold text-slate-950 dark:text-white">Bonus History</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track deposit, referral, and join bonuses in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          title="Available Bonus"
          value={fmt(summary.availableBonusBalance)}
          icon={Gift}
          color="bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
        />
        <SummaryCard
          title="Total Earned"
          value={fmt(summary.totalBonusEarned)}
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        />
        <SummaryCard
          title="Deposit Bonus"
          value={fmt(summary.totalDepositBonus)}
          icon={Wallet}
          color="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        />
        <SummaryCard
          title="Referral Bonus"
          value={fmt(summary.totalReferralBonus)}
          icon={Users}
          color="bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
        />
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Extra Summary</h2>
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
            Join Bonus {fmt(summary.totalJoinBonus)}
          </Badge>
        </div>

        {history.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <Gift className="mx-auto mb-3 h-10 w-10 text-slate-400 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No bonus history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const typeKey = item.type ?? "";
              const meta = BONUS_TYPE_META[typeKey] ?? {
                label: item.type ?? "Bonus",
                badge: "bg-slate-600/20 text-slate-300",
                icon: Gift,
              };
              const Icon = meta.icon;

              return (
                <div
                  key={item.id}
                  className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:shadow-none">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {item.title || meta.label}
                          </p>
                          <Badge className={meta.badge}>{meta.label}</Badge>
                        </div>
                        {item.description && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-500">
                          <CalendarDays className="h-3 w-3" />
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString("en-BD")
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">
                        +{fmt(item.amount ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
