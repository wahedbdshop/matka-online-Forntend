/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet,
  ChevronLeft,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  X,
  Ban,
  TimerOff,
  ExternalLink,
} from "lucide-react";
import { DepositService } from "@/services/deposit.service";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "method" | "amount" | "instruction";

interface DepositMethod {
  name: string;
  logo: string | null;
  agentNumber: string | null;
  minDeposit: number;
  maxDeposit: number;
  isGlobal: boolean;
}

interface GlobalAgent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  whatsappNumber: string | null;
  whatsappIcon: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMER_SECONDS = 600;
const ALL_QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 30000];
const METHOD_ROTATION_STORAGE_KEY = "deposit-method-rotation-v1";

const METHOD_STYLE: Record<
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
  whatsapp: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
  },
  global_agent: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
  },
};

const METHOD_EMOJI: Record<string, string> = {
  bkash: "📱",
  nagad: "💳",
  rocket: "🚀",
  whatsapp: "💬",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/10  text-green-400  border-green-500/30",
  SUCCESS: "bg-green-500/10  text-green-400  border-green-500/30",
  REJECTED: "bg-red-500/10   text-red-400    border-red-500/30",
};

const STATUS_ICON: Record<string, any> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  SUCCESS: CheckCircle,
  REJECTED: XCircle,
};

const fmt = (n: number | string) => Number(n).toLocaleString("en-BD");
const formatTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function maskAgentNumber(value?: string | null) {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) return "";
  if (rawValue.length <= 6) return rawValue;

  const start = rawValue.slice(0, 3);
  const end = rawValue.slice(-3);
  const hidden = "*".repeat(Math.max(rawValue.length - 6, 3));

  return `${start}${hidden}${end}`;
}

function getDepositMethodLabel(name?: string | null) {
  const methodKey = name?.trim().toLowerCase();

  if (methodKey === "bkash") {
    return "bKash Agent";
  }

  if (methodKey === "nagad") {
    return "Nagad Agent";
  }

  if (methodKey === "rocket") {
    return "Rocket Agent";
  }

  if (methodKey === "upay") {
    return "Upay Agent";
  }

  return name ? `${name} Agent` : "Agent";
}

function getMethodRotationKey(name?: string | null) {
  return name?.trim().toLowerCase() || "unknown";
}

function groupMethodsForDisplay(methods: DepositMethod[]) {
  const groupedMethods = new Map<string, DepositMethod[]>();

  methods.forEach((method) => {
    const key = getMethodRotationKey(method.name);
    const group = groupedMethods.get(key) ?? [];
    group.push(method);
    groupedMethods.set(key, group);
  });

  const groupedDisplayMethods = Array.from(groupedMethods.values()).map(
    (group) => group[0],
  );

  const regularMethods = groupedDisplayMethods.filter(
    (method) =>
      !method.isGlobal &&
      getMethodRotationKey(method.name) !== "global agent",
  );
  const globalAgentMethods = groupedDisplayMethods.filter(
    (method) =>
      method.isGlobal || getMethodRotationKey(method.name) === "global agent",
  );

  return [...regularMethods, ...globalAgentMethods];
}

function getNextMethodVariant(
  methods: DepositMethod[] | null | undefined,
  methodName?: string | null,
  fallbackMethod?: DepositMethod | null,
) {
  const nextMethods = methods ?? [];
  const rotationKey = getMethodRotationKey(methodName);
  const matchingMethods = nextMethods.filter(
    (method) => getMethodRotationKey(method.name) === rotationKey,
  );

  if (matchingMethods.length === 0) {
    return fallbackMethod ?? null;
  }

  if (typeof window === "undefined") {
    return matchingMethods[0];
  }

  let rotationState: Record<string, number> = {};
  const storedRotationState = window.localStorage.getItem(
    METHOD_ROTATION_STORAGE_KEY,
  );

  if (storedRotationState) {
    try {
      rotationState = JSON.parse(storedRotationState) as Record<string, number>;
    } catch {
      rotationState = {};
    }
  }

  const currentIndex = rotationState[rotationKey] ?? 0;
  const nextMethod = matchingMethods[currentIndex % matchingMethods.length];
  rotationState[rotationKey] = (currentIndex + 1) % matchingMethods.length;

  window.localStorage.setItem(
    METHOD_ROTATION_STORAGE_KEY,
    JSON.stringify(rotationState),
  );

  return nextMethod;
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(targetIso: string) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();
    const calc = () =>
      setTimeLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  return {
    timeLeft,
    formatted: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    isExpired: timeLeft === 0,
  };
}

