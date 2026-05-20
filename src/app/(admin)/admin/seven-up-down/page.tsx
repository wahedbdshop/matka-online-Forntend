"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Flame,
  Power,
  RefreshCw,
  Shield,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { SevenUpDownAdminService } from "@/services/seven-up-down.service";

const formatAmount = (value?: string | number) =>
  Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const todayDhaka = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Coins;
  tone: "green" | "red" | "blue" | "yellow";
}) {
  const toneClass = {
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    blue: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-black/15">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

export default function SevenUpDownAdminPage() {
  const queryClient = useQueryClient();
  const [reportFrom, setReportFrom] = useState(todayDhaka);
  const [reportTo, setReportTo] = useState(todayDhaka);
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["seven-up-down-admin-settings"],
    queryFn: SevenUpDownAdminService.getSettings,
  });

  const {
    data: reportData,
    isLoading: reportLoading,
    refetch: refetchReport,
    isFetching: reportFetching,
  } = useQuery({
    queryKey: ["seven-up-down-admin-report", reportFrom, reportTo],
    queryFn: () =>
      SevenUpDownAdminService.getReport({
        fromDate: reportFrom,
        toDate: reportTo,
      }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  const settings = data?.data;
  const report = reportData?.data;

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: SevenUpDownAdminService.updateSettings,
    onSuccess: () => {
      toast.success("Seven Up Down settings updated");
      queryClient.invalidateQueries({ queryKey: ["seven-up-down-admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["seven-up-down-lobby"] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!.data!
              .message!
          : "Failed to update settings";
      toast.error(message);
    },
  });

  const setDraft = (key: string, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const readDraft = (key: string, fallback?: string | number) =>
    drafts[key] ?? String(fallback ?? "");

  const saveNumberField = (
    field:
      | "minBet"
      | "maxBet"
      | "bettingWindowSec"
      | "rangePayoutMultiplier"
      | "sevenPayoutMultiplier"
      | "powerFrequency"
      | "powerMultiplier",
  ) => {
    const rawValue = drafts[field] ?? settings?.[field];
    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid number");
      return;
    }

    updateSettings({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">7 Up 7 Down Control</h1>
        <p className="mt-1 text-xs text-slate-400">
          Game on/off, power rounds, admin profit/loss, and board payout control.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        {isLoading ? (
          <div className="h-52 animate-pulse rounded-xl bg-slate-700/60" />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Game Status</p>
                    <p className="text-xs font-bold text-emerald-300">
                      {settings?.isEnabled ? "ONLINE" : "OFFLINE"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => updateSettings({ isEnabled: !settings?.isEnabled })}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white"
                >
                  {settings?.isEnabled ? "Turn OFF" : "Turn ON"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Anti-Loss</p>
                    <p className="text-xs font-bold text-cyan-300">
                      {settings?.enableAntiLoss ? "ENABLED" : "RANDOM MODE"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    updateSettings({ enableAntiLoss: !settings?.enableAntiLoss })
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white"
                >
                  Toggle
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-yellow-500/35 bg-yellow-500/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-500/15 p-3 text-yellow-300">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Power Round</p>
                    <p className="text-xs font-bold text-yellow-300">
                      Every {settings?.powerFrequency ?? 2} rounds • x{settings?.powerMultiplier ?? "2"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <WalletCards className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Bet Limits</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={readDraft("minBet", settings?.minBet)}
                    onChange={(event) => setDraft("minBet", event.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                  <input
                    type="number"
                    value={readDraft("maxBet", settings?.maxBet)}
                    onChange={(event) => setDraft("maxBet", event.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const minBet = Number(readDraft("minBet", settings?.minBet));
                    const maxBet = Number(readDraft("maxBet", settings?.maxBet));
                    updateSettings({ minBet, maxBet });
                  }}
                  className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                >
                  Save Limits
                </button>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Range / 7 Payout</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={readDraft("rangePayoutMultiplier", settings?.rangePayoutMultiplier)}
                    onChange={(event) =>
                      setDraft("rangePayoutMultiplier", event.target.value)
                    }
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={readDraft("sevenPayoutMultiplier", settings?.sevenPayoutMultiplier)}
                    onChange={(event) =>
                      setDraft("sevenPayoutMultiplier", event.target.value)
                    }
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveNumberField("rangePayoutMultiplier")}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Save Range
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNumberField("sevenPayoutMultiplier")}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Save Seven
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Timer className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Round Time</span>
                </div>
                <input
                  type="number"
                  value={readDraft("bettingWindowSec", settings?.bettingWindowSec)}
                  onChange={(event) => setDraft("bettingWindowSec", event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => saveNumberField("bettingWindowSec")}
                  className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                >
                  Save Time
                </button>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Flame className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Power Config</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={readDraft("powerFrequency", settings?.powerFrequency)}
                    onChange={(event) => setDraft("powerFrequency", event.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={readDraft("powerMultiplier", settings?.powerMultiplier)}
                    onChange={(event) => setDraft("powerMultiplier", event.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => saveNumberField("powerFrequency")}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Save Gap
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNumberField("powerMultiplier")}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Save Mult
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-black text-white">Profit / Loss Report</h2>
            <p className="mt-1 text-xs text-slate-400">
              Date wise admin profit, admin loss, total payout, and settled round list.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={reportFrom}
              onChange={(event) => setReportFrom(event.target.value)}
              className="h-9 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs font-semibold text-slate-200"
            />
            <input
              type="date"
              value={reportTo}
              onChange={(event) => setReportTo(event.target.value)}
              className="h-9 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs font-semibold text-slate-200"
            />
            <button
              type="button"
              onClick={() => refetchReport()}
              className="flex h-9 items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reportFetching ? "animate-spin" : ""}`} />
              Load
            </button>
          </div>
        </div>

        {reportLoading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-slate-700/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard
                icon={Coins}
                tone="blue"
                label="Total Stake"
                value={`Tk ${formatAmount(report?.totalStake)}`}
                sub={`${formatAmount(report?.totalBets)} bets • ${formatAmount(report?.totalRounds)} rounds`}
              />
              <StatCard
                icon={TrendingDown}
                tone="yellow"
                label="Total Payout"
                value={`Tk ${formatAmount(report?.totalPayout)}`}
                sub="Paid to winners"
              />
              <StatCard
                icon={TrendingUp}
                tone={Number(report?.adminProfit ?? 0) < 0 ? "red" : "green"}
                label="Admin Profit"
                value={`Tk ${formatAmount(report?.adminProfit)}`}
                sub={
                  Number(report?.adminProfit ?? 0) < 0
                    ? `Loss Tk ${formatAmount(report?.adminLoss)}`
                    : "Net margin"
                }
              />
              <StatCard
                icon={Trophy}
                tone="yellow"
                label="Won / Lost"
                value={`${formatAmount(report?.wonBetCount)} / ${formatAmount(report?.lostBetCount)}`}
                sub={`User profit Tk ${formatAmount(report?.userProfit)}`}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
              <div className="border-b border-slate-700 px-4 py-3">
                <p className="text-xs font-black text-white">Recent 7 Up 7 Down Rounds</p>
              </div>
              {report?.recentRounds?.length ? (
                <div className="divide-y divide-slate-700/70">
                  {report.recentRounds.map((round) => {
                    const roundProfit = Number(round.adminProfit ?? 0);
                    return (
                      <div
                        key={round.roundCode}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-mono text-xs font-bold text-white">
                              {round.roundCode}
                            </p>
                            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                              {round.resultType ?? "-"} {round.total ?? ""}
                            </span>
                            {round.isPowerRound ? (
                              <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black text-yellow-300">
                                {round.powerMultiplier}x power
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Dice {round.diceOne ?? "-"} + {round.diceTwo ?? "-"} • Stake Tk{" "}
                            {formatAmount(round.totalStake)} • Payout Tk {formatAmount(round.totalPayout)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-black ${
                              roundProfit < 0 ? "text-red-400" : "text-emerald-300"
                            }`}
                          >
                            Tk {formatAmount(roundProfit)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {round.settledAt
                              ? new Date(round.settledAt).toLocaleTimeString("en-BD", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-slate-400">
                  No rounds found for this date range.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
