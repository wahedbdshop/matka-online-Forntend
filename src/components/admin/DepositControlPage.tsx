/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock3,
  MessageSquareWarning,
  Power,
  Save,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import {
  formatScheduleDaysSummary,
  getNextScheduledOpenIso,
  isFeatureEnabledBySchedule,
  isScheduleConfigured,
  normalizeScheduleTimeValue,
  parseScheduleDaysValue,
  stringifyScheduleDaysValue,
  WEEKDAY_OPTIONS,
} from "@/lib/feature-schedule";

const SETTINGS = {
  manualToggle: "global_deposit",
  message: "global_deposit_message",
  manualOpenTime: "global_deposit_open_time",
  autoMode: "global_deposit_auto_mode",
  autoDays: "global_deposit_auto_days",
  autoOpenTime: "global_deposit_auto_open_time",
  autoCloseTime: "global_deposit_auto_close_time",
} as const;

const DEFAULT_MESSAGE =
  "Deposit is currently unavailable. Please try again later.";

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 ${
        checked
          ? "bg-purple-500 border-transparent shadow-[0_0_8px_rgba(0,0,0,0.3)]"
          : "bg-slate-700 border-slate-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function DepositControlPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["global-settings"],
    queryFn: () => AdminService.getSettings("global"),
  });

  const settings = data?.data ?? [];
  const getSetting = (key: string) =>
    settings.find((item: any) => item.key === key)?.value ?? "";

  const savedMessage = getSetting(SETTINGS.message) || DEFAULT_MESSAGE;
  const savedManualOpenTime = getSetting(SETTINGS.manualOpenTime);
  const savedAutoOpenTime = normalizeScheduleTimeValue(
    getSetting(SETTINGS.autoOpenTime),
  );
  const savedAutoCloseTime = normalizeScheduleTimeValue(
    getSetting(SETTINGS.autoCloseTime),
  );
  const savedAutoDaysValue = getSetting(SETTINGS.autoDays);
  const savedAutoDays = useMemo(
    () => parseScheduleDaysValue(savedAutoDaysValue),
    [savedAutoDaysValue],
  );
  const manualEnabled = getSetting(SETTINGS.manualToggle) !== "false";
  const autoModeEnabled = getSetting(SETTINGS.autoMode) === "true";

  return (
    <DepositControlForm
      key={[
        manualEnabled ? "1" : "0",
        autoModeEnabled ? "1" : "0",
        savedMessage,
        savedManualOpenTime,
        savedAutoOpenTime,
        savedAutoCloseTime,
        savedAutoDaysValue,
      ].join("|")}
      queryClient={queryClient}
      manualEnabled={manualEnabled}
      autoModeEnabled={autoModeEnabled}
      savedMessage={savedMessage}
      savedManualOpenTime={savedManualOpenTime}
      savedAutoOpenTime={savedAutoOpenTime}
      savedAutoCloseTime={savedAutoCloseTime}
      savedAutoDays={savedAutoDays}
    />
  );
}

