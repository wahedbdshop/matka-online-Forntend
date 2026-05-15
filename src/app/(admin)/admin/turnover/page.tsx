"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";

type TurnoverFormState = {
  mainEnabled: boolean;
  mainPercent: string;
  bonusEnabled: boolean;
  bonusPercent: string;
  winContributionEnabled: boolean;
  winContributionPercent: string;
  autoCompleteEnabled: boolean;
  autoCompleteHours: string;
};

const DEFAULT_FORM: TurnoverFormState = {
  mainEnabled: true,
  mainPercent: "100",
  bonusEnabled: true,
  bonusPercent: "100",
  winContributionEnabled: false,
  winContributionPercent: "50",
  autoCompleteEnabled: false,
  autoCompleteHours: "24",
};

const toSettingMap = (items: Array<{ key: string; value: string }>) =>
  new Map(items.map((item) => [item.key, item.value]));

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "off") {
    return false;
  }
  return fallback;
};

const parsePercent = (value: string | undefined, fallback: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(100, Math.max(0, parsed)));
};

const parseBoundNumber = (
  value: string | undefined,
  fallback: string,
  min: number,
  max: number,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(max, Math.max(min, parsed)));
};

const formatTurnover = (enabled: boolean, percent: number, amount: number) => {
  if (!enabled) return 0;
  return Number(((amount * percent) / 100).toFixed(2));
};

