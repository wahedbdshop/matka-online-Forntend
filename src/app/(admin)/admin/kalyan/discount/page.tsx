"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Percent, Save, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const PLAY_TYPES = [
  { playType: "GAME_TOTAL", label: "Game Total" },
  { playType: "SINGLE_PATTI", label: "Single Patti" },
  { playType: "DOUBLE_PATTI", label: "Double Patti" },
  { playType: "TRIPLE_PATTI", label: "Triple Patti" },
  { playType: "JORI", label: "Jori" },
];

type DiscountRow = {
  playType: string;
  label: string;
  baseDiscountPct: number;
};

export default function KalyanDiscountPage() {
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-discount-settings"],
    queryFn: KalyanAdminService.getDiscountSettings,
  });

  const rows = useMemo<DiscountRow[]>(() => {
    const apiRows = Array.isArray(data?.data) ? data.data : [];
    const byPlayType = new Map(
      apiRows.map((item: { playType: string; baseDiscountPct?: number }) => [
        item.playType,
        Number(item.baseDiscountPct ?? 0),
      ]),
    );

    return PLAY_TYPES.map((item) => ({
      playType: item.playType,
      label: item.label,
      baseDiscountPct: byPlayType.get(item.playType) ?? 0,
    }));
  }, [data]);

  const { mutate: updateDiscount, isPending } = useMutation({
    mutationFn: KalyanAdminService.updateDiscountSetting,
    onSuccess: (_, vars) => {
      toast.success(`${getPlayTypeLabel(vars.playType)} discount updated`);
      queryClient.invalidateQueries({ queryKey: ["kalyan-discount-settings"] });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[vars.playType];
        return next;
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update discount";
      toast.error(message);
    },
  });

  const getValue = (row: DiscountRow) =>
    editValues[row.playType] ?? String(row.baseDiscountPct);

  const setValue = (playType: string, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [playType]: value,
    }));
  };

  const handleSave = (row: DiscountRow) => {
    const parsed = Number(getValue(row));

    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Discount must be between 0 and 100");
      return;
    }

    updateDiscount({
      playType: row.playType,
      baseDiscountPct: parsed,
    });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
          <Percent className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Kalyan Discount</h1>
          <p className="text-xs text-slate-400">
            Control discount percentage for each Kalyan play type.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-300">
              Thai Lottery style discount rule
            </p>
            <p className="text-xs leading-relaxed text-slate-300">
              User amount stays as entered bet amount. Wallet deducts only the
              discounted payable amount, but winning calculation still uses the
              original entered amount.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                SI
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Play Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400">
                Discount %
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Save
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: PLAY_TYPES.length }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-800/80">
                    <td className="px-4 py-4">
                      <div className="h-4 w-8 animate-pulse rounded bg-slate-700" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-700" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-700" />
                    </td>
                  </tr>
                ))
              : rows.map((row, index) => {
                  const currentValue = getValue(row);
                  const isDirty = editValues[row.playType] !== undefined;

                  return (
                    <tr
                      key={row.playType}
                      className="border-b border-slate-800/80 transition-colors hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">
                        {String(index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-white">
                        {row.label}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentValue}
                            onChange={(e) =>
                              setValue(row.playType, e.target.value)
                            }
                            className="w-24 rounded-xl border border-emerald-500/30 bg-slate-800 px-3 py-2 text-center text-sm font-semibold text-emerald-300 outline-none transition-colors focus:border-emerald-400"
                          />
                          <span className="text-xs font-medium text-slate-500">
                            %
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleSave(row)}
                          disabled={!isDirty || isPending}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getPlayTypeLabel(playType: string) {
  return PLAY_TYPES.find((item) => item.playType === playType)?.label ?? playType;
}
