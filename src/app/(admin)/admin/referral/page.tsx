/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Gift,
  TrendingUp,
  Users,
  DollarSign,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { ReferralService } from "@/services/referral.service";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReferralConfig {
  id: string;
  level: number;
  commissionPct: number;
  isActive: boolean;
}

interface LocalConfig {
  level: number;
  commissionPct: number;
  isActive: boolean;
}

const LEVEL_LABELS: Record<number, { label: string; desc: string }> = {
  0: {
    label: "Join Bonus",
    desc: "Flat BDT amount when referred user registers",
  },
  1: {
    label: "Level 1 — Direct",
    desc: "% of deposit from directly referred user",
  },
  2: { label: "Level 2 — Indirect", desc: "% of deposit from 2nd level user" },
  3: { label: "Level 3", desc: "% of deposit from 3rd level user" },
};

// Default 4 levels (0–3)
const DEFAULT_CONFIGS: LocalConfig[] = [
  { level: 0, commissionPct: 0, isActive: true },
  { level: 1, commissionPct: 0, isActive: true },
  { level: 2, commissionPct: 0, isActive: false },
  { level: 3, commissionPct: 0, isActive: false },
];

export default function AdminReferralPage() {
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<LocalConfig[]>(DEFAULT_CONFIGS);
  const [earningsPage, setEarningsPage] = useState(1);

  // ── Fetch config ────────────────────────────────────────────────────────────
  useQuery({
    queryKey: ["referral-config"],
    queryFn: async () => {
      const res = await ReferralService.getConfig();
      const data: ReferralConfig[] = res.data || [];

      // Merge DB values into DEFAULT_CONFIGS
      setConfigs(
        DEFAULT_CONFIGS.map((def) => {
          const found = data.find((d) => d.level === def.level);
          return found
            ? {
                level: found.level,
                commissionPct: Number(found.commissionPct),
                isActive: found.isActive,
              }
            : def;
        }),
      );

      return data;
    },
  });

  // ── Fetch all earnings ──────────────────────────────────────────────────────
  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["referral-earnings-admin", earningsPage],
    queryFn: async () => {
      const res = await ReferralService.getAllEarnings(earningsPage, 15);
      return res.data;
    },
  });

  // ── Save mutation ───────────────────────────────────────────────────────────
  const { mutate: saveConfigs, isPending: isSaving } = useMutation({
    mutationFn: () => ReferralService.bulkUpdateConfig(configs),
    onSuccess: () => {
      toast.success("Referral settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["referral-config"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const updatePct = (level: number, value: string) => {
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    setConfigs((prev) =>
      prev.map((c) => (c.level === level ? { ...c, commissionPct: num } : c)),
    );
  };

  const toggleActive = (level: number) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.level === level ? { ...c, isActive: !c.isActive } : c,
      ),
    );
  };

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalEarnings = earningsData?.total || 0;
  const totalEarned =
    earningsData?.earnings?.reduce(
      (sum: number, e: any) => sum + Number(e.earnedAmount),
      0,
    ) || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift className="h-6 w-6 text-purple-400" />
          Referral Commission Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Set join bonus and deposit commission per level
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Earnings Paid",
            value: `৳${totalEarned.toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-400",
          },
          {
            label: "Total Transactions",
            value: totalEarnings,
            icon: TrendingUp,
            color: "text-blue-400",
          },
          {
            label: "Active Levels",
            value: configs.filter((c) => c.isActive).length,
            icon: ToggleRight,
            color: "text-purple-400",
          },
          {
            label: "Max Level",
            value: configs.length - 1,
            icon: Users,
            color: "text-orange-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-slate-400 text-xs">{stat.label}</span>
            </div>
            <p className="text-white font-bold text-xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Commission Config */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">
            Commission Levels
          </h2>
          <button
            onClick={() => saveConfigs()}
            disabled={isSaving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save All
          </button>
        </div>

        <div className="space-y-3">
          {configs.map((config) => {
            const meta = LEVEL_LABELS[config.level] || {
              label: `Level ${config.level}`,
              desc: `Level ${config.level} referral commission`,
            };

            return (
              <div
                key={config.level}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  config.isActive
                    ? "border-slate-600 bg-slate-700/30"
                    : "border-slate-700/50 bg-slate-800/30 opacity-60"
                }`}
              >
                {/* Level badge */}
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">
                    L{config.level}
                  </span>
                </div>

                {/* Label + desc */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{meta.label}</p>
                  <p className="text-slate-500 text-xs">{meta.desc}</p>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={config.commissionPct}
                      onChange={(e) => updatePct(config.level, e.target.value)}
                      disabled={!config.isActive}
                      className="w-24 bg-slate-900 border border-slate-600 focus:border-purple-500 outline-none text-white text-sm rounded-lg px-3 py-2 pr-8 disabled:opacity-40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      {config.level === 0 ? "৳" : "%"}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleActive(config.level)}
                  className="flex-shrink-0"
                  title={config.isActive ? "Disable" : "Enable"}
                >
                  {config.isActive ? (
                    <ToggleRight className="h-7 w-7 text-purple-400" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-slate-500" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-slate-500 text-xs mt-4 border-t border-slate-700 pt-3">
          💡 Level 0 = flat BDT join bonus &nbsp;|&nbsp; Level 1+ = % of deposit
          amount
        </p>
      </div>

      {/* Earnings History */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">
          Referral Earnings History
        </h2>

        {earningsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : earningsData?.earnings?.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No earnings yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left pb-3 font-medium">Referrer</th>
                    <th className="text-left pb-3 font-medium">From User</th>
                    <th className="text-center pb-3 font-medium">Level</th>
                    <th className="text-right pb-3 font-medium">Deposit</th>
                    <th className="text-right pb-3 font-medium">Rate</th>
                    <th className="text-right pb-3 font-medium">Earned</th>
                    <th className="text-right pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {earningsData?.earnings?.map((e: any) => (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="py-3 text-white">
                        {e.user?.name}
                        <span className="block text-slate-500 text-xs">
                          @{e.user?.username}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {e.fromUser?.name}
                        <span className="block text-slate-500 text-xs">
                          @{e.fromUser?.username}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                          L{e.level}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        ৳{Number(e.depositAmount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        {Number(e.commissionRate).toFixed(1)}%
                      </td>
                      <td className="py-3 text-right text-green-400 font-medium">
                        ৳{Number(e.earnedAmount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-slate-500 text-xs">
                        {new Date(e.createdAt).toLocaleDateString("en-BD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {earningsData?.total > 15 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  Total: {earningsData.total} records
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEarningsPage((p) => Math.max(1, p - 1))}
                    disabled={earningsPage === 1}
                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-400">
                    {earningsPage} / {Math.ceil(earningsData.total / 15)}
                  </span>
                  <button
                    onClick={() => setEarningsPage((p) => p + 1)}
                    disabled={
                      earningsPage >= Math.ceil(earningsData.total / 15)
                    }
                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
