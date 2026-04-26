"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Ban, Loader2, SendHorizonal, ShieldOff, TimerOff } from "lucide-react";
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
import {
  getBangladeshDateISO,
  hasUtcScheduleTimePassed,
} from "@/lib/timezone";
import { Rate } from "@/types/kalyan";
import { useServerTime } from "@/hooks/use-server-time";

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

type MarketAdminStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | null;

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

function MarketBlockedScreen({
  status,
  backHref,
}: {
  status: "INACTIVE" | "CANCELLED";
  backHref: string;
}) {
  const router = useRouter();
  const isCancelled = status === "CANCELLED";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full ${
          isCancelled
            ? "bg-rose-500/15 ring-2 ring-rose-500/30"
            : "bg-amber-500/15 ring-2 ring-amber-500/30"
        }`}
      >
        {isCancelled ? (
          <Ban className="h-9 w-9 text-rose-400" />
        ) : (
          <ShieldOff className="h-9 w-9 text-amber-400" />
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-extrabold text-white">
          {isCancelled ? "Market Cancelled" : "Market Suspended"}
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-slate-400">
          {isCancelled
            ? "This market has been cancelled by the admin. Betting is permanently closed for this session."
            : "This market has been temporarily suspended by the admin. Please check back later."}
        </p>
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${
          isCancelled
            ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300"
        }`}
      >
        {isCancelled ? (
          <>
            <Ban className="h-3 w-3" /> Cancelled
          </>
        ) : (
          <>
            <ShieldOff className="h-3 w-3" /> Market Suspended
          </>
        )}
      </span>

      <button
        onClick={() => router.push(backHref)}
        className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
      >
        ← Go Back
      </button>
    </div>
  );
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
  const { serverNow, serverTimeReady } = useServerTime();
  const [marketTitle, setMarketTitle] = useState("");
  const [marketAdminStatus, setMarketAdminStatus] = useState<MarketAdminStatus>(null);
  const [discountPct, setDiscountPct] = useState(0);

  const { register, watch, handleSubmit, reset } = useForm<Record<string, string>>();
  const values = watch();
  const [submitting, setSubmitting] = useState(false);
  const [closeTime, setCloseTime] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    KalyanUserService.getActiveMarkets({ includeInactive: true })
      .then((res) => {
        const markets = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.markets)
            ? res.data.markets
            : [];
        const currentMarket = markets.find((market: { id: string }) => market.id === marketId);

        if (!mounted) return;

        if (!currentMarket) {
          setMarketAdminStatus("INACTIVE");
          return;
        }

        const rawStatus = String(currentMarket.status ?? "ACTIVE").toUpperCase();
        if (rawStatus === "CANCELLED") {
          setMarketAdminStatus("CANCELLED");
        } else if (rawStatus === "INACTIVE") {
          setMarketAdminStatus("INACTIVE");
        } else {
          setMarketAdminStatus("ACTIVE");
        }

        const title =
          sessionType === "CLOSE"
            ? currentMarket.closeName ?? `${currentMarket.name} Close`
            : currentMarket.openName ?? `${currentMarket.name} Open`;

        setMarketTitle(title);
      })
      .catch(() => {
        if (!mounted) return;
        setMarketAdminStatus("ACTIVE");
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

  useEffect(() => {
    let mounted = true;

    KalyanUserService.getMarketTiming(marketId)
      .then((res) => {
        if (!mounted) return;
        const timings = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
        const timing = timings.find((t: { sessionType: string }) => t.sessionType === sessionType);
        if (timing?.closeTime) {
          setCloseTime(timing.closeTime);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [marketId, sessionType]);

  const isTimeOver = useMemo(() => {
    if (!serverTimeReady || !serverNow || !closeTime) return false;
    return hasUtcScheduleTimePassed(closeTime, serverNow);
  }, [closeTime, serverNow, serverTimeReady]);

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
    (sum, value) => sum + Math.max(0, Number(value) || 0),
    0,
  );
  const discountAmount = Number(((total * discountPct) / 100).toFixed(2));
  const payableAmount = Number((total - discountAmount).toFixed(2));

  const onSubmit = async (data: Record<string, string>) => {
    if (marketAdminStatus === "CANCELLED") {
      toast.error("This market has been cancelled. Betting is not allowed.");
      return;
    }
    if (marketAdminStatus === "INACTIVE") {
      toast.error("This market is currently suspended. Please check back later.");
      return;
    }
    if (!serverTimeReady || !serverNow) {
      toast.error("Server time is syncing. Please try again.");
      return;
    }

    if (isTimeOver) {
      toast.error("Time is over! You cannot place this bet.");
      router.push("/kalyan");
      return;
    }

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
      .filter(([, amount]) => Number(amount) > 0)
      .map(([selectedNumber, amount]) => ({
        selectedNumber,
        amount: Number(amount),
      }));

    if (!items.length) {
      return;
    }

    const today = getBangladeshDateISO(serverNow);

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
        router.push("/kalyan/win-history");
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

  if (marketAdminStatus === "INACTIVE" || marketAdminStatus === "CANCELLED") {
    return (
      <div className="space-y-5 pb-6">
        <KalyanPageHeader
          title={playTypeLabel}
          subtitle={headerSubtitle}
          backHref={`/kalyan/${playTypeSlug}`}
        />
        <MarketBlockedScreen
          status={marketAdminStatus}
          backHref={`/kalyan/${playTypeSlug}`}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-36">
      <KalyanPageHeader
        title={playTypeLabel}
        subtitle={headerSubtitle}
        backHref={`/kalyan/${playTypeSlug}`}
      />

      {discountPct > 0 && (
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
          <p className="text-xs leading-relaxed text-emerald-300/90">
            Discount: {discountPct}% applied. Wallet will deduct only the payable
            amount, but winnings will still be calculated from your entered
            amount.
          </p>
        </div>
      )}

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

      {playTypeEnum === "SINGLE_PATTI" && (
        <div className="space-y-3">
          {Object.entries(SINGLE_PATTI_MAP).map(([total, nums], index) => (
            <NumberSectionCard
              key={total}
              title={`Total ${total}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[index % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {playTypeEnum === "DOUBLE_PATTI" && (
        <div className="space-y-3">
          {Object.entries(DOUBLE_PATTI_MAP).map(([total, nums], index) => (
            <NumberSectionCard
              key={total}
              title={`Total ${total}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[index % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {playTypeEnum === "TRIPLE_PATTI" && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
          <div className="bg-orange-600/20 px-4 py-2 text-orange-300">
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

      {playTypeEnum === "JORI" && (
        <div className="space-y-3">
          {Object.entries(JORI_MAP).map(([digit, nums], index) => (
            <NumberSectionCard
              key={digit}
              title={`Digit - ${digit}`}
              numbers={nums}
              register={register}
              accentColor={SECTION_COLORS[index % SECTION_COLORS.length]}
            />
          ))}
        </div>
      )}

      {!playTypeEnum && (
        <p className="py-8 text-center text-sm text-red-400">
          Unknown play type: {playTypeSlug}
        </p>
      )}

      <div className="fixed bottom-16 left-0 right-0 z-20 mx-auto max-w-lg px-4">
        <TotalAmountBar
          total={total}
          discountAmount={discountAmount}
          payableAmount={payableAmount}
        />
        {isTimeOver ? (
          <div className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/20 py-2.5 text-sm font-bold text-red-200">
            <TimerOff className="h-4 w-4" />
            Time Over — Betting Closed
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting || total === 0 || !serverTimeReady}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Bet...
              </>
            ) : !serverTimeReady ? (
              "Syncing Server Time..."
            ) : (
              <>
                <SendHorizonal className="h-4 w-4" />
                Submit Bet - Rs. {payableAmount.toLocaleString("en-IN")}
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
