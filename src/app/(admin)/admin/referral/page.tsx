/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DollarSign,
  Gift,
  Loader2,
  Plus,
  Save,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  ReferralLevelConfigInput,
  ReferralMilestoneInput,
  ReferralService,
} from "@/services/referral.service";

interface ReferralConfigResponse {
  id?: string;
  level: number;
  commissionPct?: number;
  depositCommissionPct?: number;
  signupBonus?: number;
  bonusAmount?: number;
  isActive: boolean;
}

interface ReferralSettingsResponse {
  configs?: ReferralConfigResponse[];
  monthlyLoginBonus?: {
    amount?: number;
    isActive?: boolean;
  };
  milestones?: ReferralMilestoneInput[];
}

interface ReferralFormState {
  configs: ReferralLevelConfigInput[];
  monthlyLoginBonus: {
    amount: number;
    isActive: boolean;
  };
  milestones: ReferralMilestoneInput[];
}

const LEVEL_META: Record<number, { label: string; desc: string }> = {
  0: {
    label: "Level 1",
    desc: "Signup bonus and deposit commission for direct referrals",
  },
  1: {
    label: "Level 2",
    desc: "Rewards for second-level referral activity",
  },
  2: {
    label: "Level 3",
    desc: "Rewards for third-level referral activity",
  },
  3: {
    label: "Level 4",
    desc: "Rewards for fourth-level referral activity",
  },
};

const DEFAULT_CONFIGS: ReferralLevelConfigInput[] = [
  { level: 0, signupBonus: 0, depositCommissionPct: 0, isActive: true },
  { level: 1, signupBonus: 0, depositCommissionPct: 0, isActive: true },
  { level: 2, signupBonus: 0, depositCommissionPct: 0, isActive: false },
  { level: 3, signupBonus: 0, depositCommissionPct: 0, isActive: false },
];

const DEFAULT_MONTHLY_LOGIN_BONUS = {
  amount: 0,
  isActive: false,
};

const DEFAULT_MILESTONE: ReferralMilestoneInput = {
  numberOfReferrals: 10,
  bonusAmount: 0,
};

const toAmount = (value: string) => Math.max(0, Number(value) || 0);

const toPct = (value: string) => Math.min(100, Math.max(0, Number(value) || 0));

const normalizeConfig = (
  config: Partial<ReferralConfigResponse> & { level: number; isActive?: boolean },
): ReferralLevelConfigInput => ({
  level: config.level,
  signupBonus: Math.max(
    0,
    Number(config.signupBonus ?? config.bonusAmount ?? 0) || 0,
  ),
  depositCommissionPct: Math.min(
    100,
    Math.max(
      0,
      Number(config.depositCommissionPct ?? config.commissionPct ?? 0) || 0,
    ),
  ),
  isActive: Boolean(config.isActive ?? false),
});

function getInitialState(data: any): ReferralFormState {
  if (Array.isArray(data)) {
    return {
      configs: DEFAULT_CONFIGS.map((def) => {
        const found = data.find((item: ReferralConfigResponse) => item.level === def.level);
        return found ? normalizeConfig(found) : def;
      }),
      monthlyLoginBonus: DEFAULT_MONTHLY_LOGIN_BONUS,
      milestones: [DEFAULT_MILESTONE],
    };
  }

  const settings = (data ?? {}) as ReferralSettingsResponse;

  return {
    configs: DEFAULT_CONFIGS.map((def) => {
      const found = settings.configs?.find((item) => item.level === def.level);
      return found ? normalizeConfig(found) : def;
    }),
    monthlyLoginBonus: {
      amount: Math.max(0, Number(settings.monthlyLoginBonus?.amount ?? 0) || 0),
      isActive: Boolean(settings.monthlyLoginBonus?.isActive ?? false),
    },
    milestones:
      settings.milestones && settings.milestones.length > 0
        ? settings.milestones.map((milestone) => ({
            numberOfReferrals: Math.max(
              0,
              Number(milestone.numberOfReferrals ?? 0) || 0,
            ),
            bonusAmount: Math.max(0, Number(milestone.bonusAmount ?? 0) || 0),
          }))
        : [DEFAULT_MILESTONE],
  };
}

