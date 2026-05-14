"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  Layers3,
  Sparkles,
  CircleAlert,
  WalletCards,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserService } from "@/services/user.service";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/providers/language-provider";
import { cn } from "@/lib/utils";

const fmtAmount = (
  amount: number,
  currency: "BDT" | "USD",
  usdToBdt: number,
) =>
  currency === "USD"
    ? `$${(amount / usdToBdt).toFixed(2)}`
    : `Rs ${amount.toLocaleString("en-BD")}`;

const formatPercent = (completed: number, target: number) => {
  if (!target || target <= 0) return completed > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (completed / target) * 100));
};

const bucketMeta = {
  MAIN: {
    labelKey: "turnoverMain" as const,
    badgeClass: "bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-500/20",
    cardClass: "border-slate-800 bg-slate-900/70",
    icon: Layers3,
  },
  BONUS: {
    labelKey: "turnoverBonus" as const,
    badgeClass: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20",
    cardClass: "border-slate-800 bg-slate-900/70",
    icon: Sparkles,
  },
};

function EmptyState({
  text,
  subtle = false,
}: {
  text: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[48vh] flex-col items-center justify-center rounded-[26px] border px-6 py-12 text-center",
        subtle
          ? "border-[#1b2a4a] bg-[#0d162b]/80"
          : "border-[#1b2a4a] bg-[#101722]",
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="relative rounded-[24px] border border-cyan-500/15 bg-gradient-to-br from-cyan-500/14 via-sky-500/10 to-[#0f1d3d] p-5">
          <WalletCards className="h-10 w-10 text-cyan-300" />
        </div>
      </div>
      <p className="text-base font-medium text-slate-300">{text}</p>
    </div>
  );
}

function TurnoverItemCard({
  item,
  currency,
  usdToBdt,
  title,
  isCompleted = false,
}: {
  item: any;
  currency: "BDT" | "USD";
  usdToBdt: number;
  title: string;
  isCompleted?: boolean;
}) {
  const meta =
    bucketMeta[item.bucket as keyof typeof bucketMeta] ?? bucketMeta.MAIN;
  const Icon = meta.icon;
  const targetAmount = Number(item.targetAmount ?? 0);
  const completedAmount = Number(item.completedAmount ?? 0);
  const remainingAmount = Math.max(Number(item.remainingAmount ?? 0), 0);
  const progress = isCompleted
    ? 100
    : formatPercent(completedAmount, targetAmount);

  return (
    <div
      className={cn(
        "rounded-[22px] border p-4 shadow-[0_14px_28px_rgba(0,0,0,0.22)]",
        meta.cardClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium",
              isCompleted
                ? "bg-emerald-500/14 text-emerald-300 ring-1 ring-emerald-500/20"
                : meta.badgeClass,
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isCompleted ? title : item.status}
          </span>
          <div className="mt-3 flex items-center gap-2">
            <div className="rounded-xl bg-slate-800 p-2 text-slate-200 ring-1 ring-slate-700/70">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-slate-100">
                {item.sourceType || title}
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span>{title}</span>
                <CircleAlert className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[13px] text-slate-400">
            {fmtAmount(targetAmount, currency, usdToBdt)}
          </p>
          <p className="mt-1 text-3xl font-light tracking-tight text-white">
            {fmtAmount(
              isCompleted ? completedAmount || targetAmount : remainingAmount,
              currency,
              usdToBdt,
            )}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <p className="text-amber-400">
            {fmtAmount(completedAmount, currency, usdToBdt)}
            <span className="text-slate-500">
              {" "}
              / {fmtAmount(targetAmount, currency, usdToBdt)}
            </span>
          </p>
          <p className="text-slate-500">{progress.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

export default function TurnoverPage() {
  const router = useRouter();
  const { usdToBdt } = useCurrency();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["turnover-page"],
    queryFn: () => UserService.getTurnover(1, 50),
  });

  const [currency, setCurrency] = useQueryState();
  const turnover = data?.data;
  const active = turnover?.active;
  const completed = turnover?.completed?.items ?? [];
  const mainItems = active?.main ?? [];
  const bonusItems = active?.bonus ?? [];
  const canWithdraw = Boolean(active?.canWithdraw);

  if (isLoading) {
    return (
      <div className="space-y-4 pb-6">
        <Skeleton className="h-10 w-40 rounded-full bg-slate-800" />
        <Skeleton className="h-14 rounded-[20px] bg-slate-900/80" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-44 rounded-[22px] bg-slate-900/80"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 text-white">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-3 text-white transition-colors hover:text-slate-200"
          aria-label="Go back"
        >
          <ChevronLeft className="h-6 w-6" />
          <h1 className="text-[2rem] font-medium tracking-tight">
            {t.profile.turnoverTitle}
          </h1>
        </button>
        <div className="flex items-center justify-between rounded-[20px] border border-slate-800 bg-slate-900/70 p-2">
          <div
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-medium",
              canWithdraw
                ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20"
                : "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/20",
            )}
          >
            {canWithdraw ? t.profile.turnoverReady : t.profile.turnoverLocked}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-[#15181d] p-1">
            <button
              onClick={() => setCurrency("BDT")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                currency === "BDT"
                  ? "bg-[#ff8a1c] text-black"
                  : "text-slate-400 hover:text-white",
              )}
            >
              RS
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                currency === "USD"
                  ? "bg-[#ff8a1c] text-black"
                  : "text-slate-400 hover:text-white",
              )}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList
          variant="line"
          className="grid h-auto w-full grid-cols-2 rounded-none border-b border-slate-800 bg-transparent p-0"
        >
          <TabsTrigger
            value="active"
            className="rounded-none border-0 px-0 py-4 text-lg font-medium text-slate-500 data-[state=active]:text-white data-[state=active]:after:opacity-100 after:bottom-[-1px] after:h-[3px] after:rounded-full after:bg-[#ff8a1c]"
          >
            {t.profile.turnoverActive}
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="rounded-none border-0 px-0 py-4 text-lg font-medium text-slate-500 data-[state=active]:text-white data-[state=active]:after:opacity-100 after:bottom-[-1px] after:h-[3px] after:rounded-full after:bg-[#ff8a1c]"
          >
            {t.profile.turnoverCompleted}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="pt-5">
          {mainItems.length || bonusItems.length ? (
            <div className="space-y-4">
              {[...mainItems, ...bonusItems].map((item: any) => {
                const meta =
                  bucketMeta[item.bucket as keyof typeof bucketMeta] ??
                  bucketMeta.MAIN;

                return (
                  <TurnoverItemCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    usdToBdt={usdToBdt}
                    title={t.profile[meta.labelKey]}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState text={t.profile.turnoverEmpty} />
          )}
        </TabsContent>

        <TabsContent value="completed" className="pt-5">
          {completed.length ? (
            <div className="space-y-4">
              {completed.map((item: any) => {
                const meta =
                  bucketMeta[item.bucket as keyof typeof bucketMeta] ??
                  bucketMeta.MAIN;

                return (
                  <TurnoverItemCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    usdToBdt={usdToBdt}
                    title={t.profile[meta.labelKey]}
                    isCompleted
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState text={t.profile.turnoverCompletedEmpty} subtle />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useQueryState() {
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

  return [currency, setCurrency] as const;
}
