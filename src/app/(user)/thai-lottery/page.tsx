/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Plus,
  History,
  Trophy,
  Percent,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";
import { useCurrency } from "@/hooks/use-currency";
import { formatAbsoluteUtcDateTimeForBangladeshDisplay } from "@/lib/timezone";

const DEFAULT_ROWS = 8;

const QUICK_ACTIONS = [
  {
    href: "/thai-lottery/history",
    label: "Bet History",
    icon: History,
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    href: "/thai-lottery/win-history",
    label: "Win History",
    icon: Trophy,
    color: "text-amber-400 bg-amber-500/10",
  },
  {
    href: "/thai-lottery/game-rate",
    label: "Game Rate",
    icon: Percent,
    color: "text-green-400 bg-green-500/10",
  },
  {
    href: "/thai-lottery/results",
    label: "Result",
    icon: ListChecks,
    color: "text-purple-400 bg-purple-500/10",
  },
] as const;

const PLAY_TYPES = [
  {
    value: "THREE_UP_COMBO",
    label: "3Up Direct + Rumble",
    maxLength: 3,
    mode: "combo",
    helper: "Same number, play Direct or Rumble or both together.",
  },
  {
    value: "THREE_UP_SINGLE",
    label: "3Up Single",
    maxLength: 1,
    mode: "single",
    helper: "Single-digit 3Up play.",
  },
  {
    value: "THREE_UP_TOTAL",
    label: "3Up Total",
    maxLength: 1,
    mode: "single",
    helper: "Total-based 3Up play.",
  },
  {
    value: "TWO_UP_DIRECT",
    label: "2Up Direct",
    maxLength: 2,
    mode: "single",
    helper: "Exact 2-digit up play.",
  },
  {
    value: "DOWN_DIRECT",
    label: "Down Direct",
    maxLength: 2,
    mode: "single",
    helper: "Exact 2-digit down play.",
  },
  {
    value: "DOWN_SINGLE",
    label: "Down Single",
    maxLength: 1,
    mode: "single",
    helper: "Single-digit down play.",
  },
  {
    value: "DOWN_TOTAL",
    label: "Down Total",
    maxLength: 1,
    mode: "single",
    helper: "Total-based down play.",
  },
] as const;

type ActualPlayType =
  | "THREE_UP_DIRECT"
  | "THREE_UP_RUMBLE"
  | "THREE_UP_SINGLE"
  | "THREE_UP_TOTAL"
  | "TWO_UP_DIRECT"
  | "DOWN_DIRECT"
  | "DOWN_SINGLE"
  | "DOWN_TOTAL";

type UIPlayType = (typeof PLAY_TYPES)[number]["value"];

type BetRowField =
  | "betNumber"
  | "amountUsd"
  | "directAmountUsd"
  | "rumbleAmountUsd";

interface BetRow {
  id: number;
  betNumber: string;
  amountUsd: string;
  directAmountUsd: string;
  rumbleAmountUsd: string;
}

type RateInfo = {
  multiplier: number;
  baseDiscountPct: number;
  globalDiscountPct: number;
};

const FALLBACK_RATES: Record<ActualPlayType, RateInfo> = {
  THREE_UP_DIRECT: {
    multiplier: 500,
    baseDiscountPct: 0,
    globalDiscountPct: 0,
  },
  THREE_UP_RUMBLE: { multiplier: 90, baseDiscountPct: 0, globalDiscountPct: 0 },
  THREE_UP_SINGLE: { multiplier: 3, baseDiscountPct: 0, globalDiscountPct: 0 },
  THREE_UP_TOTAL: { multiplier: 9, baseDiscountPct: 0, globalDiscountPct: 0 },
  TWO_UP_DIRECT: { multiplier: 70, baseDiscountPct: 0, globalDiscountPct: 0 },
  DOWN_DIRECT: { multiplier: 70, baseDiscountPct: 0, globalDiscountPct: 0 },
  DOWN_SINGLE: { multiplier: 3, baseDiscountPct: 0, globalDiscountPct: 0 },
  DOWN_TOTAL: { multiplier: 9, baseDiscountPct: 0, globalDiscountPct: 0 },
};

