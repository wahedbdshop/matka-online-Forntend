/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  X,
  Ban,
  TimerOff,
  ArrowDownToLine,
  Plus,
} from "lucide-react";
import { WithdrawalService } from "@/services/withdrawal.service";
import { DepositService } from "@/services/deposit.service";
import { AdminService } from "@/services/admin.service";
import { UserService } from "@/services/user.service"; // profile fetch
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────
type Step = "method" | "amount" | "details";

interface WithdrawMethod {
  id: string;
  name: string;
  type: string;
  logo: string | null;
  minWithdraw: number;
  maxWithdraw: number;
  chargeType: string;
  chargeValue: number;
  instructions: string | null;
}

interface SavedAccount {
  id: string;
  userId: string;
  paymentMethod: string;
  accountNumber: string;
  nickname: string | null;
  createdAt: string;
  bankName?: string;
  branchName?: string;
  accountHolderName?: string;
  swiftCode?: string;
  addedByAdmin?: boolean;
}

// ─── Constants ────────────────────────────────────────────────
const METHOD_EMOJI: Record<string, string> = {
  bkash: "📱",
  nagad: "💳",
  rocket: "🚀",
  bank: "🏦",
};
const METHOD_COLOR: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  bkash: {
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/40",
  },
  nagad: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
  },
  rocket: {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/40",
  },
  bank: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
  },
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/10  text-green-400  border-green-500/30",
  REJECTED: "bg-red-500/10   text-red-400    border-red-500/30",
};
const STATUS_ICON: Record<string, any> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

const fmt = (n: number | string) => Number(n).toLocaleString("en-BD");

function getWithdrawalStatusLabel(status?: string) {
  switch (status) {
    case "REJECTED":
      return "Rejected";
    case "APPROVED":
      return "Approved";
    case "PENDING":
    default:
      return "Pending";
  }
}

function getWithdrawalStatusMessage(withdrawal: any) {
  if (withdrawal?.status === "REJECTED") {
    return "Rejected: amount credited back to your wallet.";
  }
  if (withdrawal?.status === "PENDING") {
    return "Pending review";
  }
  return null;
}

// ─── Smart Quick Amounts ──────────────────────────────────────
function generateQuickAmounts(min: number, max: number): number[] {
  // Use preset ladder, filter to range
  const PRESETS = [
    500, 1000, 2000, 5000, 10000, 20000, 25000, 30000, 50000, 75000, 100000,
    150000, 200000,
  ];
  const filtered = PRESETS.filter((a) => a >= min && a <= max);
  if (filtered.length >= 4) return filtered.slice(0, 6);

  // Fallback: generate 6 evenly spaced, rounded nicely
  const result: number[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const raw = min + ((max - min) / steps) * i;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const rounded = Math.round(raw / magnitude) * magnitude;
    const clamped = Math.min(Math.max(rounded, min), max);
    if (!result.includes(clamped)) result.push(clamped);
  }
  return result.slice(0, 6);
}

// ─── Charge Display ───────────────────────────────────────────
function calcCharge(amount: number, chargeType: string, chargeVal: number) {
  if (chargeType === "PERCENTAGE")
    return Number(((amount * chargeVal) / 100).toFixed(2));
  if (chargeType === "FIXED") return chargeVal;
  return 0;
}

// ─── Banners ──────────────────────────────────────────────────
function WithdrawOffBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-slate-900/60 p-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <Ban className="h-8 w-8 text-red-400" />
      </div>
      <div className="space-y-1">
        <p className="text-red-400 font-bold text-base">
          Withdrawal Unavailable
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <TimerOff className="h-3.5 w-3.5" /> Please check back later
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 rounded-2xl bg-slate-700/50" />
      <div className="h-48 rounded-2xl bg-slate-700/50" />
    </div>
  );
}

