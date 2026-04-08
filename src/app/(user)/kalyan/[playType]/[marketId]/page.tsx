"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, SendHorizonal } from "lucide-react";
import { KalyanUserService } from "@/services/kalyanUser.service";
import {
  GAME_TOTAL_NUMBERS,
  SINGLE_PATTI_MAP,
  DOUBLE_PATTI_MAP,
  TRIPLE_PATTI_NUMBERS,
  JORI_MAP,
  PLAY_TYPE_SLUG_MAP,
  PLAY_TYPE_LABELS,
} from "@/constants/kalyan-play-numbers";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { NumberAmountCell } from "@/components/kalyan/user/NumberAmountCell";
import { NumberSectionCard } from "@/components/kalyan/user/NumberSectionCard";
import { TotalAmountBar } from "@/components/kalyan/user/TotalAmountBar";
import { Rate } from "@/types/kalyan";

// ─── Section accent colours (cycle through totals 0–9) ────────────────────────
const SECTION_COLORS = [
  "bg-blue-600/20 text-blue-300",
  "bg-indigo-600/20 text-indigo-300",
  "bg-purple-600/20 text-purple-300",
  "bg-pink-600/20 text-pink-300",
  "bg-rose-600/20 text-rose-300",
  "bg-orange-600/20 text-orange-300",
  "bg-amber-600/20 text-amber-300",
  "bg-yellow-600/20 text-yellow-300",
  "bg-lime-600/20 text-lime-300",
  "bg-green-600/20 text-green-300",
];

const SESSION_TYPES = ["OPEN", "CLOSE"] as const;
const ALLOWED_PLAY_TYPES = [
  "GAME_TOTAL",
  "SINGLE_PATTI",
  "DOUBLE_PATTI",
  "TRIPLE_PATTI",
  "JORI",
] as const;
const STRICT_PLAY_TYPE_BY_SLUG: Record<string, (typeof ALLOWED_PLAY_TYPES)[number]> = {
  "game-total": "GAME_TOTAL",
  "single-patti": "SINGLE_PATTI",
  "double-patti": "DOUBLE_PATTI",
  "triple-patti": "TRIPLE_PATTI",
  jori: "JORI",
};

function normalizeSessionType(value: string | null): "OPEN" | "CLOSE" {
  const normalized = value?.trim().toUpperCase();
  return SESSION_TYPES.includes(normalized as "OPEN" | "CLOSE")
    ? (normalized as "OPEN" | "CLOSE")
    : "OPEN";
}

