/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, MessageSquareWarning, Clock4, Power } from "lucide-react";
import { AdminService } from "@/services/admin.service";

type Feature = "deposit" | "withdraw" | "transfer";

const CONFIG: Record<
  Feature,
  {
    title: string;
    toggleKey: string;
    msgKey: string;
    timeKey: string;
    color: string;
    placeholder: string;
  }
> = {
  deposit: {
    title: "Deposit Controls",
    toggleKey: "global_deposit",
    msgKey: "global_deposit_message",
    timeKey: "global_deposit_open_time",
    color: "purple",
    placeholder:
      "e.g. Deposits are temporarily unavailable for maintenance and will reopen soon.",
  },
  withdraw: {
    title: "Withdrawal Controls",
    toggleKey: "global_withdraw",
    msgKey: "global_withdraw_message",
    timeKey: "global_withdraw_open_time",
    color: "orange",
    placeholder:
      "e.g. Withdrawals are temporarily unavailable and will reopen shortly.",
  },
  transfer: {
    title: "Transfer Controls",
    toggleKey: "global_transfer",
    msgKey: "global_transfer_message",
    timeKey: "global_transfer_open_time",
    color: "blue",
    placeholder: "e.g. Transfers are temporarily disabled at the moment.",
  },
};

const COLORS: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    focus: string;
    btn: string;
    toggleOn: string;
  }
> = {
  purple: {
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
    text: "text-purple-400",
    focus: "focus:border-purple-500",
    btn: "bg-purple-600 hover:bg-purple-700",
    toggleOn: "bg-purple-500",
  },
  orange: {
    border: "border-orange-500/20",
    bg: "bg-orange-500/5",
    text: "text-orange-400",
    focus: "focus:border-orange-500",
    btn: "bg-orange-600 hover:bg-orange-700",
    toggleOn: "bg-orange-500",
  },
  blue: {
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    text: "text-blue-400",
    focus: "focus:border-blue-500",
    btn: "bg-blue-600 hover:bg-blue-700",
    toggleOn: "bg-blue-500",
  },
};

export function FeatureControlPage({ feature }: { feature: Feature }) {
  const cfg = CONFIG[feature];
  const colors = COLORS[cfg.color];
  const queryClient = useQueryClient();

  const [msg, setMsg] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["global-settings"],
    queryFn: () => AdminService.getSettings("global"),
  });

  const settings = data?.data ?? [];
  const getSetting = (key: string) =>
    settings.find((s: any) => s.key === key)?.value ?? "";

  const isOn = getSetting(cfg.toggleKey) !== "false";
  const savedMsg = getSetting(cfg.msgKey);
  const savedTime = getSetting(cfg.timeKey);
  const previewMsg = msg || savedMsg;
  const previewTime = time || savedTime;

  const { mutate: toggle } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) =>
      AdminService.setGlobalToggle(key, value),
    onSuccess: () => {
      toast.success("Updated");
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: updateSetting } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      AdminService.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const saveMessage = () => {
    const finalMsg = msg || savedMsg;
    if (!finalMsg.trim()) return toast.error("Message is required");
    setSaving(true);
    updateSetting(
      { key: cfg.msgKey, value: finalMsg },
      {
        onSettled: () => {
          updateSetting(
            { key: cfg.timeKey, value: time || savedTime },
            {
              onSuccess: () => {
                toast.success("Saved");
                setSaving(false);
              },
              onError: () => setSaving(false),
            },
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-white">{cfg.title}</h1>

      {/* ── Toggle Card ── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isOn
                  ? `${colors.bg} ${colors.border}`
                  : "bg-red-500/10 border-red-500/20"
              }`}
            >
              <Power
                className={`h-5 w-5 ${isOn ? colors.text : "text-red-400"}`}
              />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{cfg.title}</p>
              <p
                className={`text-xs mt-0.5 ${isOn ? "text-green-400" : "text-red-400"}`}
              >
                {isOn ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>

          <button
            onClick={() => toggle({ key: cfg.toggleKey, value: !isOn })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 ${
              isOn
                ? `${colors.toggleOn} border-transparent shadow-[0_0_8px_rgba(0,0,0,0.3)]`
                : "bg-slate-700 border-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                isOn ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-slate-400 border-t border-slate-700 pt-3">
          {isOn
            ? `${cfg.title} are currently enabled for all users. Use the toggle to disable them.`
            : `${cfg.title} are currently disabled for all users. Use the toggle to enable them.`}
        </p>
      </div>

      {/* Offline Message Card */}
      <div
        className={`rounded-xl border ${colors.border} ${colors.bg} p-5 space-y-4`}
      >
        <div className="flex items-center gap-2">
          <MessageSquareWarning className={`h-4 w-4 ${colors.text}`} />
          <p className={`text-sm font-semibold ${colors.text}`}>
            Offline Message Settings
          </p>
        </div>

        <p className="text-xs text-slate-400">
          When {feature} is disabled, users will see this message. Set it up in
          advance so it is ready whenever you turn the feature off.
        </p>

        {/* Message */}
        <div>
          <label className="text-[11px] text-slate-400 mb-1.5 block">
            Message Shown To Users *
          </label>
          <textarea
            key={savedMsg}
            defaultValue={savedMsg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder={cfg.placeholder}
            rows={3}
            className={`w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none ${colors.focus} placeholder:text-slate-500 resize-none`}
          />
        </div>

        {/* Open Time */}
        <div>
          <label className="text-[11px] text-slate-400 mb-1.5 block">
            <Clock4 className="inline h-3 w-3 mr-1" />
            Open Time{" "}
            <span className="text-slate-500">
              (optional - shows a countdown)
            </span>
          </label>
          <input
            key={savedTime}
            type="datetime-local"
            defaultValue={savedTime}
            onChange={(e) => setTime(e.target.value)}
            className={`w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none ${colors.focus}`}
          />
          <p className="text-[10px] text-slate-500 mt-1">
            If you set an open time, users will see a countdown timer.
          </p>
        </div>

        {/* Preview */}
        {previewMsg && (
          <div className="rounded-lg border border-slate-600 bg-slate-900 p-3 space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              Preview:
            </p>
            <p className="text-sm text-slate-300">{previewMsg}</p>
            {previewTime && (
              <p className={`text-[10px] ${colors.text}`}>
                + Countdown to:{" "}
                {new Date(previewTime).toLocaleString("en-BD", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            {!previewTime && (
              <p className="text-[10px] text-slate-600">
                If no open time is set, no countdown will be shown.
              </p>
            )}
          </div>
        )}

        <button
          onClick={saveMessage}
          disabled={saving}
          className={`flex items-center gap-2 rounded-lg ${colors.btn} disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors`}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save Message"}
        </button>
      </div>
    </div>
  );
}