// ─── Deposit Off Banner ───────────────────────────────────────────────────────
function DepositOffBanner({
  message,
  openTimeIso,
}: {
  message: string;
  openTimeIso: string;
}) {
  const { formatted, isExpired } = useCountdown(openTimeIso);
  const hasTimer = !!openTimeIso && !isExpired;

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-slate-900/60 p-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <Ban className="h-8 w-8 text-red-400" />
      </div>

      <div className="space-y-1">
        <p className="text-red-400 font-bold text-base">Deposit Unavailable</p>
        <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
      </div>

      {hasTimer && (
        <div className="w-full rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-2">
          <p className="text-slate-500 text-xs uppercase tracking-wider">
            Deposit opens in
          </p>
          <div className="flex items-center justify-center gap-2">
            {formatted.split(":").map((unit, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 min-w-[56px] text-center">
                  <p className="text-white font-mono font-bold text-2xl tabular-nums">
                    {unit}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    {i === 0 ? "HRS" : i === 1 ? "MIN" : "SEC"}
                  </p>
                </div>
                {i < 2 && (
                  <span className="text-slate-500 font-bold text-xl">:</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-[11px]">
            Opens at:{" "}
            {new Date(openTimeIso).toLocaleString("en-BD", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      )}

      {!hasTimer && (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <TimerOff className="h-3.5 w-3.5" /> Please check back later
        </div>
      )}
    </div>
  );
}

// ─── Global Agents Modal ──────────────────────────────────────────────────────
function GlobalAgentsModal({
  agents,
  onClose,
}: {
  agents: GlobalAgent[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[20px] border border-green-500/20 bg-slate-900 p-4 space-y-3 max-h-[80vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-xl">
              🌍
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Global Agents</h2>
              <p className="text-[10px] text-slate-500">
                {agents.length} agent{agents.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 bg-green-500/5 border border-green-500/10 rounded-xl px-3 py-2 flex-shrink-0">
          Click the WhatsApp button to contact an agent and send your payment
          directly.
        </p>

        {/* Table */}
        <div className="overflow-auto rounded-xl border border-slate-700 flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-700 bg-slate-800">
                {["#", "Name", "Country", "WhatsApp"].map((h) => (
                  <th
                    key={h}
                    className="px-2 py-2 text-slate-400 font-medium text-left whitespace-nowrap text-[11px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No agents available right now
                  </td>
                </tr>
              ) : (
                agents.map((agent, i) => {
                  const waNumber =
                    agent.whatsappNumber?.replace(/[^0-9]/g, "") ?? "";
                  return (
                    <tr
                      key={agent.id}
                      className="border-b border-slate-700/50 hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-2 py-2 text-slate-500 font-bold text-[11px]">
                        {" "}
                        {i + 1}
                      </td>

                      <td className="px-2 py-2 text-white font-semibold whitespace-nowrap text-[11px]">
                        {" "}
                        {agent.name}
                      </td>

                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                        {agent.country ?? "—"}
                      </td>

                      <td className="px-2 py-2">
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2 text-green-400 hover:bg-green-500/20 active:scale-95 transition-all group"
                        >
                          {agent.whatsappIcon ? (
                            <img
                              src={agent.whatsappIcon}
                              alt="WhatsApp"
                              className="w-5 h-5 object-contain rounded"
                            />
                          ) : (
                            <span className="text-lg leading-none">💬</span>
                          )}
                          <span className="text-[10px] font-semibold hidden sm:block">
                            Chat
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 w-full py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Bonus Badge ──────────────────────────────────────────────────────────────
function BonusBadge({ commission }: { commission: any }) {
  if (!commission?.isActive) return null;
  const label =
    commission.type === "PERCENTAGE"
      ? `+${Number(commission.value)}%`
      : `+৳${Number(commission.value)}`;
  return (
    <span className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 shadow-lg shadow-green-500/30 border border-green-400 whitespace-nowrap leading-none">
      {label}
    </span>
  );
}

// ─── Settings Skeleton ────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 rounded-2xl bg-slate-700/50" />
      <div className="h-48 rounded-2xl bg-slate-700/50" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DepositPage() {
  const queryClient = useQueryClient();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"new" | "history">("new");
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(
    null,
  );
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [amountError, setAmountError] = useState("");
  const [bonus, setBonus] = useState<number>(0);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [txnError, setTxnError] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [displayMethods, setDisplayMethods] = useState<DepositMethod[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bonusTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const minAmount = selectedMethod?.minDeposit ?? 500;
  const maxAmount = selectedMethod?.maxDeposit ?? 30000;
  const numAmount = parseInt(amount) || 0;
  const totalCredit = numAmount + bonus;
  const quickAmounts = ALL_QUICK_AMOUNTS.filter(
    (a) => a >= minAmount && a <= maxAmount,
  );

  const stepList: Step[] = ["method", "amount", "instruction"];
  const stepLabels: Record<Step, string> = {
    method: "Method",
    amount: "Amount",
    instruction: "Payment",
  };
  const currentStepIdx = stepList.indexOf(step);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: globalData, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });

  const globalSettings = globalData?.data ?? [];
  const isDepositOn = settingsLoading
    ? false
    : globalSettings.find((s: any) => s.key === "global_deposit")?.value !==
      "false";
  const depositMessage =
    globalSettings.find((s: any) => s.key === "global_deposit_message")
      ?.value || "Deposit is currently unavailable. Please try again later.";
  const depositOpenTime =
    globalSettings.find((s: any) => s.key === "global_deposit_open_time")
      ?.value || "";

  const { data: methodsData } = useQuery({
    queryKey: ["deposit-methods"],
    queryFn: DepositService.getAvailableMethods,
    enabled: isDepositOn,
  });
  const methodsDataList = methodsData?.data;

  const { data: globalAgentsData } = useQuery({
    queryKey: ["global-agents"],
    queryFn: DepositService.getGlobalAgents,
    enabled: isDepositOn,
  });
  const globalAgents: GlobalAgent[] = globalAgentsData?.data ?? [];

  const { data: commissionData } = useQuery({
    queryKey: ["deposit-commission-public"],
    queryFn: DepositService.getPublicCommission,
    enabled: isDepositOn,
  });
  const commission = commissionData?.data ?? null;

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ["my-deposits"],
    queryFn: () => DepositService.getMyDeposits(1, 20),
  });
  const deposits = historyData?.data?.deposits ?? [];
  const hasPendingDeposit = deposits.some(
    (d: any) => d.status === "PENDING",
  );

  // ── Bonus preview (debounced) ─────────────────────────────────────────────
  useEffect(() => {
    const num = parseInt(amount);
    if (!num || num < minAmount || num > maxAmount) {
      setBonus(0);
      return;
    }
    if (bonusTimer.current) clearTimeout(bonusTimer.current);
    setBonusLoading(true);
    bonusTimer.current = setTimeout(async () => {
      try {
        const res = await DepositService.previewBonus(num);
        setBonus(res?.data?.bonus ?? 0);
      } catch {
        setBonus(0);
      } finally {
        setBonusLoading(false);
      }
    }, 500);
  }, [amount, minAmount, maxAmount]);

  useEffect(() => {
    setDisplayMethods(groupMethodsForDisplay(methodsDataList ?? []));
  }, [methodsDataList]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast.error("Time expired. Please start again.");
          resetFlow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => stopTimer(), []);

  const timerStage =
    timeLeft > 300 ? "safe" : timeLeft > 120 ? "warn" : "danger";
  const timerStyle = {
    safe: {
      text: "text-green-400",
      ring: "border-green-500/40",
      bg: "bg-green-500/10",
      dot: "bg-green-400",
    },
    warn: {
      text: "text-yellow-400",
      ring: "border-yellow-500/40",
      bg: "bg-yellow-500/10",
      dot: "bg-yellow-400",
    },
    danger: {
      text: "text-red-400",
      ring: "border-red-500/40",
      bg: "bg-red-500/10",
      dot: "bg-red-400",
    },
  }[timerStage];

  // ── Flow helpers ──────────────────────────────────────────────────────────
  const resetFlow = () => {
    stopTimer();
    setStep("method");
    setSelectedMethod(null);
    setAmount("");
    setAmountError("");
    setBonus(0);
    setTxnId("");
    setSenderNumber("");
    setTxnError("");
    setTimeLeft(TIMER_SECONDS);
  };

  useLayoutEffect(() => {
    return () => {
      stopTimer();
      setStep("method");
      setSelectedMethod(null);
      setAmount("");
      setAmountError("");
      setBonus(0);
      setTxnId("");
      setSenderNumber("");
      setTxnError("");
      setTimeLeft(TIMER_SECONDS);
    };
  }, []);

  const goBack = () => {
    if (step === "amount") {
      setStep("method");
    } else if (step === "instruction") {
      stopTimer();
      setStep("amount");
    }
  };

  // ── Step handlers ─────────────────────────────────────────────────────────
  // Step 1: Method
  const handleMethodSelect = (method: DepositMethod) => {
    if (method.isGlobal) {
      // Global agent → show info modal only, no deposit flow
      setShowGlobalModal(true);
    } else {
      setSelectedMethod(method);
      setAmount("");
      setAmountError("");
      setStep("amount");
    }
  };

  // Step 2: Amount → Step 3
  const handleAmountNext = () => {
    const num = parseInt(amount);
    if (!num || isNaN(num)) {
      setAmountError("Please enter an amount.");
      return;
    }
    if (num < minAmount) {
      setAmountError(`Minimum deposit is ৳${fmt(minAmount)}.`);
      return;
    }
    if (num > maxAmount) {
      setAmountError(`Maximum deposit is ৳${fmt(maxAmount)}.`);
      return;
    }

    const nextMethod = getNextMethodVariant(
      methodsDataList,
      selectedMethod?.name,
      selectedMethod,
    );

    if (!nextMethod?.agentNumber) {
      toast.error("No agent number available for this method right now.");
      return;
    }

    setAmountError("");
    setSelectedMethod(nextMethod);
    startTimer();
    setStep("instruction");
  };

  // Step 3: Submit
  const { mutate: createDeposit, isPending } = useMutation({
    mutationFn: DepositService.create,
    onSuccess: () => {
      const bonusMsg = bonus > 0 ? ` Bonus: +৳${fmt(bonus)}.` : "";
      toast.success(
        `Deposit submitted!${bonusMsg} You'll receive ৳${fmt(totalCredit)} upon approval.`,
      );
      queryClient.invalidateQueries({ queryKey: ["my-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      resetFlow();
      setTab("history");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to submit"),
  });

  const handleSubmit = () => {
    const trimmed = txnId.trim();
    const trimmedSenderNumber = senderNumber.trim();
    if (!trimmed) {
      setTxnError("Transaction ID is required.");
      return;
    }
    if (trimmed.length < 4) {
      setTxnError("Transaction ID seems too short.");
      return;
    }
    if (!trimmedSenderNumber) {
      setTxnError("Sender mobile wallet number is required.");
      return;
    }
    setTxnError("");
    createDeposit({
      paymentMethod: selectedMethod?.name ?? "",
      amount: numAmount,
      transactionId: trimmed,
      senderNumber: trimmedSenderNumber,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-purple-400" />
        </div>
        <h1 className="text-white text-xl font-bold">Deposit</h1>
      </div>

      {/* ── Tabs ── */}
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
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t === "new" ? "New Deposit" : "History"}
          </button>
        ))}
      </div>

      {/* ══════════════ NEW DEPOSIT TAB ══════════════ */}
      {tab === "new" && (
        <div className="space-y-4">
          {/* Loading skeleton */}
          {settingsLoading && <SettingsSkeleton />}

          {/* Deposit OFF */}
          {!settingsLoading && !isDepositOn && (
            <DepositOffBanner
              message={depositMessage}
              openTimeIso={depositOpenTime}
            />
          )}

          {/* Normal flow */}
          {!settingsLoading && isDepositOn && (
            <>
              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {stepList.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all",
                        step === s
                          ? "bg-purple-600 border-purple-500 text-white"
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

              {/* Back button */}
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
                    Choose Payment Method
                  </p>

                  {displayMethods.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-8">
                      No payment methods available
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {displayMethods.map((m, i) => {
                        const key = m.name?.toLowerCase();
                        const style = METHOD_STYLE[key] ?? {
                          color: "text-slate-300",
                          bg: "bg-slate-700/40",
                          border: "border-slate-600",
                        };

                        return (
                          <button
                            key={m.name ?? i}
                            onClick={() => handleMethodSelect(m)}
                            className={cn(
                              "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                              style.bg,
                              style.border,
                            )}
                          >
                            {/* Bonus badge — not shown on global agent */}
                            {!m.isGlobal && (
                              <BonusBadge commission={commission} />
                            )}

                            {/* Icon/Logo */}
                            {m.isGlobal ? (
                              <span className="text-2xl flex-shrink-0">🌍</span>
                            ) : m.logo ? (
                              <img
                                src={m.logo}
                                alt={m.name}
                                className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement | null
                                  )?.removeAttribute("style");
                                }}
                              />
                            ) : null}

                            {/* Emoji fallback for non-global */}
                            {!m.isGlobal && (
                              <span
                                className="text-2xl flex-shrink-0"
                                style={{ display: m.logo ? "none" : "block" }}
                              >
                                {METHOD_EMOJI[key] ?? "💳"}
                              </span>
                            )}

                            <div className="text-left min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-bold capitalize truncate",
                                  style.color,
                                )}
                              >
                                {m.isGlobal ? "Global Agent" : m.name}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                ৳{fmt(m.minDeposit)} – ৳{fmt(m.maxDeposit)}
                              </p>
                              {m.isGlobal && (
                                <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] text-green-400 bg-green-500/10 rounded px-1.5 py-0.5 border border-green-500/20">
                                  <ExternalLink className="h-2 w-2" /> View
                                  Agents
                                </span>
                              )}
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
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-4">
                  {/* Selected method badge */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Enter Amount
                    </p>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-700/60 border border-slate-600 px-2.5 py-1">
                      {selectedMethod.logo ? (
                        <img
                          src={selectedMethod.logo}
                          alt={selectedMethod.name}
                          className="w-4 h-4 rounded object-contain"
                        />
                      ) : (
                        <span className="text-sm">
                          {METHOD_EMOJI[selectedMethod.name.toLowerCase()] ??
                            "💳"}
                        </span>
                      )}
                      <span className="text-xs text-white font-semibold capitalize">
                        {selectedMethod.name}
                      </span>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setAmount(String(a));
                          setAmountError("");
                        }}
                        className={cn(
                          "py-2 rounded-xl border text-xs font-semibold transition-all duration-150",
                          amount === String(a)
                            ? "bg-purple-600 border-purple-500 text-white scale-105"
                            : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-400",
                        )}
                      >
                        ৳{fmt(a)}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1.5 block">
                      Custom Amount (৳)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value.replace(/[^0-9]/g, ""));
                        setAmountError("");
                      }}
                      placeholder={`Min ৳${fmt(minAmount)} – Max ৳${fmt(maxAmount)}`}
                      className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-purple-500 placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {amountError && (
                      <p className="text-red-400 text-[11px] mt-1">
                        {amountError}
                      </p>
                    )}
                  </div>

                  {/* Bonus preview */}
                  {numAmount >= minAmount && numAmount <= maxAmount && (
                    <div className="rounded-xl bg-green-500/5 border border-green-500/20 px-4 py-3 space-y-1.5">
                      {bonusLoading ? (
                        <p className="text-xs text-slate-400 animate-pulse">
                          Calculating bonus...
                        </p>
                      ) : (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">
                              Deposit Amount
                            </span>
                            <span className="text-white font-semibold">
                              ৳{fmt(numAmount)}
                            </span>
                          </div>
                          {bonus > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">🎁 Bonus</span>
                              <span className="text-green-400 font-semibold">
                                +৳{fmt(bonus)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs border-t border-slate-700 pt-1.5">
                            <span className="text-slate-300 font-medium">
                              Total Credit
                            </span>
                            <span className="text-white font-bold">
                              ৳{fmt(totalCredit)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleAmountNext}
                    disabled={!amount}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* ══ STEP 3: Instruction ══ */}
              {step === "instruction" && selectedMethod && (
                <div className="space-y-3">
                  {/* Payment summary card */}
                  <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-slate-800/60 p-4 space-y-3">
                    {/* Header row: label + timer */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Payment Summary
                      </p>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-1.5",
                          timerStyle.ring,
                          timerStyle.bg,
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full animate-ping",
                            timerStyle.dot,
                          )}
                        />
                        <span
                          className={cn(
                            "font-mono font-bold text-sm tabular-nums",
                            timerStyle.text,
                            timerStage === "danger" && "animate-pulse",
                          )}
                        >
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    </div>

                    {/* Amount / Bonus / Total */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: "Amount",
                          value: `৳${fmt(numAmount)}`,
                          color: "text-white",
                        },
                        {
                          label: "Bonus",
                          value: `+৳${fmt(bonus)}`,
                          color: "text-green-400",
                        },
                        {
                          label: "Total Credit",
                          value: `৳${fmt(totalCredit)}`,
                          color: "text-purple-400 font-bold",
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

                    {/* Agent number */}
                    <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
                      <p className="mb-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        Cashout
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedMethod.logo ? (
                            <img
                              src={selectedMethod.logo}
                              alt={selectedMethod.name}
                              className="w-9 h-9 rounded-lg object-contain"
                            />
                          ) : (
                            <span className="text-2xl">
                              {METHOD_EMOJI[
                                selectedMethod.name?.toLowerCase()
                              ] ?? "💳"}
                            </span>
                          )}
                          <div>
                            <p className="text-white font-bold text-lg tracking-wide">
                              {maskAgentNumber(selectedMethod.agentNumber)}
                            </p>
                            <p className="text-xs text-slate-400 capitalize">
                              {getDepositMethodLabel(selectedMethod.name)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedMethod.agentNumber ?? "",
                            );
                            toast.success("Copied!");
                          }}
                          className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Complete payment within 10
                      minutes to avoid expiry.
                    </p>
                  </div>

                  {/* TXN submit card */}
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Submit Transaction
                    </p>
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1.5 block">
                        Transaction ID *
                      </label>
                      <input
                        value={txnId}
                        onChange={(e) => {
                          setTxnId(e.target.value);
                          setTxnError("");
                        }}
                        placeholder="e.g. 8N7A3X2K"
                        className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-purple-500 placeholder:text-slate-500"
                      />
                      {txnError && (
                        <p className="text-red-400 text-[11px] mt-1">
                          {txnError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1.5 block">
                        Your Mobile Wallet Number *
                      </label>
                      <input
                        value={senderNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                          setSenderNumber(val);
                          setTxnError("");
                        }}
                        placeholder="e.g. 017XXXXXXXX"
                        maxLength={11}
                        inputMode="numeric"
                        className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-purple-500 placeholder:text-slate-500"
                      />
                    </div>
                    {hasPendingDeposit && (
                      <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
                        <Clock className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                        <p className="text-yellow-400 text-xs font-medium">
                          আপনার একটি ডিপোজিট রিকোয়েস্ট ইতিমধ্যে পেন্ডিং আছে। অনুমোদনের পর নতুন ডিপোজিট করুন।
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={isPending || hasPendingDeposit}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Submitting...
                        </>
                      ) : (
                        "Submit Deposit ✓"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {tab === "history" && (
        <div className="space-y-2">
          {histLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-slate-700/40 animate-pulse"
              />
            ))
          ) : deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/50 border border-slate-700 flex items-center justify-center text-2xl">
                📭
              </div>
              <p className="text-slate-500 text-sm">No deposits yet</p>
            </div>
          ) : (
            deposits.map((d: any) => {
              const Icon = STATUS_ICON[d.status] ?? Clock;
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-700 flex items-center justify-center text-lg">
                      {METHOD_EMOJI[d.paymentMethod?.toLowerCase()] ?? "💳"}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm capitalize">
                        {d.paymentMethod}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        ৳{fmt(d.amount)}
                      </p>
                      {Number(d.bonus) > 0 && (
                        <p className="text-green-400 text-[10px]">
                          +৳{fmt(d.bonus)} bonus
                        </p>
                      )}
                      <p className="text-purple-400 text-[10px] font-semibold">
                        = ৳{fmt(d.totalCredit)}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium mt-0.5",
                          STATUS_STYLE[d.status] ?? "",
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" /> {d.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setDetailItem(d)}
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

      {/* ── Global Agents Modal ── */}
      {showGlobalModal && (
        <GlobalAgentsModal
          agents={globalAgents}
          onClose={() => setShowGlobalModal(false)}
        />
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
              <h2 className="text-sm font-bold text-white">Deposit Detail</h2>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["Payment Method", detailItem.paymentMethod],
                ["Agent Number", detailItem.agentNumber],
                ["Amount", `৳${fmt(detailItem.amount)}`],
                ["Bonus", `+৳${fmt(detailItem.bonus ?? 0)}`],
                ["Total Credit", `৳${fmt(detailItem.totalCredit ?? 0)}`],
                ["Transaction ID", detailItem.transactionId],
                ["Sender Number", detailItem.senderNumber],
                ["Status", detailItem.status],
                [
                  "Submitted At",
                  new Date(detailItem.createdAt).toLocaleString(),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span
                    className={cn(
                      "text-right font-medium",
                      label === "Bonus"
                        ? "text-green-400"
                        : label === "Total Credit"
                          ? "text-purple-400"
                          : "text-white",
                    )}
                  >
                    {value ?? "-"}
                  </span>
                </div>
              ))}
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
