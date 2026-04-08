/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Percent, Check, X } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { PLAY_TYPE_LABEL, PlayType } from "@/types/kalyan";

export default function KalyanGamesRatePage() {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-rates"],
    queryFn: () => KalyanAdminService.getRates(),
  });

  const rates: any[] = data?.data ?? [];

  const { mutate: updateRate, isPending: saving } = useMutation({
    mutationFn: ({ playType, rate, status }: { playType: string; rate: number; status: string }) =>
      KalyanAdminService.updateRate(playType, { rate, status }),
    onSuccess: () => {
      toast.success("Rate updated");
      queryClient.invalidateQueries({ queryKey: ["kalyan-rates"] });
      setEditingType(null);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to update rate"),
  });

  const startEdit = (r: any) => {
    setEditingType(r.playType);
    setEditRate(String(r.rate));
    setEditStatus(r.status);
  };

  const cancelEdit = () => setEditingType(null);

  const submitEdit = (playType: string) => {
    const normalizedRate = editRate.trim();
    const rate = Number(normalizedRate);

    if (isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid rate");
      return;
    }

    updateRate({ playType, rate, status: editStatus });
  };

  const COLOR_MAP: Record<string, string> = {
    GAME_TOTAL: "blue",
    SINGLE_PATTI: "green",
    DOUBLE_PATTI: "purple",
    TRIPLE_PATTI: "orange",
    JORI: "cyan",
  };

  const BG_MAP: Record<string, string> = {
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-emerald-500/20 bg-emerald-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    orange: "border-orange-500/20 bg-orange-500/5",
    cyan: "border-cyan-500/20 bg-cyan-500/5",
  };

  const TEXT_MAP: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
          <Percent className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Games Rate</h1>
          <p className="text-xs text-slate-400">
            Configure payout rates for each play type
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rates.map((r: any) => {
            const color = COLOR_MAP[r.playType] ?? "blue";
            const isEditing = editingType === r.playType;

            return (
              <div
                key={r.playType}
                className={`rounded-2xl border p-5 space-y-4 ${BG_MAP[color]}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Play Type
                    </p>
                    <p className={`mt-0.5 text-sm font-bold ${TEXT_MAP[color]}`}>
                      {PLAY_TYPE_LABEL[r.playType as PlayType] ?? r.playType}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      r.status === "ACTIVE"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-slate-400">
                          Payout For Rs. 100
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-slate-400">
                          Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-800 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => submitEdit(r.playType)}
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500">Payout For Rs. 100</p>
                      <p className="text-3xl font-bold text-white">
                        {r.rate}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(r)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${BG_MAP[color]} border-current ${TEXT_MAP[color]} hover:opacity-80`}
                    >
                      Edit Rate
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Note:</span> Enter the
          total payout amount for a Rs. 100 bet.
          Example: if you enter 970, then a Rs. 100 bet pays Rs. 970 and a Rs. 5 bet pays Rs. 48.50.
          Changes take effect on
          new entries only.
        </p>
      </div>
    </div>
  );
}