const makeRows = (n: number): BetRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    betNumber: "",
    amountUsd: "",
    directAmountUsd: "",
    rumbleAmountUsd: "",
  }));

const amountInput = (value: string) =>
  value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

const getRateDiscountPct = (rate?: Partial<RateInfo>) =>
  Number(rate?.globalDiscountPct ?? 0) + Number(rate?.baseDiscountPct ?? 0);

export default function ThaiLotteryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedPlayType, setSelectedPlayType] = useState<UIPlayType | null>(
    null,
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [betRows, setBetRows] = useState<BetRow[]>(makeRows(DEFAULT_ROWS));
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: ThaiLotteryUserService.getProfile,
  });
  const { data: activeRoundData, isLoading: roundLoading } = useQuery({
    queryKey: ["thai-active-round"],
    queryFn: ThaiLotteryUserService.getActiveRound,
  });
  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ["thai-rates"],
    queryFn: ThaiLotteryUserService.getBetRates,
    retry: false,
  });
  const { usdToBdt } = useCurrency();
  const { mutateAsync: placeBetAsync, isPending } = useMutation({
    mutationFn: ThaiLotteryUserService.placeBet,
  });

  const selectedPlay = PLAY_TYPES.find((p) => p.value === selectedPlayType);
  const isComboMode = selectedPlay?.mode === "combo";
  const maxLength = selectedPlay?.maxLength ?? 3;
  const ratesList = ratesData?.data ?? [];
  const activeRound = activeRoundData?.data;
  const roundStatus = String(activeRound?.status ?? "").toUpperCase();
  const hasOpenRound =
    Boolean(activeRound?.id) &&
    !["CLOSED", "RESULTED", "CANCELLED"].includes(roundStatus);
  const usdBalance = Number(profileData?.data?.balance ?? 0) / usdToBdt;

  const getRate = (playType: ActualPlayType): RateInfo =>
    ratesList.find((r: any) => r.playType === playType) ?? FALLBACK_RATES[playType];

  const selectedRate = !isComboMode
    ? selectedPlayType
      ? getRate(selectedPlayType as ActualPlayType)
      : null
    : null;
  const directRate = getRate("THREE_UP_DIRECT");
  const rumbleRate = getRate("THREE_UP_RUMBLE");

  const totals = useMemo(() => {
    let betTotal = 0;
    let discountAmount = 0;

    for (const row of betRows) {
      if (isComboMode) {
        const directAmount = Number(row.directAmountUsd) || 0;
        const rumbleAmount = Number(row.rumbleAmountUsd) || 0;

        betTotal += directAmount + rumbleAmount;
        discountAmount +=
          directAmount * (getRateDiscountPct(directRate) / 100) +
          rumbleAmount * (getRateDiscountPct(rumbleRate) / 100);
        continue;
      }

      const amount = Number(row.amountUsd) || 0;
      betTotal += amount;
      discountAmount += amount * (getRateDiscountPct(selectedRate ?? undefined) / 100);
    }

    const roundedTotal = Number(betTotal.toFixed(2));
    const roundedDiscount = Number(discountAmount.toFixed(2));

    return {
      betTotal: roundedTotal,
      discountAmount: roundedDiscount,
      afterAmount: Number((roundedTotal - roundedDiscount).toFixed(2)),
    };
  }, [betRows, directRate, isComboMode, rumbleRate, selectedRate]);

  const updateRow = (id: number, field: BetRowField, value: string) =>
    setBetRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );

  const resetRows = () => setBetRows(makeRows(DEFAULT_ROWS));

  const addRow = () =>
    setBetRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        betNumber: "",
        amountUsd: "",
        directAmountUsd: "",
        rumbleAmountUsd: "",
      },
    ]);

  const buildPayloads = () => {
    if (!selectedPlayType) {
      toast.error("Select category first");
      return null;
    }

    const payloads: Array<{
      roundId: string;
      playType: ActualPlayType;
      betNumber: string;
      amount: number;
    }> = [];

    const filledRows = betRows.filter((row) => {
      if (isComboMode) {
        return (
          row.betNumber.trim() ||
          row.directAmountUsd.trim() ||
          row.rumbleAmountUsd.trim()
        );
      }

      return row.betNumber.trim() || row.amountUsd.trim();
    });

    if (!filledRows.length) {
      toast.error("At least one bet row is required");
      return null;
    }

    for (const row of filledRows) {
      const betNumber = row.betNumber.trim();

      if (!betNumber) {
        toast.error("Bet number is required");
        return null;
      }

      if (!/^\d+$/.test(betNumber)) {
        toast.error("Digits only");
        return null;
      }

      if (betNumber.length !== maxLength) {
        toast.error(`${selectedPlay?.label} needs ${maxLength} digit(s)`);
        return null;
      }

      if (isComboMode) {
        const directRaw = row.directAmountUsd.trim();
        const rumbleRaw = row.rumbleAmountUsd.trim();
        const directAmount = Number(directRaw) || 0;
        const rumbleAmount = Number(rumbleRaw) || 0;

        if (!directRaw && !rumbleRaw) {
          toast.error("Enter direct or rumble amount");
          return null;
        }

        if (directRaw && directAmount <= 0) {
          toast.error("Enter valid direct amount");
          return null;
        }

        if (rumbleRaw && rumbleAmount <= 0) {
          toast.error("Enter valid rumble amount");
          return null;
        }

        if (directAmount > 0) {
          payloads.push({
            roundId: activeRound.id,
            playType: "THREE_UP_DIRECT",
            betNumber,
            amount: directAmount,
          });
        }

        if (rumbleAmount > 0) {
          payloads.push({
            roundId: activeRound.id,
            playType: "THREE_UP_RUMBLE",
            betNumber,
            amount: rumbleAmount,
          });
        }

        continue;
      }

      const amount = Number(row.amountUsd) || 0;
      if (amount <= 0) {
        toast.error("Enter valid amount");
        return null;
      }

      payloads.push({
        roundId: activeRound.id,
        playType: selectedPlayType as ActualPlayType,
        betNumber,
        amount,
      });
    }

    return payloads;
  };

  const handleSubmit = async () => {
    if (!activeRound?.id) {
      toast.error("No open round available");
      return;
    }

    const payloads = buildPayloads();
    if (!payloads?.length) return;

    if (totals.afterAmount > usdBalance) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      let generatedBetCode = "";

      for (const payload of payloads) {
        const response = await placeBetAsync(payload);

        if (!generatedBetCode && response?.data?.confirmCode) {
          generatedBetCode = response.data.confirmCode;
        }
      }

      toast.success(
        generatedBetCode
          ? `Bet placed! Code: #${generatedBetCode}`
          : "Bet placed successfully",
      );

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["thai-active-round"] });
      queryClient.invalidateQueries({ queryKey: ["thai-history"] });

      resetRows();

      router.push(
        generatedBetCode
          ? `/thai-lottery/history?confirmCode=${generatedBetCode}`
          : "/thai-lottery/history",
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to place bet");
    }
  };

  if (profileLoading || roundLoading || ratesLoading) {
    return (
      <div className="min-h-screen bg-[#081120]">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col bg-[#0d1930] px-4 py-4 text-white">
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-2xl bg-[#173158]" />
              ))}
            </div>
            <div className="h-24 rounded-3xl bg-[#173158]" />
            <div className="h-20 rounded-3xl bg-[#173158]" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-[#173158]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shineMove {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }

        .glass-card {
          background:
            linear-gradient(180deg, rgba(10, 18, 42, 0.98), rgba(3, 8, 20, 0.98));
          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .primary-gradient {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #7c3aed 100%);
        }

        .accent-gradient {
          background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
        }

        .shine::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 38%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.14),
            transparent
          );
          transform: translateX(-120%);
          animation: shineMove 3.6s linear infinite;
        }

        .scroll-area { -ms-overflow-style: none; scrollbar-width: none; }
        .scroll-area::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="min-h-screen bg-[#020810]">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-3 py-3 text-white sm:px-4">
          <div className="glass-card relative overflow-hidden rounded-[28px] border border-white/8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

            <div className="space-y-4 px-4 pb-4 pt-4 sm:px-5">
              <div className="grid grid-cols-4 gap-2">
                {QUICK_ACTIONS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex flex-col items-center gap-1 rounded-[18px] border border-slate-700/70 bg-slate-800/55 px-1 py-2 text-center transition-colors hover:bg-slate-800"
                  >
                    <div className={`rounded-xl p-1.5 ${item.color}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="whitespace-nowrap text-[9px] font-semibold text-slate-200">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="flex items-start justify-between gap-3 rounded-[24px] border border-[#1d2e5c] bg-[#060f22] px-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Image
                      src="/thai.png"
                      alt="Thai Lottery"
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                      priority
                    />
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-300/80">
                      Thai Lottery
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Thailand Lottery Official Games
                  </p>
                  {hasOpenRound && activeRound?.closeTime ? (
                    <p className="mt-1 text-[10px] text-emerald-300/80">
                      Closes:{" "}
                      {formatAbsoluteUtcDateTimeForBangladeshDisplay(
                        activeRound.closeTime,
                        { includeTimezone: true },
                      )}
                    </p>
                  ) : null}
                </div>

                <Link
                  href="/deposit"
                  className="shrink-0 rounded-full border border-blue-400/20 bg-[#081428] px-3 py-2 text-right transition-colors hover:border-blue-300/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">
                      USD {usdBalance.toFixed(2)}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </span>
                  </div>
                </Link>
              </div>

              {!hasOpenRound && (
                <div className="rounded-[22px] border border-amber-400/20 bg-[linear-gradient(135deg,_rgba(70,36,11,0.95),_rgba(45,23,10,0.95))] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                    Bangladesh Time Control
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-100/75">
                    This play is closed right now. Access follows admin-configured
                    Bangladesh time on the server, so changing mobile, browser,
                    or system time will not reopen betting.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <button
                    type="button"
                    disabled={!hasOpenRound}
                    onClick={() => setShowDropdown((prev) => !prev)}
                    className="primary-gradient shine relative flex min-h-10 w-full items-center justify-between overflow-hidden rounded-[18px] border border-blue-400/20 px-3 py-2 text-left shadow-[0_10px_20px_rgba(0,0,0,0.18)] transition-transform duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div>
                      <p className="text-sm font-black tracking-[0.04em] text-white">
                        {selectedPlay?.label ?? "Select Category"}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                        showDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[22px] border border-[#1d2e5c] bg-[#060f22] shadow-[0_28px_48px_rgba(0,0,0,0.45)]">
                      {PLAY_TYPES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedPlayType(item.value);
                            setShowDropdown(false);
                            resetRows();
                          }}
                          className={`block w-full border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 ${
                            selectedPlayType === item.value
                              ? "bg-blue-500/10 text-white"
                              : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <p className="text-sm font-bold">{item.label}</p>
                          <p className="mt-0.5 text-[11px] text-white/45">
                            {item.helper}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`grid gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 ${
                    isComboMode
                      ? "grid-cols-[1.2fr_1fr_1fr]"
                      : "grid-cols-[1.35fr_1.1fr]"
                  }`}
                >
                  <p className="text-center">Number</p>
                  <p className="text-center">
                    {isComboMode ? "Direct" : "Amount"}
                  </p>
                  {isComboMode ? <p className="text-center">Rumble</p> : null}
                </div>
              </div>
            </div>

            <div
              className="scroll-area flex-1 space-y-2 px-4 pb-3"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {betRows.map((row) => {
                const isFocused = focusedId === row.id;

                return (
                  <div
                    key={row.id}
                    className={`grid items-center gap-1 rounded-[16px] border px-0.5 py-0.5 transition-all ${
                      isComboMode
                        ? "grid-cols-[1.2fr_1fr_1fr]"
                        : "grid-cols-[1.35fr_1.1fr]"
                    } ${
                      isFocused
                        ? "border-blue-400/40 bg-blue-500/5 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]"
                        : "border-[#0f2244] bg-[#060f22]"
                    }`}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.betNumber}
                      onFocus={() => setFocusedId(row.id)}
                      onBlur={() => setFocusedId(null)}
                      onChange={(e) =>
                        updateRow(
                          row.id,
                          "betNumber",
                          e.target.value.replace(/\D/g, "").slice(0, maxLength),
                        )
                      }
                      placeholder="Number"
                      disabled={!selectedPlayType}
                      className="h-8 w-full rounded-[14px] border border-yellow-400/90 bg-transparent px-2 text-center text-sm font-black text-white outline-none transition-colors placeholder:text-white/80 focus:border-yellow-400"
                    />

                    {isComboMode ? (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.directAmountUsd}
                          onFocus={() => setFocusedId(row.id)}
                          onBlur={() => setFocusedId(null)}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "directAmountUsd",
                              amountInput(e.target.value),
                            )
                          }
                          placeholder="Direct"
                          disabled={!selectedPlayType}
                          className="h-8 w-full rounded-[14px] border border-yellow-400/90 bg-[#0d2545] px-1.5 text-center text-sm font-black text-white outline-none transition-colors placeholder:text-white/80 focus:border-yellow-400 focus:bg-[#112d52]"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.rumbleAmountUsd}
                          onFocus={() => setFocusedId(row.id)}
                          onBlur={() => setFocusedId(null)}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "rumbleAmountUsd",
                              amountInput(e.target.value),
                            )
                          }
                          placeholder="Rumble"
                          disabled={!selectedPlayType}
                          className="h-8 w-full rounded-[14px] border border-yellow-400/90 bg-[#0d2545] px-1.5 text-center text-sm font-black text-white outline-none transition-colors placeholder:text-white/80 focus:border-yellow-400 focus:bg-[#112d52]"
                        />
                      </>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.amountUsd}
                        onFocus={() => setFocusedId(row.id)}
                        onBlur={() => setFocusedId(null)}
                        onChange={(e) =>
                          updateRow(row.id, "amountUsd", amountInput(e.target.value))
                        }
                        placeholder="Amount"
                        disabled={!selectedPlayType}
                        className="h-8 w-full rounded-[14px] border border-yellow-400/90 bg-[#0d2545] px-1.5 text-center text-sm font-black text-white outline-none transition-colors placeholder:text-white/80 focus:border-yellow-400 focus:bg-[#112d52]"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={addRow}
                    className="accent-gradient flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-transform duration-200 active:scale-[0.99]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#0f2244] bg-[#060f22] px-4 pb-8 pt-4 sm:px-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Bet Total", value: totals.betTotal.toFixed(2) },
                  { label: "Discount", value: totals.discountAmount.toFixed(2) },
                  { label: "Payable", value: totals.afterAmount.toFixed(2) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[12px] border border-[#1d2e5c] bg-[#04091a] px-2 py-1.5 text-center"
                  >
                    <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-blue-300/70">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-black text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !hasOpenRound || !selectedPlayType}
                className="primary-gradient h-10 w-full rounded-[16px] border border-white/10 px-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-transform duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                {isPending ? "Placing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