export default function AdminTurnoverPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TurnoverFormState>(DEFAULT_FORM);
  const [depositExample, setDepositExample] = useState("1000");
  const [bonusExample, setBonusExample] = useState("100");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-settings", "turnover"],
    queryFn: () => AdminService.getSettings("turnover"),
  });

  useEffect(() => {
    const items = data?.data ?? [];
    const settings = toSettingMap(items);

    setForm({
      mainEnabled: parseBoolean(
        settings.get("turnover_main_enabled"),
        DEFAULT_FORM.mainEnabled,
      ),
      mainPercent: parsePercent(
        settings.get("turnover_main_percent"),
        DEFAULT_FORM.mainPercent,
      ),
      bonusEnabled: parseBoolean(
        settings.get("turnover_bonus_enabled"),
        DEFAULT_FORM.bonusEnabled,
      ),
      bonusPercent: parsePercent(
        settings.get("turnover_bonus_percent"),
        DEFAULT_FORM.bonusPercent,
      ),
      winContributionEnabled: parseBoolean(
        settings.get("turnover_win_contribution_enabled"),
        DEFAULT_FORM.winContributionEnabled,
      ),
      winContributionPercent: parsePercent(
        settings.get("turnover_win_contribution_percent"),
        DEFAULT_FORM.winContributionPercent,
      ),
      autoCompleteEnabled: parseBoolean(
        settings.get("turnover_auto_complete_enabled"),
        DEFAULT_FORM.autoCompleteEnabled,
      ),
      autoCompleteHours: parseBoundNumber(
        settings.get("turnover_auto_complete_hours"),
        DEFAULT_FORM.autoCompleteHours,
        1,
        168,
      ),
    });
  }, [data]);

  const { mutateAsync: saveSetting, isPending: isSaving } = useMutation({
    mutationFn: async (payload: { key: string; value: string }) => {
      return AdminService.updateSetting(payload.key, payload.value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save setting");
    },
  });

  const depositAmount = Number(depositExample) || 0;
  const bonusAmount = Number(bonusExample) || 0;
  const mainPercent = Number(form.mainPercent) || 0;
  const bonusPercent = Number(form.bonusPercent) || 0;
  const winContributionPercent = Number(form.winContributionPercent) || 0;
  const autoCompleteHours = Number(form.autoCompleteHours) || 0;

  const preview = useMemo(
    () => ({
      mainTurnover: formatTurnover(form.mainEnabled, mainPercent, depositAmount),
      bonusTurnover: formatTurnover(
        form.bonusEnabled,
        bonusPercent,
        bonusAmount,
      ),
      winContribution: form.winContributionEnabled
        ? Number(
            (
              ((depositAmount + bonusAmount) * winContributionPercent) /
              100
            ).toFixed(2),
          )
        : 0,
    }),
    [
      bonusAmount,
      bonusPercent,
      depositAmount,
      form.bonusEnabled,
      form.mainEnabled,
      form.winContributionEnabled,
      mainPercent,
      winContributionPercent,
    ],
  );

  const persistSetting = async (
    key: string,
    value: string,
    successMessage: string,
  ) => {
    setSavingKey(key);
    try {
      await saveSetting({ key, value });
      toast.success(successMessage);
    } finally {
      setSavingKey(null);
    }
  };

  const handleBooleanSettingSave = async (
    field:
      | "mainEnabled"
      | "bonusEnabled"
      | "winContributionEnabled"
      | "autoCompleteEnabled",
    key: string,
    label: string,
  ) => {
    const nextValue = !form[field];
    setForm((prev) => ({ ...prev, [field]: nextValue }));

    try {
      await persistSetting(
        key,
        String(nextValue),
        `${label} ${nextValue ? "enabled" : "disabled"}`,
      );
    } catch {
      setForm((prev) => ({ ...prev, [field]: !nextValue }));
    }
  };

  const handleNumberSettingSave = async (
    field:
      | "mainPercent"
      | "bonusPercent"
      | "winContributionPercent"
      | "autoCompleteHours",
    label: string,
    key: string,
    options?: {
      min?: number;
      max?: number;
    },
  ) => {
    const rawValue = Number(form[field]);
    const min = options?.min ?? 0;
    const max = options?.max ?? 100;

    if (!Number.isFinite(rawValue) || rawValue < min || rawValue > max) {
      toast.error(`${label} must be between ${min} and ${max}`);
      return;
    }

    const normalized = String(rawValue);
    if (normalized !== form[field]) {
      setForm((prev) => ({ ...prev, [field]: normalized }));
    }

    await persistSetting(key, normalized, `${label} saved`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Turnover Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Control deposit and bonus turnover percentages from the admin panel.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Main Turnover</p>
              <p className="text-xs text-slate-400">
                Choose what percentage of the deposit amount becomes turnover.
              </p>
            </div>
            <button
              onClick={() =>
                handleBooleanSettingSave(
                  "mainEnabled",
                  "turnover_main_enabled",
                  "Main turnover",
                )}
              disabled={isSaving}
              className={`relative mt-0.5 h-7 w-14 shrink-0 overflow-hidden rounded-full border transition-colors ${form.mainEnabled ? "border-emerald-500/40 bg-emerald-600" : "border-slate-500 bg-slate-600"} ${isSaving ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white transition-transform ${form.mainEnabled ? "translate-x-7" : "translate-x-0"}`}
              />
              {savingKey === "turnover_main_enabled" ? (
                <Loader2 className="absolute left-1.5 top-1.5 h-4 w-4 animate-spin text-white" />
              ) : null}
            </button>
          </div>

          <label className="mb-2 block text-xs text-slate-400">
            Main turnover percent
          </label>
          <input
            type="number"
            min={0}
            max={100}
            disabled={isLoading}
            value={form.mainPercent}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, mainPercent: e.target.value }))
            }
            onBlur={() =>
              handleNumberSettingSave(
                "mainPercent",
                "Main turnover percent",
                "turnover_main_percent",
              )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Example: `50` means a `Rs 1000` deposit creates `Rs 500` turnover. `100` means full turnover.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Bonus Turnover</p>
              <p className="text-xs text-slate-400">
                Turn bonus turnover on or off and choose its percentage.
              </p>
            </div>
            <button
              onClick={() =>
                handleBooleanSettingSave(
                  "bonusEnabled",
                  "turnover_bonus_enabled",
                  "Bonus turnover",
                )}
              disabled={isSaving}
              className={`relative mt-0.5 h-7 w-14 shrink-0 overflow-hidden rounded-full border transition-colors ${form.bonusEnabled ? "border-blue-500/40 bg-blue-600" : "border-slate-500 bg-slate-600"} ${isSaving ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white transition-transform ${form.bonusEnabled ? "translate-x-7" : "translate-x-0"}`}
              />
              {savingKey === "turnover_bonus_enabled" ? (
                <Loader2 className="absolute left-1.5 top-1.5 h-4 w-4 animate-spin text-white" />
              ) : null}
            </button>
          </div>

          <label className="mb-2 block text-xs text-slate-400">
            Bonus turnover percent
          </label>
          <input
            type="number"
            min={0}
            max={100}
            disabled={isLoading}
            value={form.bonusPercent}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bonusPercent: e.target.value }))
            }
            onBlur={() =>
              handleNumberSettingSave(
                "bonusPercent",
                "Bonus turnover percent",
                "turnover_bonus_percent",
              )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Turn the switch off if you do not want bonus turnover.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Win Contribution</p>
              <p className="text-xs text-slate-400">
                Add a percentage of win amount toward turnover completion.
              </p>
            </div>
            <button
              onClick={() =>
                handleBooleanSettingSave(
                  "winContributionEnabled",
                  "turnover_win_contribution_enabled",
                  "Win contribution",
                )}
              disabled={isSaving}
              className={`relative mt-0.5 h-7 w-14 shrink-0 overflow-hidden rounded-full border transition-colors ${form.winContributionEnabled ? "border-cyan-500/40 bg-cyan-600" : "border-slate-500 bg-slate-600"} ${isSaving ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white transition-transform ${form.winContributionEnabled ? "translate-x-7" : "translate-x-0"}`}
              />
              {savingKey === "turnover_win_contribution_enabled" ? (
                <Loader2 className="absolute left-1.5 top-1.5 h-4 w-4 animate-spin text-white" />
              ) : null}
            </button>
          </div>

          <label className="mb-2 block text-xs text-slate-400">
            Win contribution percent
          </label>
          <input
            type="number"
            min={0}
            max={100}
            disabled={isLoading}
            value={form.winContributionPercent}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                winContributionPercent: e.target.value,
              }))
            }
            onBlur={() =>
              handleNumberSettingSave(
                "winContributionPercent",
                "Win contribution percent",
                "turnover_win_contribution_percent",
              )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Example: with `50%`, a `Rs 1000` win contributes `Rs 500` toward turnover completion.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Auto Complete</p>
              <p className="text-xs text-slate-400">
                Automatically complete active turnover after the configured number of hours.
              </p>
            </div>
            <button
              onClick={() =>
                handleBooleanSettingSave(
                  "autoCompleteEnabled",
                  "turnover_auto_complete_enabled",
                  "Auto complete",
                )}
              disabled={isSaving}
              className={`relative mt-0.5 h-7 w-14 shrink-0 overflow-hidden rounded-full border transition-colors ${form.autoCompleteEnabled ? "border-amber-500/40 bg-amber-500" : "border-slate-500 bg-slate-600"} ${isSaving ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5.5 w-5.5 rounded-full bg-white transition-transform ${form.autoCompleteEnabled ? "translate-x-7" : "translate-x-0"}`}
              />
              {savingKey === "turnover_auto_complete_enabled" ? (
                <Loader2 className="absolute left-1.5 top-1.5 h-4 w-4 animate-spin text-white" />
              ) : null}
            </button>
          </div>

          <label className="mb-2 block text-xs text-slate-400">
            Auto complete after hours
          </label>
          <input
            type="number"
            min={1}
            max={168}
            disabled={isLoading}
            value={form.autoCompleteHours}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                autoCompleteHours: e.target.value,
              }))
            }
            onBlur={() =>
              handleNumberSettingSave(
                "autoCompleteHours",
                "Auto complete hours",
                "turnover_auto_complete_hours",
                { min: 1, max: 168 },
              )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
          />
          <p className="mt-2 text-xs text-slate-500">
            Keep this disabled to preserve the old behavior. Default suggested value is `24` hours.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white">Live Preview</p>
          <p className="text-xs text-slate-400">
            Preview how much turnover will be created when a deposit is approved.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs text-slate-400">
              Example deposit amount
            </label>
            <input
              type="number"
              min={0}
              value={depositExample}
              onChange={(e) => setDepositExample(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-slate-400">
              Example bonus amount
            </label>
            <input
              type="number"
              min={0}
              value={bonusExample}
              onChange={(e) => setBonusExample(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-slate-400">Main turnover</p>
            <p className="mt-1 text-lg font-semibold text-emerald-400">
              Rs {preview.mainTurnover.toLocaleString("en-BD")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {form.mainEnabled ? `${mainPercent}% active` : "Off"}
            </p>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs text-slate-400">Bonus turnover</p>
            <p className="mt-1 text-lg font-semibold text-blue-400">
              Rs {preview.bonusTurnover.toLocaleString("en-BD")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {form.bonusEnabled ? `${bonusPercent}% active` : "Off"}
            </p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-xs text-slate-400">Win contribution</p>
            <p className="mt-1 text-lg font-semibold text-cyan-400">
              Rs {preview.winContribution.toLocaleString("en-BD")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {form.winContributionEnabled
                ? `${winContributionPercent}% of win amount`
                : "Off"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Total turnover</p>
            <p className="mt-1 text-lg font-semibold text-white">
              Rs{" "}
              {(preview.mainTurnover + preview.bonusTurnover).toLocaleString("en-BD")}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {form.autoCompleteEnabled
                ? `Auto completes after ${autoCompleteHours} hours`
                : "Withdrawal unlock target created on approval"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <p className="text-xs text-slate-400">
          Toggles save instantly. Percentage values save automatically when the input loses focus or when you press Enter.
        </p>
      </div>
    </div>
  );
}