// ─── Saved Account Card ───────────────────────────────────────
function AccountCard({
  account,
  selected,
  methodEmoji,
  onSelect,
}: {
  account: { accountNumber: string; nickname?: string | null };
  selected: boolean;
  methodEmoji: string;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex-shrink-0 flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all min-w-[120px]",
        selected
          ? "border-rose-500/60 bg-rose-500/10 ring-1 ring-rose-500/30"
          : "border-slate-700 bg-slate-700/30 hover:border-slate-500",
      )}
    >
      <span className="text-xl text-center">{methodEmoji}</span>
      <p className="text-white text-xs font-mono text-center leading-tight truncate max-w-[110px]">
        {account.accountNumber}
      </p>
      {account.nickname && (
        <p className="text-slate-500 text-[10px] text-center truncate max-w-[110px]">
          {account.nickname}
        </p>
      )}
      {selected && (
        <span className="text-[9px] text-rose-400 font-bold text-center">
          ✓ Selected
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  // ── UI state ──────────────────────────────────────────────
  const [tab, setTab] = useState<"new" | "history">("new");
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  // Account state
  const [selectedAccountNumber, setSelectedAccountNumber] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountInput, setNewAccountInput] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [detailItem, setDetailItem] = useState<any>(null);

  // ── Queries ───────────────────────────────────────────────
  const { data: globalData, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });
  const globalSettings = globalData?.data ?? [];
  const isWithdrawOn = settingsLoading
    ? false
    : globalSettings.find((s: any) => s.key === "global_withdraw")?.value !==
      "false";
  const withdrawMessage =
    globalSettings.find((s: any) => s.key === "global_withdraw_message")
      ?.value || "Withdrawal is currently unavailable. Please try again later.";

  const { data: methodsData } = useQuery({
    queryKey: ["withdraw-methods"],
    queryFn: () => WithdrawalService.getMethods(),
    enabled: isWithdrawOn,
  });
  const methods: WithdrawMethod[] = (methodsData?.data ?? []).map((m: any) => ({
    ...m,
    minWithdraw: Number(m.minWithdraw),
    maxWithdraw: Number(m.maxWithdraw),
    chargeValue: Number(m.chargeValue ?? 0),
  }));

  // User profile — for registration phone as default
  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => UserService.getProfile(),
    enabled: isWithdrawOn,
  });
  const userPhone: string | null = profileData?.data?.phone ?? null;

  const { data: savedData, refetch: refetchSaved } = useQuery({
    queryKey: ["saved-accounts"],
    queryFn: () => WithdrawalService.getSavedAccounts(),
    enabled: isWithdrawOn,
  });
  const allSavedAccounts: SavedAccount[] = savedData?.data ?? [];

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: () => WithdrawalService.getMyWithdrawals(1, 20),
  });
  const withdrawals = historyData?.data?.withdrawals ?? [];

  // Pending deposit check
  const { data: depositData } = useQuery({
    queryKey: ["my-deposits-pending-check"],
    queryFn: () => DepositService.getMyDeposits(1, 5),
    enabled: isWithdrawOn,
  });
  const hasPendingDeposit = (depositData?.data?.deposits ?? []).some(
    (d: any) => d.status === "PENDING",
  );

  // ── Derived ───────────────────────────────────────────────
  const isBank = selectedMethod?.type === "BANK";
  const isMobile = selectedMethod?.type === "MOBILE";
  const numAmount = parseInt(amount) || 0;
  const minAmount = selectedMethod?.minWithdraw ?? 500;
  const maxAmount = selectedMethod?.maxWithdraw ?? 25000;
  const chargeType = selectedMethod?.chargeType ?? "NONE";
  const chargeVal = selectedMethod?.chargeValue ?? 0;
  const charge = calcCharge(numAmount, chargeType, chargeVal);
  const finalPayable = numAmount - charge;

  const quickAmounts = useMemo(
    () => generateQuickAmounts(minAmount, maxAmount),
    [minAmount, maxAmount],
  );

  // All active mobile method names (lowercase)
  const mobileMethodNames = useMemo(
    () =>
      new Set(
        methods
          .filter((m) => m.type === "MOBILE")
          .map((m) => m.name.toLowerCase()),
      ),
    [methods],
  );

  // Saved accounts for current method.
  // For MOBILE methods: show accounts saved under ANY mobile method, deduped by
  // accountNumber so a number saved via bkash also appears in nagad/rocket.
  const methodSavedAccounts = useMemo(() => {
    if (!selectedMethod) return [];
    if (isMobile) {
      const seen = new Set<string>();
      return allSavedAccounts.filter((a) => {
        if (!mobileMethodNames.has(a.paymentMethod.toLowerCase())) return false;
        if (seen.has(a.accountNumber)) return false;
        seen.add(a.accountNumber);
        return true;
      });
    }
    return allSavedAccounts.filter(
      (a) =>
        a.paymentMethod.toLowerCase() === selectedMethod.name.toLowerCase(),
    );
  }, [allSavedAccounts, selectedMethod, isMobile, mobileMethodNames]);

  // Phone as virtual "default" account for mobile (if not already saved)
  const phoneIsAlreadySaved = methodSavedAccounts.some(
    (a) => a.accountNumber === userPhone,
  );
  const showPhoneDefault = isMobile && userPhone && !phoneIsAlreadySaved;

  // All display accounts for mobile: phone first + saved
  const displayAccounts: {
    accountNumber: string;
    nickname: string | null;
    isDefault?: boolean;
  }[] = useMemo(() => {
    const list: {
      accountNumber: string;
      nickname: string | null;
      isDefault?: boolean;
    }[] = [];
    if (showPhoneDefault)
      list.push({
        accountNumber: userPhone!,
        nickname: "My Number",
        isDefault: true,
      });
    methodSavedAccounts.forEach((a) =>
      list.push({ accountNumber: a.accountNumber, nickname: a.nickname }),
    );
    return list;
  }, [showPhoneDefault, userPhone, methodSavedAccounts]);

  const currentMobileSavedCount =
    methodSavedAccounts.length + (showPhoneDefault ? 1 : 0);
  const currentBankSavedCount = methodSavedAccounts.length;

  // Limit is per-method (max 3 real saved entries, not counting the virtual phone default).
  // addedByAdmin is optional — if backend supports it, admin-added won't count against quota.
  const userSavedForMethod = methodSavedAccounts.filter(
    (a) => !a.addedByAdmin,
  ).length;
  const canAddMoreMobile = userSavedForMethod < 3;
  const canAddMoreBank = userSavedForMethod < 3;
  const finalAccountNumber = selectedAccountNumber || newAccountInput;
  const methodEmoji = selectedMethod
    ? (METHOD_EMOJI[selectedMethod.name.toLowerCase()] ?? "💳")
    : "💳";

  // ── Mutations ─────────────────────────────────────────────
  const { mutate: createWithdrawal, isPending } = useMutation({
    mutationFn: WithdrawalService.create,
    onSuccess: async (response, variables) => {
      const cachedProfile =
        queryClient.getQueryData<any>(["profile"]) ??
        queryClient.getQueryData<any>(["my-profile"]);
      const currentBalance = Number(cachedProfile?.data?.balance ?? 0);
      const responseBalanceCandidates = [
        response?.data?.balance,
        response?.data?.user?.balance,
        response?.data?.updatedBalance,
        response?.data?.walletBalance,
      ];
      const nextBalance = Number(
        responseBalanceCandidates.find((value) => value != null) ??
          Math.max(currentBalance - Number(variables.amount ?? 0), 0),
      );

      queryClient.setQueryData(["profile"], (old: any) =>
        old?.data
          ? {
              ...old,
              data: {
                ...old.data,
                balance: nextBalance,
              },
            }
          : old,
      );
      queryClient.setQueryData(["my-profile"], (old: any) =>
        old?.data
          ? {
              ...old,
              data: {
                ...old.data,
                balance: nextBalance,
              },
            }
          : old,
      );
      updateUser({ balance: nextBalance });

      toast.success(
        "Withdrawal request submitted! Your balance has been updated.",
      );

      // Save account number for ALL other active mobile methods (fire-and-forget)
      if (selectedMethod?.type === "MOBILE" && variables.accountNumber) {
        const otherMobileMethods = methods.filter(
          (m) =>
            m.type === "MOBILE" &&
            m.name.toLowerCase() !== selectedMethod.name.toLowerCase(),
        );
        const alreadySavedNumbers = new Set(
          allSavedAccounts.map((a) => a.accountNumber),
        );
        for (const m of otherMobileMethods) {
          if (!alreadySavedNumbers.has(variables.accountNumber)) {
            WithdrawalService.saveAccount({
              paymentMethod: m.name,
              accountNumber: variables.accountNumber,
            }).catch(() => {/* silent */});
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["saved-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await queryClient.refetchQueries({ queryKey: ["profile"], type: "active" });
      await queryClient.refetchQueries({
        queryKey: ["my-profile"],
        type: "active",
      });
      refetchSaved();
      resetFlow();
      setTab("history");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to submit"),
  });

  // ── Helpers ───────────────────────────────────────────────
  const resetFlow = () => {
    setStep("method");
    setSelectedMethod(null);
    setAmount("");
    setAmountError("");
    setSelectedAccountNumber("");
    setNewAccountInput("");
    setShowAddForm(false);
    setAccountHolder("");
    setBankName("");
    setBranchName("");
    setSwiftCode("");
    setFieldErrors({});
  };

  const goBack = () => {
    if (step === "amount") {
      setStep("method");
      return;
    }
    if (step === "details") {
      setStep("amount");
      return;
    }
  };

  const handleMethodSelect = (m: WithdrawMethod) => {
    setSelectedMethod(m);
    setAmount("");
    setAmountError("");
    setSelectedAccountNumber("");
    setNewAccountInput("");
    setShowAddForm(false);
    setAccountHolder("");
    setBankName("");
    setBranchName("");
    setSwiftCode("");
    setFieldErrors({});
    setStep("amount");
  };

  const handleAmountNext = () => {
    const num = parseInt(amount);
    if (!num || isNaN(num)) {
      setAmountError("Please enter an amount.");
      return;
    }
    if (num < minAmount) {
      setAmountError(`Minimum is ৳${fmt(minAmount)}.`);
      return;
    }
    if (num > maxAmount) {
      setAmountError(`Maximum is ৳${fmt(maxAmount)}.`);
      return;
    }
    setAmountError("");
    setStep("details");
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    const acct = finalAccountNumber.trim();

    if (!acct) errs.accountNumber = "Please select or enter an account number.";

    if (isBank) {
      if (!bankName.trim()) errs.bankName = "Bank name is required.";
      if (!accountHolder.trim())
        errs.accountHolder = "Account holder name is required.";
      if (!branchName.trim()) errs.branchName = "Branch name is required.";
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    createWithdrawal({
      paymentMethod: selectedMethod?.name ?? "",
      accountNumber: acct,
      accountHolderName: accountHolder.trim() || undefined,
      bankName: bankName.trim() || undefined,
      branchName: branchName.trim() || undefined,
      swiftCode: swiftCode.trim() || undefined,
      amount: numAmount,
    });
  };

  // ─── Render ───────────────────────────────────────────────
  const stepList: Step[] = ["method", "amount", "details"];
  const stepLabels: Record<Step, string> = {
    method: "Method",
    amount: "Amount",
    details: "Details",
  };
  const currentStepIdx = stepList.indexOf(step);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <ArrowDownToLine className="h-4 w-4 text-rose-400" />
        </div>
        <h1 className="text-white text-xl font-bold">Withdraw</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/80 border border-slate-700/50 rounded-xl">
        {(["new", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "new") resetFlow();
            }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
              tab === t
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t === "new" ? "New Withdrawal" : "History"}
          </button>
        ))}
      </div>

      {/* ══════════ NEW TAB ══════════ */}
      {tab === "new" && (
        <div className="space-y-4">
          {settingsLoading && <SettingsSkeleton />}

          {!settingsLoading && !isWithdrawOn && (
            <WithdrawOffBanner message={withdrawMessage} />
          )}

          {!settingsLoading && isWithdrawOn && (
            <>
              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {stepList.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all",
                        step === s
                          ? "bg-rose-600 border-rose-500 text-white"
                          : currentStepIdx > i
                            ? "bg-green-600/20 border-green-500/50 text-green-400"
                            : "bg-slate-700 border-slate-600 text-slate-500",
                      )}
                    >
                      {currentStepIdx > i ? "✓" : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-[10px]",
                        step === s ? "text-white" : "text-slate-500",
                      )}
                    >
                      {stepLabels[s]}
                    </span>
                    {i < stepList.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-px w-6",
                          currentStepIdx > i
                            ? "bg-green-500/40"
                            : "bg-slate-700",
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Back */}
              {step !== "method" && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}

              {/* ══ STEP 1: Method ══ */}
              {step === "method" && (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Select Method
                  </p>

                  {methods.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-6">
                      No methods available
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {methods.map((m) => {
                        const key = m.name?.toLowerCase();
                        const style = METHOD_COLOR[key] ?? {
                          color: "text-slate-300",
                          bg: "bg-slate-700/40",
                          border: "border-slate-600",
                        };
                        const hasCharge =
                          m.chargeType !== "NONE" && m.chargeValue > 0;
                        const chargeLabel =
                          m.chargeType === "PERCENTAGE"
                            ? `${m.chargeValue}% fee`
                            : m.chargeType === "FIXED"
                              ? `৳${fmt(m.chargeValue)} fee`
                              : null;

                        return (
                          <button
                            key={m.id}
                            onClick={() => handleMethodSelect(m)}
                            className={cn(
                              "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
                              style.bg,
                              style.border,
                            )}
                          >
                            {/* Charge badge */}
                            {hasCharge && (
                              <span className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 border border-amber-400 whitespace-nowrap leading-none shadow">
                                {chargeLabel}
                              </span>
                            )}

                            {m.logo ? (
                              <img
                                src={m.logo}
                                alt={m.name}
                                className="w-9 h-9 rounded-lg object-contain shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement | null
                                  )?.removeAttribute("style");
                                }}
                              />
                            ) : null}
                            <span
                              className="text-2xl shrink-0"
                              style={{ display: m.logo ? "none" : "block" }}
                            >
                              {METHOD_EMOJI[key] ?? "💳"}
                            </span>

                            <div className="text-left min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-bold capitalize truncate",
                                  style.color,
                                )}
                              >
                                {m.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {m.type === "BANK"
                                  ? "Bank Transfer"
                                  : "Mobile Banking"}
                              </p>
                              <p className="text-[10px] text-slate-600">
                                ৳{fmt(m.minWithdraw)} – ৳{fmt(m.maxWithdraw)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ STEP 2: Amount ══ */}
              {step === "amount" && selectedMethod && (
                <div className="space-y-3">
                {/* Pending deposit warning */}
                {hasPendingDeposit && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300">
                        Pending Deposit Found
                      </p>
                      <p className="text-[11px] text-amber-400/80 mt-0.5">
                        You have a deposit request under review. Please wait for it to be approved before submitting a withdrawal.
                      </p>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Enter Amount
                    </p>
                    <span className="flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-xs text-slate-300 capitalize">
                      {methodEmoji} {selectedMethod.name}
                    </span>
                  </div>

                  {/* Smart quick amounts */}
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setAmount(String(a));
                          setAmountError("");
                        }}
                        className={cn(
                          "py-2.5 rounded-xl border text-xs font-semibold transition-all duration-150",
                          amount === String(a)
                            ? "bg-rose-600 border-rose-500 text-white scale-105"
                            : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-400",
                        )}
                      >
                        ৳{fmt(a)}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 mb-1.5 block">
                      Custom Amount (৳) · Min ৳{fmt(minAmount)} · Max ৳
                      {fmt(maxAmount)}
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value.replace(/[^0-9]/g, ""));
                        setAmountError("");
                      }}
                      placeholder={`৳${fmt(minAmount)} – ৳${fmt(maxAmount)}`}
                      className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {amountError && (
                      <p className="text-red-400 text-[11px] mt-1">
                        {amountError}
                      </p>
                    )}
                  </div>

                  {/* Charge + final preview */}
                  {numAmount >= minAmount && numAmount <= maxAmount && (
                    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Amount</span>
                        <span className="text-white font-semibold">
                          ৳{fmt(numAmount)}
                        </span>
                      </div>
                      {charge > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Charge (
                            {chargeType === "PERCENTAGE"
                              ? `${chargeVal}%`
                              : "Fixed"}
                            )
                          </span>
                          <span className="text-amber-400">
                            −৳{fmt(charge)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs border-t border-slate-700 pt-1.5">
                        <span className="text-slate-300 font-medium">
                          You Receive
                        </span>
                        <span className="text-emerald-400 font-bold">
                          ৳{fmt(finalPayable)}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAmountNext}
                    disabled={!amount}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Continue →
                  </button>
                </div>
                </div>
              )}

              {/* ══ STEP 3: Details ══ */}
              {step === "details" && selectedMethod && (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-900/20 to-slate-800/60 p-4 space-y-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Summary
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: "Amount",
                          value: `৳${fmt(numAmount)}`,
                          color: "text-white",
                        },
                        {
                          label: "Charge",
                          value: `−৳${fmt(charge)}`,
                          color:
                            charge > 0 ? "text-amber-400" : "text-slate-500",
                        },
                        {
                          label: "You Receive",
                          value: `৳${fmt(finalPayable)}`,
                          color: "text-emerald-400 font-bold",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl bg-slate-800/60 border border-slate-700 p-2.5 text-center"
                        >
                          <p className="text-[10px] text-slate-500 mb-1">
                            {item.label}
                          </p>
                          <p
                            className={cn("text-xs font-semibold", item.color)}
                          >
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Account Details
                    </p>

                    {/* ── MOBILE: Horizontal scrollable saved accounts ── */}
                    {isMobile && (
                      <div className="space-y-3">
                        {displayAccounts.length > 0 && (
                          <>
                            <p className="text-[11px] text-slate-500">
                              Select account:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {displayAccounts.map((acc) => (
                                <AccountCard
                                  key={acc.accountNumber}
                                  account={acc}
                                  selected={
                                    selectedAccountNumber === acc.accountNumber
                                  }
                                  methodEmoji={methodEmoji}
                                  onSelect={() => {
                                    setSelectedAccountNumber(acc.accountNumber);
                                    setNewAccountInput("");
                                    setShowAddForm(false);
                                    setFieldErrors((p) => ({
                                      ...p,
                                      accountNumber: "",
                                    }));
                                  }}
                                />
                              ))}

                              {/* +Add button as a card */}
                              {canAddMoreMobile && (
                                <div
                                  onClick={() => {
                                    setShowAddForm(true);
                                    setSelectedAccountNumber("");
                                    setFieldErrors((p) => ({
                                      ...p,
                                      accountNumber: "",
                                    }));
                                  }}
                                  className={cn(
                                    "flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all min-w-[80px]",
                                    showAddForm
                                      ? "border-rose-500/50 bg-rose-500/10"
                                      : "border-dashed border-slate-600 bg-slate-800/40 hover:border-slate-400",
                                  )}
                                >
                                  <Plus className="h-5 w-5 text-slate-400" />
                                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                                    Add New
                                  </span>
                                </div>
                              )}

                              {!canAddMoreMobile && (
                                <p className="text-[11px] text-amber-400">
                                  ⚠️ Max 3 saved numbers reached for this method.
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* New number input — show if +Add clicked, or no real saved accounts yet */}
                        {(showAddForm || methodSavedAccounts.length === 0) &&
                          canAddMoreMobile && (
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                New {selectedMethod.name} number
                                <span className="ml-1 text-slate-600">
                                  (auto-saved)
                                </span>
                              </label>
                              <input
                                value={newAccountInput}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                                  setNewAccountInput(val);
                                  setSelectedAccountNumber("");
                                  setFieldErrors((p) => ({
                                    ...p,
                                    accountNumber: "",
                                  }));
                                }}
                                placeholder={`Enter ${selectedMethod.name} number`}
                                maxLength={11}
                                inputMode="numeric"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              <p className="text-[10px] text-slate-600 mt-1">
                                ℹ️ Saved automatically ({currentMobileSavedCount}
                                /3 slots used)
                              </p>
                            </div>
                          )}

                        {fieldErrors.accountNumber && (
                          <p className="text-red-400 text-[11px]">
                            {fieldErrors.accountNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── BANK: Saved bank accounts + add new ── */}
                    {isBank && (
                      <div className="space-y-3">
                        {/* Saved bank accounts */}
                        {methodSavedAccounts.length > 0 && (
                          <>
                            <p className="text-[11px] text-slate-500">
                              Saved bank accounts:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {methodSavedAccounts.map((acc) => (
                                <AccountCard
                                  key={acc.accountNumber}
                                  account={acc}
                                  selected={
                                    selectedAccountNumber ===
                                      acc.accountNumber && !showAddForm
                                  }
                                  methodEmoji="🏦"
                                  onSelect={() => {
                                    setSelectedAccountNumber(acc.accountNumber);
                                    setShowAddForm(false);
                                    setNewAccountInput("");
                                    setFieldErrors({});
                                    // saved account থেকে directly fill
                                    setBankName(
                                      acc.bankName ??
                                        acc.nickname?.split(" - ")[0] ??
                                        "",
                                    );
                                    setBranchName(
                                      acc.branchName ??
                                        acc.nickname?.split(" - ")[1] ??
                                        "",
                                    );
                                    setSwiftCode(acc.swiftCode ?? "");
                                    setAccountHolder(
                                      acc.accountHolderName ?? "",
                                    );
                                  }}
                                />
                              ))}

                              {canAddMoreBank && (
                                <div
                                  onClick={() => {
                                    setShowAddForm(true);
                                    setSelectedAccountNumber("");
                                    setNewAccountInput("");
                                    setFieldErrors({});
                                  }}
                                  className={cn(
                                    "flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all min-w-[80px]",
                                    showAddForm
                                      ? "border-rose-500/50 bg-rose-500/10"
                                      : "border-dashed border-slate-600 bg-slate-800/40 hover:border-slate-400",
                                  )}
                                >
                                  <Plus className="h-5 w-5 text-slate-400" />
                                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                                    Add New
                                  </span>
                                </div>
                              )}
                            </div>
                            {!canAddMoreBank && (
                              <p className="text-[11px] text-amber-400">
                                ⚠️ Max 3 saved bank accounts reached for this method.
                              </p>
                            )}
                          </>
                        )}

                        {/* Bank account form — shown if no saved yet OR +Add clicked */}
                        {(showAddForm || methodSavedAccounts.length === 0) && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                Account Number *
                              </label>
                              <input
                                value={newAccountInput}
                                onChange={(e) => {
                                  setNewAccountInput(e.target.value);
                                  setSelectedAccountNumber("");
                                  setFieldErrors((p) => ({
                                    ...p,
                                    accountNumber: "",
                                  }));
                                }}
                                placeholder="Bank account number"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              {fieldErrors.accountNumber && (
                                <p className="text-red-400 text-[11px] mt-1">
                                  {fieldErrors.accountNumber}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                Account Holder Name *
                              </label>
                              <input
                                value={accountHolder}
                                onChange={(e) => {
                                  setAccountHolder(e.target.value);
                                  setFieldErrors((p) => ({
                                    ...p,
                                    accountHolder: "",
                                  }));
                                }}
                                placeholder="Full name"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              {fieldErrors.accountHolder && (
                                <p className="text-red-400 text-[11px] mt-1">
                                  {fieldErrors.accountHolder}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                Bank Name *
                              </label>
                              <input
                                value={bankName}
                                onChange={(e) => {
                                  setBankName(e.target.value);
                                  setFieldErrors((p) => ({
                                    ...p,
                                    bankName: "",
                                  }));
                                }}
                                placeholder="e.g. Dutch Bangla Bank"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              {fieldErrors.bankName && (
                                <p className="text-red-400 text-[11px] mt-1">
                                  {fieldErrors.bankName}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                Branch Name *
                              </label>
                              <input
                                value={branchName}
                                onChange={(e) => {
                                  setBranchName(e.target.value);
                                  setFieldErrors((p) => ({
                                    ...p,
                                    branchName: "",
                                  }));
                                }}
                                placeholder="e.g. Dhanmondi Branch"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              {fieldErrors.branchName && (
                                <p className="text-red-400 text-[11px] mt-1">
                                  {fieldErrors.branchName}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1.5 block">
                                Swift Code (Optional)
                              </label>
                              <input
                                value={swiftCode}
                                onChange={(e) => {
                                  setSwiftCode(e.target.value.toUpperCase());
                                  setFieldErrors((p) => ({
                                    ...p,
                                    swiftCode: "",
                                  }));
                                }}
                                placeholder="e.g. DBBLBDDH"
                                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm uppercase outline-none focus:border-rose-500 placeholder:text-slate-500"
                              />
                              {fieldErrors.swiftCode && (
                                <p className="text-red-400 text-[11px] mt-1">
                                  {fieldErrors.swiftCode}
                                </p>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600">
                              Auto-saved bank accounts ({currentBankSavedCount}
                              /3 slots used)
                            </p>
                          </div>
                        )}

                        {/* If saved account selected, pre-fill bank details readonly */}
                        {!showAddForm &&
                          selectedAccountNumber &&
                          methodSavedAccounts.length > 0 && (
                            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                              <p className="text-[11px] text-slate-500">
                                Withdrawing to saved account:
                              </p>
                              <p className="text-white font-mono text-sm">
                                {selectedAccountNumber}
                              </p>
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[11px] text-slate-400 mb-1 block">
                                    Account Holder Name *
                                  </label>
                                  <input
                                    value={accountHolder}
                                    onChange={(e) => {
                                      setAccountHolder(e.target.value);
                                      setFieldErrors((p) => ({
                                        ...p,
                                        accountHolder: "",
                                      }));
                                    }}
                                    placeholder="Full name"
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                                  />
                                  {fieldErrors.accountHolder && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                      {fieldErrors.accountHolder}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-400 mb-1 block">
                                    Bank Name *
                                  </label>
                                  <input
                                    value={bankName}
                                    onChange={(e) => {
                                      setBankName(e.target.value);
                                      setFieldErrors((p) => ({
                                        ...p,
                                        bankName: "",
                                      }));
                                    }}
                                    placeholder="Bank name"
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                                  />
                                  {fieldErrors.bankName && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                      {fieldErrors.bankName}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-400 mb-1 block">
                                    Branch Name *
                                  </label>
                                  <input
                                    value={branchName}
                                    onChange={(e) => {
                                      setBranchName(e.target.value);
                                      setFieldErrors((p) => ({
                                        ...p,
                                        branchName: "",
                                      }));
                                    }}
                                    placeholder="Branch name"
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white text-sm outline-none focus:border-rose-500 placeholder:text-slate-500"
                                  />
                                  {fieldErrors.branchName && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                      {fieldErrors.branchName}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-400 mb-1 block">
                                Swift Code (Optional)
                                  </label>
                                  <input
                                    value={swiftCode}
                                    onChange={(e) => {
                                      setSwiftCode(e.target.value.toUpperCase());
                                      setFieldErrors((p) => ({
                                        ...p,
                                        swiftCode: "",
                                      }));
                                    }}
                                    placeholder="Swift code"
                                    className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white text-sm uppercase outline-none focus:border-rose-500 placeholder:text-slate-500"
                                  />
                                  {fieldErrors.swiftCode && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                      {fieldErrors.swiftCode}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Submitting...
                        </>
                      ) : (
                        "Submit Withdrawal ✓"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ HISTORY TAB ══════════ */}
      {tab === "history" && (
        <div className="space-y-2">
          {histLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-slate-700/40 animate-pulse"
              />
            ))
          ) : withdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/50 border border-slate-700 flex items-center justify-center text-2xl">
                📭
              </div>
              <p className="text-slate-500 text-sm">No withdrawals yet</p>
            </div>
          ) : (
            withdrawals.map((w: any) => {
              const Icon = STATUS_ICON[w.status] ?? Clock;
              const key = w.paymentMethod?.toLowerCase();
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-700 flex items-center justify-center text-lg">
                      {METHOD_EMOJI[key] ?? "💳"}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm capitalize">
                        {w.paymentMethod}
                      </p>
                      <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                        {w.accountNumber}
                      </p>
                      <p className="text-slate-600 text-[10px]">
                        {new Date(w.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        ৳{fmt(w.amount)}
                      </p>
                      {Number(w.charge ?? 0) > 0 && (
                        <p className="text-amber-400 text-[10px]">
                          −৳{fmt(w.charge)} fee
                        </p>
                      )}
                      {Number(w.finalPayableAmount ?? 0) > 0 &&
                        Number(w.charge ?? 0) > 0 && (
                          <p className="text-emerald-400 text-[10px]">
                            = ৳{fmt(w.finalPayableAmount)}
                          </p>
                        )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium mt-0.5",
                          STATUS_STYLE[w.status] ?? "",
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />{" "}
                        {getWithdrawalStatusLabel(w.status)}
                      </span>
                      {getWithdrawalStatusMessage(w) && (
                        <p
                          className={cn(
                            "mt-1 max-w-[170px] text-[10px]",
                            w.status === "REJECTED"
                              ? "text-emerald-400"
                              : "text-slate-400",
                          )}
                        >
                          {getWithdrawalStatusMessage(w)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDetailItem(w)}
                      className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailItem(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[24px] border border-slate-700 bg-slate-900 p-5 space-y-3 my-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Withdrawal Detail
              </h2>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs divide-y divide-slate-800">
              {[
                ["Method", detailItem.paymentMethod],
                ["Account Number", detailItem.accountNumber],
                ["Transaction ID", detailItem.transactionId],
                ["Account Holder", detailItem.accountHolderName],
                ["Bank Name", detailItem.bankName],
                ["Branch", detailItem.branchName],
                ["Swift Code", detailItem.swiftCode],
                ["Amount", `৳${fmt(detailItem.amount)}`],
                [
                  "Charge",
                  Number(detailItem.charge ?? 0) > 0
                    ? `৳${fmt(detailItem.charge)}`
                    : null,
                ],
                [
                  "You Receive",
                  `৳${fmt(detailItem.finalPayableAmount ?? detailItem.amount)}`,
                ],
                ["Status", getWithdrawalStatusLabel(detailItem.status)],
                ["Wallet Update", getWithdrawalStatusMessage(detailItem)],
                ["Note", detailItem.reviewNote],
                [
                  "Submitted At",
                  new Date(detailItem.createdAt).toLocaleString(),
                ],
              ].map(([label, value]) =>
                value ? (
                  <div
                    key={label as string}
                    className="flex justify-between gap-4 pt-2 first:pt-0"
                  >
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span
                      className={cn(
                        "text-right font-medium",
                        label === "You Receive"
                          ? "text-emerald-400"
                          : label === "Charge"
                            ? "text-amber-400"
                            : "text-white",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
            <button
              onClick={() => setDetailItem(null)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