function DepositControlForm({
  queryClient,
  manualEnabled,
  autoModeEnabled,
  savedMessage,
  savedManualOpenTime,
  savedAutoOpenTime,
  savedAutoCloseTime,
  savedAutoDays,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  manualEnabled: boolean;
  autoModeEnabled: boolean;
  savedMessage: string;
  savedManualOpenTime: string;
  savedAutoOpenTime: string;
  savedAutoCloseTime: string;
  savedAutoDays: number[];
}) {
  const [message, setMessage] = useState(savedMessage);
  const [manualOpenTime, setManualOpenTime] = useState(savedManualOpenTime);
  const [autoOpenTime, setAutoOpenTime] = useState(savedAutoOpenTime);
  const [autoCloseTime, setAutoCloseTime] = useState(savedAutoCloseTime);
  const [selectedDays, setSelectedDays] = useState<number[]>(savedAutoDays);

  const draftMessage = message;
  const draftManualOpenTime = manualOpenTime;
  const draftAutoOpenTime = autoOpenTime;
  const draftAutoCloseTime = autoCloseTime;
  const draftAutoDays = selectedDays;

  const autoScheduleConfigured = isScheduleConfigured(
    draftAutoOpenTime,
    draftAutoCloseTime,
  );
  const autoScheduleActive = isFeatureEnabledBySchedule({
    enabled: autoModeEnabled,
    openTime: draftAutoOpenTime,
    closeTime: draftAutoCloseTime,
    selectedDays: draftAutoDays,
  });
  const nextAutoOpenIso = getNextScheduledOpenIso({
    enabled: autoModeEnabled,
    openTime: draftAutoOpenTime,
    closeTime: draftAutoCloseTime,
    selectedDays: draftAutoDays,
  });

  const effectiveEnabled = autoModeEnabled ? autoScheduleActive : manualEnabled;
  const effectiveModeLabel = autoModeEnabled ? "Auto Schedule" : "Manual";

  const statusText = useMemo(() => {
    if (!autoModeEnabled) {
      return manualEnabled
        ? "Deposits are live because manual mode is enabled."
        : "Deposits are closed because manual mode is disabled.";
    }

    if (!autoScheduleConfigured) {
      return "Auto mode is on, but schedule is incomplete. Add open and close times.";
    }

    return autoScheduleActive
      ? "Deposits are currently open from the auto schedule."
      : "Deposits are currently closed by the auto schedule.";
  }, [autoModeEnabled, autoScheduleActive, autoScheduleConfigured, manualEnabled]);

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ["global-settings"] });
    queryClient.invalidateQueries({ queryKey: ["public-settings"] });
  };

  const { mutate: toggleManual } = useMutation({
    mutationFn: (value: boolean) =>
      AdminService.setGlobalToggle(SETTINGS.manualToggle, value),
    onSuccess: () => {
      toast.success("Manual deposit control updated");
      invalidateSettings();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update"),
  });

  const { mutate: toggleAutoMode } = useMutation({
    mutationFn: (value: string) =>
      AdminService.updateSetting(SETTINGS.autoMode, value),
    onSuccess: () => {
      toast.success("Auto schedule mode updated");
      invalidateSettings();
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to update"),
  });

  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const finalMessage = draftMessage.trim();
      if (!finalMessage) {
        throw new Error("Message is required");
      }

      if ((draftAutoOpenTime && !draftAutoCloseTime) || (!draftAutoOpenTime && draftAutoCloseTime)) {
        throw new Error("Set both auto open and close times");
      }

      await Promise.all([
        AdminService.updateSetting(SETTINGS.message, finalMessage),
        AdminService.updateSetting(SETTINGS.manualOpenTime, draftManualOpenTime),
        AdminService.updateSetting(SETTINGS.autoDays, stringifyScheduleDaysValue(draftAutoDays)),
        AdminService.updateSetting(
          SETTINGS.autoOpenTime,
          normalizeScheduleTimeValue(draftAutoOpenTime),
        ),
        AdminService.updateSetting(
          SETTINGS.autoCloseTime,
          normalizeScheduleTimeValue(draftAutoCloseTime),
        ),
      ]);
    },
    onSuccess: () => {
      toast.success("Deposit controls saved");
      invalidateSettings();
    },
    onError: (error: any) =>
      toast.error(error?.message || error?.response?.data?.message || "Failed to save"),
  });

  const toggleDay = (day: number) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((item) => item !== day)
      : [...selectedDays, day].sort((a, b) => a - b);

    setSelectedDays(nextDays);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-white">Deposit Controls</h1>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                effectiveEnabled
                  ? "border-purple-500/20 bg-purple-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >
              <Power
                className={`h-5 w-5 ${effectiveEnabled ? "text-purple-400" : "text-red-400"}`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Deposit Status</p>
              <p
                className={`mt-0.5 text-xs ${effectiveEnabled ? "text-green-400" : "text-red-400"}`}
              >
                {effectiveEnabled ? "Enabled" : "Disabled"} via {effectiveModeLabel}
              </p>
            </div>
          </div>

          <div className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            Mode: {autoModeEnabled ? "Auto Schedule" : "Manual"}
          </div>
        </div>

        <p className="border-t border-slate-700 pt-3 text-xs text-slate-400">
          {statusText}
        </p>

        {autoModeEnabled && nextAutoOpenIso && !autoScheduleActive && (
          <p className="text-xs text-purple-300">
            Next auto open:{" "}
            {new Date(nextAutoOpenIso).toLocaleString("en-BD", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Manual Control</p>
              <p className="text-xs text-slate-400">
                Auto mode off thakle ei toggle diye deposit instantly on/off korte parben.
              </p>
            </div>
            <Toggle
              checked={manualEnabled}
              onClick={() => toggleManual(!manualEnabled)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] text-slate-400">
              <Clock3 className="mr-1 inline h-3 w-3" />
              Manual Open Time
              <span className="text-slate-500"> (optional countdown)</span>
            </label>
            <input
              type="datetime-local"
              value={manualOpenTime}
              onChange={(event) => setManualOpenTime(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Auto Schedule</p>
              <p className="text-xs text-slate-400">
                Bangladesh time dhore selected day-gulate fixed time-e deposit open/close hobe.
              </p>
            </div>
            <Toggle
              checked={autoModeEnabled}
              onClick={() => toggleAutoMode(autoModeEnabled ? "false" : "true")}
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
            Schedule days: {formatScheduleDaysSummary(draftAutoDays)}
          </div>

          <div>
            <label className="mb-2 block text-[11px] text-slate-400">
              <CalendarClock className="mr-1 inline h-3 w-3" />
              Active Days
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const active = draftAutoDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
                        : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-400">
                Auto Open Time
              </label>
              <input
                type="time"
                value={autoOpenTime}
                onChange={(event) => setAutoOpenTime(event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] text-slate-400">
                Auto Close Time
              </label>
              <input
                type="time"
                value={autoCloseTime}
                onChange={(event) => setAutoCloseTime(event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Time inputs always follow Bangladesh time. Close time open time-r cheye chhoto hole overnight schedule hishebe dhora hobe.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="h-4 w-4 text-purple-400" />
          <p className="text-sm font-semibold text-purple-300">
            Offline Message Settings
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Deposit off thakle user ei message dekhbe. Manual aar auto dui mode-r jonnoi same message use hobe.
        </p>

        <div>
          <label className="mb-1.5 block text-[11px] text-slate-400">
            Message Shown To Users *
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={DEFAULT_MESSAGE}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500 placeholder:text-slate-500"
          />
        </div>

        <div className="rounded-lg border border-slate-600 bg-slate-900 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Preview
          </p>
          <p className="text-sm text-slate-300">{draftMessage}</p>
          {autoModeEnabled && autoScheduleConfigured && (
            <p className="text-[11px] text-purple-300">
              Auto window: {formatScheduleDaysSummary(draftAutoDays)} | {draftAutoOpenTime} - {draftAutoCloseTime} (BD)
            </p>
          )}
          {!autoModeEnabled && draftManualOpenTime && (
            <p className="text-[11px] text-purple-300">
              Manual countdown to:{" "}
              {new Date(draftManualOpenTime).toLocaleString("en-BD", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => saveSettings()}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save Deposit Controls"}
        </button>
      </div>
    </div>
  );
}
