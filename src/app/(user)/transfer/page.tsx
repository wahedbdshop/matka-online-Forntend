/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  ChevronLeft,
  Loader2,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Send,
  Users,
  Ban,
  TimerOff,
} from "lucide-react";
import { TransferService } from "@/services/transfer.service";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";

type Step = "recipient" | "amount" | "confirm";

const fmt = (n: number | string) => Number(n).toLocaleString("en-BD");
const QUICK = [100, 500, 1000, 2000, 5000, 10000];

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "bg-green-500/10 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/10  text-red-400   border-red-500/30",
};
const STATUS_ICON: Record<string, any> = {
  SUCCESS: CheckCircle,
  FAILED: XCircle,
};

// ─── Countdown Hook ───────────────────────────────────────────
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

// ─── Transfer Off Banner ──────────────────────────────────────
function TransferOffBanner({
  message,
  openTimeIso,
}: {
  message: string;
  openTimeIso: string;
}) {
  const { formatted, isExpired } = useCountdown(openTimeIso);
  const hasTimer = !!openTimeIso && !isExpired;

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900/60 p-6 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <Ban className="h-8 w-8 text-blue-400" />
      </div>
      <div className="space-y-1">
        <p className="text-blue-400 font-bold text-base">
          Transfer Unavailable
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
      </div>
      {hasTimer && (
        <div className="w-full rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-2">
          <p className="text-slate-500 text-xs uppercase tracking-wider">
            Transfer opens in
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

// ─── Skeleton Row ─────────────────────────────────────────────
function SkeletonRow() {
  return <div className="h-14 rounded-2xl bg-slate-700/40 animate-pulse" />;
}

function RecipientCard({
  user,
  selected,
  onClick,
  compact = false,
}: {
  user: any;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200",
        compact ? "p-3" : "p-4",
        selected
          ? "border-blue-400/80 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.45),0_0_28px_rgba(59,130,246,0.18)]"
          : "border-slate-700 bg-slate-700/30 hover:border-blue-500/50 hover:bg-blue-500/5",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity",
          selected
            ? "opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.16),transparent_42%)]"
            : "opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_42%)]",
        )}
      />
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl border",
            compact ? "h-10 w-10 text-sm" : "h-12 w-12 text-base",
            selected
              ? "border-blue-400/40 bg-blue-500/20 font-extrabold text-white"
              : "border-blue-500/20 bg-blue-500/10 font-bold text-blue-300",
          )}
        >
          {user.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-white",
              compact ? "text-lg font-bold" : "text-2xl font-extrabold",
            )}
          >
            {user.name}
          </p>
          <p
            className={cn(
              "truncate text-slate-400",
              compact ? "text-xs" : "text-sm",
            )}
          >
            @{user.username}
            {user.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        {selected && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-300/50 bg-blue-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.35)]">
            <CheckCircle className="h-4 w-4" />
          </div>
        )}
      </div>
    </button>
  );
}