export default function AdminReferralPage() {
  const queryClient = useQueryClient();
  const [configs, setConfigs] =
    useState<ReferralLevelConfigInput[]>(DEFAULT_CONFIGS);
  const [monthlyLoginBonus, setMonthlyLoginBonus] = useState(
    DEFAULT_MONTHLY_LOGIN_BONUS,
  );
  const [milestones, setMilestones] =
    useState<ReferralMilestoneInput[]>([DEFAULT_MILESTONE]);
  const [earningsPage, setEarningsPage] = useState(1);

  useQuery({
    queryKey: ["referral-config"],
    queryFn: async () => {
      const res = await ReferralService.getConfig();
      const initialState = getInitialState(res.data);
      setConfigs(initialState.configs);
      setMonthlyLoginBonus(initialState.monthlyLoginBonus);
      setMilestones(initialState.milestones);
      return res.data;
    },
  });

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["referral-earnings-admin", earningsPage],
    queryFn: async () => {
      const res = await ReferralService.getAllEarnings(earningsPage, 15);
      return res.data;
    },
  });

  const { mutate: saveConfigs, isPending: isSaving } = useMutation({
    mutationFn: () =>
      ReferralService.bulkUpdateConfig({
        configs,
        monthlyLoginBonus,
        milestones,
      }),
    onSuccess: () => {
      toast.success("Referral settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["referral-config"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to save settings"),
  });

  const updateLevelConfig = (
    level: number,
    field: "signupBonus" | "depositCommissionPct",
    value: string,
  ) => {
    setConfigs((prev) =>
      prev.map((config) =>
        config.level === level
          ? {
              ...config,
              [field]:
                field === "depositCommissionPct" ? toPct(value) : toAmount(value),
            }
          : config,
      ),
    );
  };

  const toggleLevelActive = (level: number) => {
    setConfigs((prev) =>
      prev.map((config) =>
        config.level === level
          ? { ...config, isActive: !config.isActive }
          : config,
      ),
    );
  };

  const updateMilestone = (
    index: number,
    field: keyof ReferralMilestoneInput,
    value: string,
  ) => {
    setMilestones((prev) =>
      prev.map((milestone, milestoneIndex) =>
        milestoneIndex === index
          ? {
              ...milestone,
              [field]:
                field === "numberOfReferrals" ? toAmount(value) : toAmount(value),
            }
          : milestone,
      ),
    );
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, DEFAULT_MILESTONE]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) =>
      prev.length === 1
        ? [{ ...DEFAULT_MILESTONE }]
        : prev.filter((_, milestoneIndex) => milestoneIndex !== index),
    );
  };

  const totalEarnings = earningsData?.total || 0;
  const totalEarned =
    earningsData?.earnings?.reduce(
      (sum: number, entry: any) => sum + Number(entry.earnedAmount),
      0,
    ) || 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Gift className="h-6 w-6 text-purple-400" />
          Referral Commission Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure level bonuses, monthly login rewards, and referral milestone
          payouts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            value: configs.filter((config) => config.isActive).length,
            icon: ToggleRight,
            color: "text-purple-400",
          },
          {
            label: "Max Level",
            value: configs.length,
            icon: Users,
            color: "text-orange-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
          >
            <div className="mb-1 flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Commission Levels</h2>
            <p className="text-sm text-slate-400">
              Each level includes a fixed signup bonus and a deposit commission.
            </p>
          </div>
          <button
            onClick={() => saveConfigs()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
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
            const meta = LEVEL_META[config.level] || {
              label: `Level ${config.level + 1}`,
              desc: `Referral rewards for level ${config.level + 1}`,
            };

            return (
              <div
                key={config.level}
                className={`rounded-lg border p-4 transition-colors ${
                  config.isActive
                    ? "border-slate-600 bg-slate-700/30"
                    : "border-slate-700/50 bg-slate-800/30 opacity-60"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-600/20">
                      <span className="text-sm font-bold text-purple-400">
                        L{config.level + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{meta.label}</p>
                      <p className="text-xs text-slate-500">{meta.desc}</p>
                    </div>
                  </div>

                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Signup Bonus</span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={config.signupBonus}
                          onChange={(e) =>
                            updateLevelConfig(config.level, "signupBonus", e.target.value)
                          }
                          disabled={!config.isActive}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 pr-10 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-40"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          BDT
                        </span>
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">
                        Deposit Commission
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={config.depositCommissionPct}
                          onChange={(e) =>
                            updateLevelConfig(
                              config.level,
                              "depositCommissionPct",
                              e.target.value,
                            )
                          }
                          disabled={!config.isActive}
                          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 pr-8 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-40"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          %
                        </span>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={() => toggleLevelActive(config.level)}
                    className="flex-shrink-0 self-end lg:self-auto"
                    title={config.isActive ? "Disable" : "Enable"}
                  >
                    {config.isActive ? (
                      <ToggleRight className="h-7 w-7 text-purple-400" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Monthly Login Bonus</h2>
            <p className="text-sm text-slate-400">
              Reward users for monthly login activity with a fixed BDT amount.
            </p>
          </div>
          <button
            onClick={() =>
              setMonthlyLoginBonus((prev) => ({
                ...prev,
                isActive: !prev.isActive,
              }))
            }
            title={monthlyLoginBonus.isActive ? "Disable" : "Enable"}
          >
            {monthlyLoginBonus.isActive ? (
              <ToggleRight className="h-7 w-7 text-purple-400" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-slate-500" />
            )}
          </button>
        </div>

        <label className="space-y-1">
          <span className="text-xs text-slate-400">Amount</span>
          <div className="relative max-w-xs">
            <input
              type="number"
              min={0}
              step={1}
              value={monthlyLoginBonus.amount}
              onChange={(e) =>
                setMonthlyLoginBonus((prev) => ({
                  ...prev,
                  amount: toAmount(e.target.value),
                }))
              }
              disabled={!monthlyLoginBonus.isActive}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 pr-10 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              BDT
            </span>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Trophy className="h-5 w-5 text-amber-400" />
              Referral Milestone Rewards
            </h2>
            <p className="text-sm text-slate-400">
              Add bonus payouts that unlock after a target number of referrals.
            </p>
          </div>
          <button
            onClick={addMilestone}
            className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:border-purple-500"
          >
            <Plus className="h-4 w-4" />
            Add More
          </button>
        </div>

        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div
              key={`${index}-${milestone.numberOfReferrals}-${milestone.bonusAmount}`}
              className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <label className="space-y-1">
                <span className="text-xs text-slate-400">Number of Referrals</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={milestone.numberOfReferrals}
                  onChange={(e) =>
                    updateMilestone(index, "numberOfReferrals", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-slate-400">Bonus Amount</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={milestone.bonusAmount}
                    onChange={(e) =>
                      updateMilestone(index, "bonusAmount", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 pr-10 text-sm text-white outline-none focus:border-purple-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    BDT
                  </span>
                </div>
              </label>

              <div className="flex items-end justify-end">
                <button
                  onClick={() => removeMilestone(index)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-red-500 hover:text-red-400"
                  title="Remove milestone"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Referral Earnings History
        </h2>

        {earningsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : earningsData?.earnings?.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No earnings yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="pb-3 text-left font-medium">Referrer</th>
                    <th className="pb-3 text-left font-medium">From User</th>
                    <th className="pb-3 text-center font-medium">Level</th>
                    <th className="pb-3 text-right font-medium">Deposit</th>
                    <th className="pb-3 text-right font-medium">Rate</th>
                    <th className="pb-3 text-right font-medium">Earned</th>
                    <th className="pb-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {earningsData?.earnings?.map((entry: any) => (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-slate-700/20"
                    >
                      <td className="py-3 text-white">
                        {entry.user?.username ?? "-"}
                      </td>
                      <td className="py-3 text-slate-300">
                        {entry.fromUser?.username ?? "-"}
                      </td>
                      <td className="py-3 text-center">
                        <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-xs text-purple-400">
                          L{Number(entry.level) + 1}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        ৳{Number(entry.depositAmount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-slate-300">
                        {Number(entry.commissionRate).toFixed(1)}%
                      </td>
                      <td className="py-3 text-right font-medium text-green-400">
                        ৳{Number(entry.earnedAmount).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString("en-BD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {earningsData?.total > 15 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400">
                  Total: {earningsData.total} records
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEarningsPage((page) => Math.max(1, page - 1))}
                    disabled={earningsPage === 1}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-600 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-400">
                    {earningsPage} / {Math.ceil(earningsData.total / 15)}
                  </span>
                  <button
                    onClick={() => setEarningsPage((page) => page + 1)}
                    disabled={earningsPage >= Math.ceil(earningsData.total / 15)}
                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-600 disabled:opacity-40"
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
