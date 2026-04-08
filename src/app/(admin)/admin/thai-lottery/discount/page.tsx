/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/discount/page.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Percent, Save, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";
import { api } from "@/lib/axios";

const PLAY_TYPE_LABEL: Record<string, string> = {
  THREE_UP_DIRECT: "3Up Direct",
  THREE_UP_RUMBLE: "3Up Rumble",
  THREE_UP_SINGLE: "3Up Single",
  THREE_UP_TOTAL: "3Up Total",
  TWO_UP_DIRECT: "2Up Direct",
  DOWN_DIRECT: "Down Direct",
  DOWN_SINGLE: "Down Single",
  DOWN_TOTAL: "Down Total",
};

export default function ThaiDiscountPage() {
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<
    Record<string, { base: string; multiplier: string }>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ["thai-bet-rates"],
    queryFn: AdminService.getThaiRates,
  });

  const { data: gameRateData, isLoading: gameRatesLoading } = useQuery({
    queryKey: ["game-rates", "THAI"],
    queryFn: () =>
      api.get("/game-rates/thai").then((r) => r.data?.data ?? []),
  });

  const rates: any[] = data?.data ?? [];
  const gameRates: any[] = gameRateData ?? [];

  const multiplierMap = Object.fromEntries(
    gameRates.map((r: any) => [r.playType, Number(r.multiplier)]),
  );

  const { mutate: updateDiscount, isPending } = useMutation({
    mutationFn: async ({
      playType,
      base,
      multiplier,
    }: {
      playType: string;
      base: number;
      multiplier: number;
    }) => {
      await api.post(
        "/game-rates/thai/update-all",
        gameRates.map((rate: any) => ({
          playType: rate.playType,
          multiplier:
            rate.playType === playType ? multiplier : Number(rate.multiplier),
          commissionPct: Number(rate.commissionPct ?? 0),
        })),
      );

      return AdminService.updateThaiDiscount({
        playType,
        baseDiscountPct: base,
        globalDiscountPct: 0,
      });
    },
    onSuccess: (_, vars) => {
      toast.success(`${PLAY_TYPE_LABEL[vars.playType]} updated`);
      queryClient.invalidateQueries({ queryKey: ["thai-bet-rates"] });
      queryClient.invalidateQueries({ queryKey: ["game-rates", "THAI"] });
      queryClient.refetchQueries({ queryKey: ["thai-bet-rates"] });
      queryClient.refetchQueries({ queryKey: ["game-rates", "THAI"] });
      setEditRow((prev) => {
        const next = { ...prev };
        delete next[vars.playType];
        return next;
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const getEdit = (playType: string, fallback: number) =>
    editRow[playType]?.base ?? String(fallback);

  const getMultiplierEdit = (playType: string, fallback: number) =>
    editRow[playType]?.multiplier ?? String(fallback);

  const setEdit = (
    playType: string,
    key: "base" | "multiplier",
    value: string,
    currentBase: number,
    currentMultiplier: number,
  ) => {
    setEditRow((prev) => ({
      ...prev,
      [playType]: {
        base:
          key === "base"
            ? value
            : prev[playType]?.base ?? String(currentBase),
        multiplier:
          key === "multiplier"
            ? value
            : prev[playType]?.multiplier ?? String(currentMultiplier),
      },
    }));
  };

  const handleSave = (rate: any) => {
    const base = Number(getEdit(rate.playType, Number(rate.baseDiscountPct)));
    const multiplier = Number(
      getMultiplierEdit(
        rate.playType,
        multiplierMap[rate.playType] ?? Number(rate.multiplier ?? 1),
      ),
    );
    if (isNaN(base) || base < 0 || base > 100) {
      toast.error("Discount must be between 0 and 100");
      return;
    }
    if (isNaN(multiplier) || multiplier <= 0) {
      toast.error("Multiplier must be greater than 0");
      return;
    }
    updateDiscount({ playType: rate.playType, base, multiplier });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
          <Percent className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Discount Settings</h1>
          <p className="text-xs text-slate-400">
            Set discount values individually for each Thai Lottery play type
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300/80">
        <p>
          <span className="text-blue-400 font-semibold">Discount %</span> applies
          only to the selected play type.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
          Multiplier = win amount per $1 bet
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <DollarSign className="h-3.5 w-3.5 text-yellow-400" />
          Thai Lottery uses USD rate control below
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                SI
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Play Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Multiplier
              </th>
              <th className="px-4 py-3 text-xs font-medium text-green-400">
                Discount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Save
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading || gameRatesLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              : rates.map((rate: any, idx: number) => {
                  const baseVal = getEdit(
                    rate.playType,
                    Number(rate.baseDiscountPct),
                  );
                  const currentBase = Number(rate.baseDiscountPct);
                  const currentMultiplier =
                    multiplierMap[rate.playType] ?? Number(rate.multiplier ?? 1);
                  const multiplierVal = getMultiplierEdit(
                    rate.playType,
                    currentMultiplier,
                  );
                  const isDirty = editRow[rate.playType] !== undefined;

                  return (
                    <tr
                      key={rate.playType}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20"
                    >
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-slate-500">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {PLAY_TYPE_LABEL[rate.playType] ?? rate.playType}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={multiplierVal}
                            onChange={(e) =>
                              setEdit(
                                rate.playType,
                                "multiplier",
                                e.target.value,
                                currentBase,
                                currentMultiplier,
                              )
                            }
                            className="w-16 rounded-lg border border-yellow-500/30 bg-slate-700 px-2 py-1 text-center text-sm font-semibold text-yellow-400 outline-none focus:border-yellow-500"
                          />
                          <span className="text-xs font-medium text-yellow-400">
                            ×
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={baseVal}
                            onChange={(e) =>
                              setEdit(
                                rate.playType,
                                "base",
                                e.target.value,
                                currentBase,
                                currentMultiplier,
                              )
                            }
                            className="w-16 rounded-lg border border-green-500/30 bg-slate-700 px-2 py-1 text-center text-sm font-semibold text-green-400 outline-none focus:border-green-500"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSave(rate)}
                          disabled={!isDirty || isPending || gameRates.length === 0}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-30"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <CurrencyRateCard />
    </div>
  );
}

function CurrencyRateCard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["thai-currency-rate"],
    queryFn: () => api.get("/game-rates/currency").then((r) => r.data?.data),
  });

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-slate-700/40 animate-pulse" />;
  }

  return (
    <CurrencyForm key={data?.bdtPerDollar} initial={data} onSaved={refetch} />
  );
}

function CurrencyForm({
  initial,
  onSaved,
}: {
  initial: any;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [rate, setRate] = useState(String(initial?.bdtPerDollar ?? 110));

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post("/game-rates/currency/update", { bdtPerDollar: Number(rate) }),
    onSuccess: () => {
      toast.success("Currency rate updated!");
      onSaved();
      queryClient.invalidateQueries({ queryKey: ["thai-currency-rate"] });
      queryClient.refetchQueries({ queryKey: ["thai-currency-rate"] });
    },
    onError: () => toast.error("Failed to update rate"),
  });

  const numRate = Number(rate) || 1;
  const examples = [1, 10, 100];

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-yellow-400" />
        <div>
          <p className="text-sm font-semibold text-yellow-300">
            USD to BDT Exchange Rate
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Used to convert Thai Lottery bet amounts and winnings
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3">
          <span className="whitespace-nowrap text-sm font-medium text-slate-400">
            $1 USD =
          </span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="flex-1 bg-transparent text-center text-lg font-bold text-white outline-none"
            min={1}
            step={0.5}
          />
          <span className="whitespace-nowrap text-sm font-medium text-slate-400">
            BDT
          </span>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-yellow-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-yellow-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Rate
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {examples.map((usd) => (
          <div
            key={usd}
            className="rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-center"
          >
            <p className="text-sm font-bold font-mono text-yellow-400">${usd}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              = {(usd * numRate).toLocaleString("en-BD")} BDT
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-600">
        This rate affects Thai Lottery: bet input ($) is converted to BDT for
        processing, and winnings are displayed in both currencies.
      </p>
    </div>
  );
}