function SimpleRecipientCard({
  user,
  onClick,
  compact = false,
}: {
  user: any;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-700/30 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
    >
      <div
        className={cn(
          "rounded-xl flex items-center justify-center shrink-0 font-bold",
          compact
            ? "w-8 h-8 bg-slate-600/50 text-xs text-slate-300"
            : "w-9 h-9 bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400",
        )}
      >
        {user.name?.charAt(0)?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">@{user.username}</p>
        <p className="truncate text-[10px] text-slate-500">
          {user.name}
          {user.email ? ` · ${user.email}` : ""}
        </p>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function TransferPage() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const text = {
    en: {
      title: "Transfer",
      newTransfer: "New Transfer",
      history: "History",
      noTransfers: "No transfers yet",
      detail: "Transfer Detail",
      close: "Close",
      findRecipient: "Find Recipient",
      recent: "Recent",
      enterAmount: "Enter Amount",
      confirmTransfer: "Confirm Transfer",
    },
    bn: {
      title: "ট্রান্সফার",
      newTransfer: "নতুন ট্রান্সফার",
      history: "হিস্টোরি",
      noTransfers: "এখনও কোনো ট্রান্সফার নেই",
      detail: "ট্রান্সফার বিস্তারিত",
      close: "বন্ধ করুন",
      findRecipient: "প্রাপক খুঁজুন",
      recent: "সাম্প্রতিক",
      enterAmount: "পরিমাণ লিখুন",
      confirmTransfer: "ট্রান্সফার নিশ্চিত করুন",
    },
    hi: {
      title: "ट्रांसफर",
      newTransfer: "नया ट्रांसफर",
      history: "हिस्ट्री",
      noTransfers: "अभी कोई ट्रांसफर नहीं है",
      detail: "ट्रांसफर विवरण",
      close: "बंद करें",
      findRecipient: "प्राप्तकर्ता खोजें",
      recent: "हाल के",
      enterAmount: "राशि दर्ज करें",
      confirmTransfer: "ट्रांसफर पुष्टि करें",
    },
  }[language];

  const [tab, setTab] = useState<"new" | "history">("new");
  const [step, setStep] = useState<Step>("recipient");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [note, setNote] = useState("");
  const [chargePreview, setChargePreview] = useState<{
    charge: number;
    finalAmount: number;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<any>(null);

  const searchRef = useRef<NodeJS.Timeout | null>(null);

  // ── Global settings ───────────────────────────────────────
  const { data: globalData, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });
  const globalSettings = globalData?.data ?? [];
  const isTransferOn = settingsLoading
    ? false
    : globalSettings.find((s: any) => s.key === "global_transfer")?.value !==
      "false";
  const transferMessage =
    globalSettings.find((s: any) => s.key === "global_transfer_message")
      ?.value || "Transfer is currently unavailable. Please try again later.";
  const transferOpenTime =
    globalSettings.find((s: any) => s.key === "global_transfer_open_time")
      ?.value || "";

  // ── Recent recipients ─────────────────────────────────────
  const { data: recentData } = useQuery({
    queryKey: ["recent-recipients"],
    queryFn: () => TransferService.getRecentRecipients(),
  });
  const recentRecipients: any[] = recentData?.data ?? [];

  // ── History ───────────────────────────────────────────────
  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ["my-transfers"],
    queryFn: () => TransferService.getMyTransfers(1, 30),
  });
  const sent: any[] = historyData?.data?.sent ?? [];
  const received: any[] = historyData?.data?.received ?? [];

  const allTransfers = [
    ...sent.map((t: any) => ({ ...t, direction: "sent" })),
    ...received.map((t: any) => ({ ...t, direction: "received" })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // ── Search ────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchRef.current) clearTimeout(searchRef.current);
    setIsSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await TransferService.searchUser(searchQuery);
        setSearchResults(res?.data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, [searchQuery]);

  // ── Charge preview ────────────────────────────────────────
  useEffect(() => {
    const num = parseInt(amount);
    if (!num) {
      setChargePreview(null);
      return;
    }
    TransferService.previewCharge(num).then((res) => {
      setChargePreview(res?.data ?? null);
    });
  }, [amount]);

  // ── Submit ────────────────────────────────────────────────
  const { mutate: createTransfer, isPending } = useMutation({
    mutationFn: TransferService.create,
    onSuccess: () => {
      toast.success("Transfer successful!");
      queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["recent-recipients"] });
      resetFlow();
      setTab("history");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Transfer failed"),
  });

  // ── Helpers ───────────────────────────────────────────────
  const resetFlow = () => {
    setStep("recipient");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setAmount("");
    setAmountError("");
    setNote("");
    setChargePreview(null);
  };

  const goBack = () => {
    if (step === "amount") {
      setStep("recipient");
      return;
    }
    if (step === "confirm") {
      setStep("amount");
      return;
    }
  };

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    setSearchQuery("");
    setSearchResults([]);
    setStep("amount");
  };

  const handleAmountNext = () => {
    const num = parseInt(amount);
    if (!num || isNaN(num)) {
      setAmountError("Please enter an amount.");
      return;
    }
    if (num < 10) {
      setAmountError("Minimum transfer is ৳10.");
      return;
    }
    if (num > 500000) {
      setAmountError("Maximum transfer is ৳5,00,000.");
      return;
    }
    setAmountError("");
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!isTransferOn) {
      toast.error("Transfer is currently unavailable");
      return;
    }

    createTransfer({
      receiverQuery: selectedUser.username ?? selectedUser.email,
      amount: parseInt(amount),
      note: note.trim() || undefined,
    });
  };

  const numAmount = parseInt(amount) || 0;
  const charge = chargePreview?.charge ?? 0;
  const totalDeducted = numAmount + charge;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
          <ArrowLeftRight className="h-4 w-4 text-blue-400" />
        </div>
        <h1 className="text-white text-xl font-bold">{text.title}</h1>
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
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t === "new" ? text.newTransfer : text.history}
          </button>
        ))}
      </div>

      {/* ══════════ NEW TAB ══════════ */}
      {tab === "new" && (
        <div className="space-y-4">
          {/* Loading skeleton */}
          {settingsLoading && (
            <div className="h-10 rounded-2xl bg-slate-700/50 animate-pulse" />
          )}

          {/* Transfer OFF */}
          {!settingsLoading && !isTransferOn && (
            <TransferOffBanner
              message={transferMessage}
              openTimeIso={transferOpenTime}
            />
          )}

          {/* Normal flow */}
          {!settingsLoading && isTransferOn && (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {(["recipient", "amount", "confirm"] as Step[]).map((s, i) => {
                  const steps = ["recipient", "amount", "confirm"];
                  const currIdx = steps.indexOf(step);
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all",
                          step === s
                            ? "bg-blue-600 border-blue-500 text-white"
                            : currIdx > i
                              ? "bg-green-600/20 border-green-500/50 text-green-400"
                              : "bg-slate-700 border-slate-600 text-slate-500",
                        )}
                      >
                        {currIdx > i ? "✓" : i + 1}
                      </div>
                      <span
                        className={cn(
                          "text-[10px]",
                          step === s ? "text-white" : "text-slate-500",
                        )}
                      >
                        {s === "recipient"
                          ? "Recipient"
                          : s === "amount"
                            ? "Amount"
                            : "Confirm"}
                      </span>
                      {i < 2 && (
                        <div
                          className={cn(
                            "flex-1 h-px w-6",
                            currIdx > i ? "bg-green-500/40" : "bg-slate-700",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back */}
              {step !== "recipient" && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}

              {/* ── STEP 1: Recipient ── */}
              {step === "recipient" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {text.findRecipient}
                    </p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by username or email..."
                        className="w-full rounded-xl border border-slate-600 bg-slate-700/50 pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500 placeholder:text-slate-500"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-1.5">
                        {searchResults.map((u: any) => (
                          <SimpleRecipientCard
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            user={u}
                          />
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 &&
                      !isSearching &&
                      searchResults.length === 0 && (
                        <p className="text-center text-slate-500 text-xs py-2">
                          No users found
                        </p>
                      )}
                  </div>

                  {recentRecipients.length > 0 && (
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          {text.recent}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {recentRecipients.map((u: any) => (
                          <SimpleRecipientCard
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            user={u}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Amount ── */}
              {step === "amount" && selectedUser && (
                <div className="space-y-3">
                  <SimpleRecipientCard
                    user={selectedUser}
                    onClick={() => setStep("recipient")}
                    compact
                  />

                  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {text.enterAmount}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {QUICK.map((a) => (
                        <button
                          key={a}
                          onClick={() => {
                            setAmount(String(a));
                            setAmountError("");
                          }}
                          className={cn(
                            "py-2.5 rounded-xl border text-xs font-semibold transition-all",
                            amount === String(a)
                              ? "bg-blue-600 border-blue-500 text-white scale-105"
                              : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-400",
                          )}
                        >
                          ৳{fmt(a)}
                        </button>
                      ))}
                    </div>

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
                        placeholder="Enter amount..."
                        className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-blue-500 placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {amountError && (
                        <p className="text-red-400 text-[11px] mt-1">
                          {amountError}
                        </p>
                      )}
                    </div>

                    {numAmount > 0 && chargePreview !== null && (
                      <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Send Amount</span>
                          <span className="text-white font-semibold">
                            ৳{fmt(numAmount)}
                          </span>
                        </div>
                        {charge > 0 ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">
                                Transfer Fee
                              </span>
                              <span className="text-red-400">
                                −৳{fmt(charge)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs border-t border-slate-700 pt-1.5">
                              <span className="text-slate-300 font-medium">
                                Total Deducted
                              </span>
                              <span className="text-white font-bold">
                                ৳{fmt(totalDeducted)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Transfer Fee</span>
                            <span className="text-emerald-400 font-medium">
                              Free ✓
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Recipient Gets</span>
                          <span className="text-emerald-400 font-bold">
                            ৳{fmt(numAmount)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] text-slate-400 mb-1.5 block">
                        Note (Optional)
                      </label>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note..."
                        className="w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white text-sm outline-none focus:border-blue-500 placeholder:text-slate-500"
                      />
                    </div>

                    <button
                      onClick={handleAmountNext}
                      disabled={!amount}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Review Transfer →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirm ── */}
              {step === "confirm" && selectedUser && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-slate-800/60 p-5 space-y-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider text-center">
                      {text.confirmTransfer}
                    </p>
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">
                        ৳{fmt(numAmount)}
                      </p>
                      {charge > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          +৳{fmt(charge)} fee · Total ৳{fmt(totalDeducted)}
                        </p>
                      )}
                      {charge === 0 && (
                        <p className="text-xs text-emerald-400 mt-1">
                          No fee ✓
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">From</p>
                        <p className="text-sm font-semibold text-white">You</p>
                      </div>
                      <Send className="h-5 w-5 text-blue-400" />
                      <div className="text-center">
                        <p className="text-xs text-slate-500 mb-1">To</p>
                        <p className="text-sm font-semibold text-white">
                          {selectedUser.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          @{selectedUser.username}
                        </p>
                      </div>
                    </div>
                    {note && (
                      <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-2 text-center">
                        <p className="text-xs text-slate-400">{note}</p>
                      </div>
                    )}
                    <button
                      onClick={handleConfirm}
                      disabled={isPending}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Confirm Transfer
                        </>
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
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : allTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/50 border border-slate-700 flex items-center justify-center text-2xl">
                💸
              </div>
              <p className="text-slate-500 text-sm">{text.noTransfers}</p>
            </div>
          ) : (
            allTransfers.map((t: any) => {
              const isSent = t.direction === "sent";
              const peer = isSent ? t.receiver : t.sender;
              const Icon = STATUS_ICON[t.status] ?? Clock;
              return (
                <div
                  key={t.id + t.direction}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border shrink-0",
                        isSent
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                      )}
                    >
                      {isSent ? "↑" : "↓"}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {isSent ? `To ${peer?.name}` : `From ${peer?.name}`}
                      </p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        @{peer?.username}
                      </p>
                      <p className="text-slate-600 text-[10px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-bold text-sm",
                          isSent ? "text-red-400" : "text-emerald-400",
                        )}
                      >
                        {isSent ? "−" : "+"}৳{fmt(t.amount)}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium mt-0.5",
                          STATUS_STYLE[t.status] ??
                            "bg-slate-700 text-slate-400 border-slate-600",
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {t.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setDetailItem({ ...t, isSent, peer })}
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

      {/* Detail Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailItem(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[24px] border border-slate-700 bg-slate-900 p-5 space-y-3 my-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{text.detail}</h2>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs divide-y divide-slate-800">
              {[
                ["Type", detailItem.isSent ? "Sent" : "Received"],
                [
                  detailItem.isSent ? "Recipient" : "Sender",
                  detailItem.peer?.name,
                ],
                ["Username", `@${detailItem.peer?.username}`],
                ["Amount", `৳${fmt(detailItem.amount)}`],
                ["Note", detailItem.note],
                ["Status", detailItem.status],
                ["Date", new Date(detailItem.createdAt).toLocaleString()],
              ].map(([label, value]) =>
                value ? (
                  <div
                    key={label as string}
                    className="flex justify-between gap-4 pt-2 first:pt-0"
                  >
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="text-white text-right font-medium">
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
              {text.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