function normalizePlayType(value: string): string {
  const normalized = value.trim();
  const slugKey = normalized.toLowerCase();
  const strictResolved = STRICT_PLAY_TYPE_BY_SLUG[slugKey];

  if (strictResolved) {
    return strictResolved;
  }

  const resolved =
    PLAY_TYPE_SLUG_MAP[slugKey] ??
    (Object.values(PLAY_TYPE_SLUG_MAP).includes(normalized.toUpperCase())
      ? normalized.toUpperCase()
      : "");

  return ALLOWED_PLAY_TYPES.includes(
    resolved as (typeof ALLOWED_PLAY_TYPES)[number],
  )
    ? resolved
    : "";
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const playTypeSlug = params.playType as string;
  const marketId = params.marketId as string;
  const sessionType = normalizeSessionType(searchParams.get("session"));

  const playTypeEnum = normalizePlayType(playTypeSlug);
  const playTypeLabel = PLAY_TYPE_LABELS[playTypeEnum] ?? playTypeSlug;
  const [marketTitle, setMarketTitle] = useState("");
  const [discountPct, setDiscountPct] = useState(0);

  const { register, watch, handleSubmit, reset } = useForm<Record<string, string>>();
  const values = watch();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    KalyanUserService.getActiveMarkets()
      .then((res) => {
        const markets = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.markets)
            ? res.data.markets
            : [];
        const currentMarket = markets.find((market: any) => market.id === marketId);

        if (!mounted || !currentMarket) return;

        const title =
          sessionType === "CLOSE"
            ? currentMarket.closeName ?? `${currentMarket.name} Close`
            : currentMarket.openName ?? `${currentMarket.name} Open`;

        setMarketTitle(title);
      })
      .catch(() => {
        if (!mounted) return;
        setMarketTitle(sessionType === "CLOSE" ? "Game Close" : "Game Open");
      });

    return () => {
      mounted = false;
    };
  }, [marketId, sessionType]);

  useEffect(() => {
    let mounted = true;

    KalyanUserService.getGameRates()
      .then((res) => {
        if (!mounted) return;

        const rates = Array.isArray(res.data) ? (res.data as Rate[]) : [];
        const currentRate = rates.find((rate) => rate.playType === playTypeEnum);
        const resolvedDiscount =
          Number(currentRate?.baseDiscountPct ?? 0) +
          Number(currentRate?.globalDiscountPct ?? 0);

        setDiscountPct(resolvedDiscount);
      })
      .catch(() => {
        if (!mounted) return;
        setDiscountPct(0);
      });

    return () => {
      mounted = false;
    };
  }, [playTypeEnum]);

  const headerSubtitle = useMemo(() => {
    const normalizedTitle = toTitleCase(marketTitle || "Game");
    const sessionLabel = sessionType === "CLOSE" ? "Close" : "Open";
    const baseTitle = normalizedTitle
      .replace(/\bopen\b/gi, "")
      .replace(/\bclose\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return `Session: ${baseTitle || "Game"} (${sessionLabel})`;
  }, [marketTitle, sessionType]);

  const total = Object.values(values).reduce(
    (sum, v) => sum + Math.max(0, Number(v) || 0),
    0,
  );
  const discountAmount = Number(((total * discountPct) / 100).toFixed(2));
  const payableAmount = Number((total - discountAmount).toFixed(2));

  const onSubmit = async (data: Record<string, string>) => {
    if (!playTypeEnum) {
      toast.error("Invalid play type selected.");
      return;
    }

    const safePlayType = ALLOWED_PLAY_TYPES.includes(
      playTypeEnum as (typeof ALLOWED_PLAY_TYPES)[number],
    )
      ? playTypeEnum
      : "";

    if (!safePlayType) {
      toast.error("Invalid play type selected.");
      return;
    }

    if (safePlayType === "JORI" && sessionType === "CLOSE") {
      toast.error("Jori can only be played in OPEN session.");
      return;
    }

    const items = Object.entries(data)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([num, amt]) => ({
        selectedNumber: num,
        amount: Number(amt),
      }));

    if (!items.length) {
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    try {
      setSubmitting(true);
      const payload = {
        marketId,
        sessionType,
        playType: safePlayType,
        resultDate: today,
        items,
      };
      const res = await KalyanUserService.createEntrySlip(payload);

      if (res.success) {
        toast.success("Bet placed successfully!");
        reset();
        router.push("/kalyan/bet-history");
      } else {
        toast.error(res.message ?? "Submission failed. Try again.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-36">
      <KalyanPageHeader
        title={playTypeLabel}
        subtitle={headerSubtitle}
        backHref={`/kalyan/${playTypeSlug}`}
      />

      <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
        <p
          className={`text-xs leading-relaxed text-slate-400 ${
            playTypeEnum === "SINGLE_PATTI" ? "max-w-[17rem]" : ""
          }`}
        >
          Enter the amount beside each number you want to bet on.
          Only numbers with an amount will be included in your submission.
        </p>
        {discountPct > 0 && (
          <p className="mt-2 text-xs leading-relaxed text-emerald-300/90">
            Discount: {discountPct}% applied. Wallet will deduct only the payable
            amount, but winnings will still be calculated from your entered
            amount.
          </p>
        )}
      </div>

      {/* ── Game Total ─────────────────────────────────────────── */}
      {playTypeEnum === "GAME_TOTAL" && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
          <div className="bg-blue-600/25 px-4 py-2.5">
            <span className="inline-flex rounded-full border border-blue-400/25 bg-blue-500/15 px-3 py-1 text-sm font-extrabold uppercase tracking-[0.12em] text-blue-200 shadow-[0_10px_24px_rgba(59,130,246,0.16)]">
              Total 0 – 9
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {GAME_TOTAL_NUMBERS.map((num) => (
              <NumberAmountCell key={num} number={num} register={register} />
            ))}
          </div>
        </div>
      )}

      {/* ── Single Patti ────────────────────────────────────────── */}
      {playTypeEnum === "SINGLE_PATTI" && (
        <div className="space-y-3">
          {Object.entries(SINGLE_PATTI_MAP).map(([total, nums], idx) => (
            <NumberSectionCard
              key={total}
              title={`Total ${total}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[idx % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {/* ── Double Patti ────────────────────────────────────────── */}
      {playTypeEnum === "DOUBLE_PATTI" && (
        <div className="space-y-3">
          {Object.entries(DOUBLE_PATTI_MAP).map(([total, nums], idx) => (
            <NumberSectionCard
              key={total}
              title={`Total ${total}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[idx % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {/* ── Triple Patti ────────────────────────────────────────── */}
      {playTypeEnum === "TRIPLE_PATTI" && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
          <div className="bg-orange-600/20 text-orange-300 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide">
              Triple Patti Numbers
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {TRIPLE_PATTI_NUMBERS.map((num) => (
              <NumberAmountCell key={num} number={num} register={register} />
            ))}
          </div>
        </div>
      )}

      {/* ── Jori ────────────────────────────────────────────────── */}
      {playTypeEnum === "JORI" && (
        <div className="space-y-3">
          {Object.entries(JORI_MAP).map(([digit, nums], idx) => (
            <NumberSectionCard
              key={digit}
              title={`Digit - ${digit}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[idx % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {!playTypeEnum && (
        <p className="text-center text-sm text-red-400 py-8">
          Unknown play type: {playTypeSlug}
        </p>
      )}

      {/* ── Sticky total + submit ─────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 px-4 z-20 max-w-lg mx-auto">
        <TotalAmountBar
          total={total}
          discountAmount={discountAmount}
          payableAmount={payableAmount}
        />
        <button
          type="submit"
          disabled={submitting || total === 0}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Placing Bet...
            </>
          ) : (
            <>
              <SendHorizonal className="h-4 w-4" />
              Submit Bet - Rs. {payableAmount.toLocaleString("en-IN")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}




