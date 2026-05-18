"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpFromLine,
  Coins,
  Power,
  RefreshCw,
  Timer,
  TrendingUp,
  Trophy,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { CoinTossAdminService } from "@/services/coin-toss.service";

const formatAmount = (value?: string | number) =>
  Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const todayDhaka = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

function ReportCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "purple" | "green" | "red" | "yellow";
  icon: typeof Coins;
}) {
  const toneClass = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/25 bg-red-500/10 text-red-300",
    yellow: "border-yellow-500/25 bg-yellow-500/10 text-yellow-300",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-black/15">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-300">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

export default function CoinTossAdminPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["coin-toss-admin-settings"],
    queryFn: CoinTossAdminService.getSettings,
  });

  const settings = data?.data;
  const [minBetInput, setMinBetInput] = useState("");
  const [maxBetInput, setMaxBetInput] = useState("");
  const [payoutInput, setPayoutInput] = useState("");
  const [roundTimeInput, setRoundTimeInput] = useState("");
  const [reportFrom, setReportFrom] = useState(todayDhaka);
  const [reportTo, setReportTo] = useState(todayDhaka);

  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
    isFetching: isReportFetching,
  } = useQuery({
    queryKey: ["admin-coin-toss-report", reportFrom, reportTo],
    queryFn: () =>
      CoinTossAdminService.getReport({
        fromDate: reportFrom,
        toDate: reportTo,
      }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: CoinTossAdminService.updateSettings,
    onSuccess: () => {
      toast.success("Coin Toss settings updated");
      queryClient.invalidateQueries({ queryKey: ["coin-toss-admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["coin-toss-lobby"] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to update Coin Toss settings";
      toast.error(message);
    },
  });

  const isEnabled = Boolean(settings?.isEnabled);
  const report = reportData?.data;

  useEffect(() => {
    if (!settings) return;
    setMinBetInput(settings.minBet);
    setMaxBetInput(settings.maxBet);
    setPayoutInput(settings.payoutMultiplier);
    setRoundTimeInput(String(settings.bettingWindowSec));
  }, [settings]);

  const saveBetLimit = () => {
    const minBet = Number(minBetInput);
    const maxBet = Number(maxBetInput);

    if (!Number.isFinite(minBet) || minBet <= 0) {
      toast.error("Enter a valid min bet");
      return;
    }

    if (!Number.isFinite(maxBet) || maxBet <= 0 || maxBet < minBet) {
      toast.error("Max bet must be greater than or equal to min bet");
      return;
    }

    updateSettings({ minBet, maxBet });
  };

  const savePayout = () => {
    const payoutMultiplier = Number(payoutInput);

    if (
      !Number.isFinite(payoutMultiplier) ||
      payoutMultiplier < 0 ||
      payoutMultiplier > 10
    ) {
      toast.error("Enter payout between 0 and 10");
      return;
    }

    updateSettings({ payoutMultiplier });
  };

  const saveRoundTime = () => {
    const bettingWindowSec = Number(roundTimeInput);

    if (
      !Number.isInteger(bettingWindowSec) ||
      bettingWindowSec < 5 ||
      bettingWindowSec > 120
    ) {
      toast.error("Round time must be 5 to 120 seconds");
      return;
    }

    updateSettings({ bettingWindowSec });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Coin Toss Control</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Turn the Coin Toss game on or off from admin dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-700" />
        ) : (
          <div className="space-y-5">
            <div
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-4 ${
                isEnabled
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-red-500/40 bg-red-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-3 ${
                    isEnabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  <Power className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Game Status
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      isEnabled ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {isEnabled ? "ONLINE" : "OFFLINE"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isPending || !settings}
                onClick={() => updateSettings({ isEnabled: !isEnabled })}
                className={`rounded-lg px-5 py-2.5 text-xs font-black text-white shadow-lg transition disabled:opacity-50 ${
                  isEnabled
                    ? "bg-red-600 shadow-red-500/20 hover:bg-red-700"
                    : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700"
                }`}
              >
                {isPending
                  ? "Saving..."
                  : isEnabled
                    ? "Turn OFF"
                    : "Turn ON"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <WalletCards className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Bet Limit</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={minBetInput}
                    onChange={(event) => setMinBetInput(event.target.value)}
                    className="h-9 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min={1}
                    value={maxBetInput}
                    onChange={(event) => setMaxBetInput(event.target.value)}
                    className="h-9 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                    placeholder="Max"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveBetLimit}
                  disabled={isPending}
                  className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Save Bet Limit
                </button>
                <p className="mt-2 text-[11px] font-bold text-slate-400">
                  Current: {formatAmount(settings?.minBet)} - {formatAmount(settings?.maxBet)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Payout</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.01}
                  value={payoutInput}
                  onChange={(event) => setPayoutInput(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                  placeholder="0.70"
                />
                <button
                  type="button"
                  onClick={savePayout}
                  disabled={isPending}
                  className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Save Payout
                </button>
                <p className="mt-2 text-[11px] font-bold text-slate-400">
                  Current: 1 : {settings?.payoutMultiplier ?? "0.70"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Timer className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Round Time</span>
                </div>
                <input
                  type="number"
                  min={5}
                  max={120}
                  step={1}
                  value={roundTimeInput}
                  onChange={(event) => setRoundTimeInput(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                  placeholder="10"
                />
                <button
                  type="button"
                  onClick={saveRoundTime}
                  disabled={isPending}
                  className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  Save Round Time
                </button>
                <p className="mt-2 text-[11px] font-bold text-slate-400">
                  Current: {settings?.bettingWindowSec ?? 10}s
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-black text-white">
              Profit / Loss Report
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Today default, date change kore ager/picher Coin Toss report dekha jabe.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={reportFrom}
              onChange={(event) => setReportFrom(event.target.value)}
              className="h-9 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500"
            />
            <input
              type="date"
              value={reportTo}
              onChange={(event) => setReportTo(event.target.value)}
              className="h-9 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => refetchReport()}
              className="flex h-9 items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-300"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isReportFetching ? "animate-spin" : ""}`}
              />
              Load
            </button>
          </div>
        </div>

        {isReportLoading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl bg-slate-700/60"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <ReportCard
                icon={Coins}
                tone="cyan"
                label="Total Stake"
                value={`Rs ${formatAmount(report?.totalStake)}`}
                sub={`${formatAmount(report?.totalBets)} bets · ${formatAmount(report?.totalRounds)} rounds`}
              />
              <ReportCard
                icon={ArrowUpFromLine}
                tone="purple"
                label="Total Payout"
                value={`Rs ${formatAmount(report?.totalPayout)}`}
                sub="Paid to winners"
              />
              <ReportCard
                icon={TrendingUp}
                tone={Number(report?.adminProfit ?? 0) < 0 ? "red" : "green"}
                label="Admin Profit"
                value={`Rs ${formatAmount(report?.adminProfit)}`}
                sub={
                  Number(report?.adminProfit ?? 0) < 0
                    ? "Loss in selected range"
                    : "Net margin"
                }
              />
              <ReportCard
                icon={Trophy}
                tone="yellow"
                label="Won / Lost Bets"
                value={`${formatAmount(report?.wonBetCount)} / ${formatAmount(report?.lostBetCount)}`}
                sub={`User profit Rs ${formatAmount(report?.userProfit)}`}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60">
              <div className="border-b border-slate-700 px-4 py-3">
                <p className="text-xs font-black text-white">
                  Recent Coin Toss Rounds
                </p>
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
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                round.outcome === "HEAD"
                                  ? "bg-amber-500/10 text-amber-300"
                                  : "bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {round.outcome ?? "-"}
                            </span>
                            {round.powerMultiplier ? (
                              <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-black text-yellow-300">
                                {round.powerMultiplier}x power
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            H Rs {formatAmount(round.totalHeadStake)} · T Rs {formatAmount(round.totalTailStake)} · Payout Rs {formatAmount(round.totalPayout)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-black ${
                              roundProfit < 0 ? "text-red-400" : "text-emerald-300"
                            }`}
                          >
                            Rs {formatAmount(roundProfit)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {round.settledAt
                              ? new Date(round.settledAt).toLocaleTimeString(
                                  "en-BD",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-xs text-slate-400">
                  No Coin Toss rounds found for this date range.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
