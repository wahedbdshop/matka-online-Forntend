/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dices,
  Activity,
  Trophy,
  TrendingUp,
  ArrowRight,
  Power,
  Percent,
  Clock,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { LudoAdminService } from "@/services/ludoAdmin.service";
import { AdminService } from "@/services/admin.service";
import { getLudoConfig } from "@/lib/ludo-settings";
import { cn } from "@/lib/utils";

const ALL_STAKES = [250, 500, 1000, 2000];

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  href?: string;
}) {
  const border: Record<string, string> = {
    blue: "border-blue-500/20",
    green: "border-emerald-500/20",
    purple: "border-purple-500/20",
    yellow: "border-yellow-500/20",
    red: "border-red-500/20",
  };
  const iconCls: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-400",
    green: "bg-emerald-500/15 text-emerald-400",
    purple: "bg-purple-500/15 text-purple-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red: "bg-red-500/15 text-red-400",
  };

  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-slate-800/50 p-4 transition-all duration-200",
        href ? "hover:border-slate-500 hover:bg-slate-800 cursor-pointer" : "",
        border[color],
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", iconCls[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
          <span>View all</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function LudoAdminPage() {
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["ludo-admin-stats"],
    queryFn: LudoAdminService.getStats,
  });

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ["ludo-admin-settings"],
    queryFn: LudoAdminService.getSettings,
  });

  const { data: matchesData, isLoading: loadingMatches } = useQuery({
    queryKey: ["ludo-admin-matches-recent"],
    queryFn: () => LudoAdminService.getMatches({ limit: 8 }),
  });

  const { mutate: updateSettings, isPending: saving } = useMutation({
    mutationFn: LudoAdminService.updateSettings,
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["ludo-admin-settings"] });
    },
    onError: () => toast.error("Failed to update settings"),
  });

  const settings = settingsData?.data ?? {};
  const stats = statsData?.data ?? {};
  const matches: any[] = Array.isArray(matchesData?.data?.matches)
    ? matchesData.data.matches
    : Array.isArray(matchesData?.data)
      ? matchesData.data
      : [];

  const { data: publicSettingsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: AdminService.getPublicSettings,
  });
  const { mutate: saveSetting, isPending: savingBanner } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      AdminService.updateSetting(key, value),
    onSuccess: () => {
      toast.success("Banner updated");
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to update banner"),
  });

  const publicSettings = publicSettingsData?.data ?? [];
  const bannerConfig = getLudoConfig(publicSettings);
  const isFreeMode = Boolean(
    settings.isFreeMode ?? settings.freeMode ?? bannerConfig.freeMode,
  );

  const [bannerImageInput, setBannerImageInput] = useState("");
  const [bannerTitleInput, setBannerTitleInput] = useState("");
  const [bannerMessageInput, setBannerMessageInput] = useState("");

  const [commissionInput, setCommissionInput] = useState<string>("");
  const [queueInput, setQueueInput] = useState<string>("");
  const [turnInput, setTurnInput] = useState<string>("");

  const { mutate: toggleFreeMode, isPending: savingFreeMode } = useMutation({
    mutationFn: async (nextValue: boolean) => {
      await AdminService.updateSetting(
        "ludo_free_mode",
        nextValue ? "true" : "false",
      );

      await LudoAdminService.updateSettings({
        isFreeMode: nextValue,
        freeMode: nextValue,
        ...(nextValue ? { commissionPct: 0 } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Free mode updated");
      queryClient.invalidateQueries({ queryKey: ["ludo-admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: () => toast.error("Failed to update free mode"),
  });

  const allowedStakes: number[] = Array.isArray(settings.allowedStakes)
    ? settings.allowedStakes
    : [];

  const toggleStake = (stake: number) => {
    const next = allowedStakes.includes(stake)
      ? allowedStakes.filter((s) => s !== stake)
      : [...allowedStakes, stake].sort((a, b) => a - b);
    updateSettings({ allowedStakes: next });
  };

  const isLoading = loadingStats || loadingSettings;

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColor: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-500/10",
    ACTIVE: "text-emerald-400 bg-emerald-500/10",
    FINISHED: "text-blue-400 bg-blue-500/10",
    CANCELLED: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Ludo Bet</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Admin overview, settings & match management
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Matches"
            value={stats.totalMatches ?? 0}
            icon={Dices}
            color="blue"
            href="/admin/ludo/matches"
          />
          <StatCard
            label="Active Rooms"
            value={stats.activeRooms ?? 0}
            icon={Activity}
            color="green"
          />
          <StatCard
            label="Today's Matches"
            value={stats.todayMatches ?? 0}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            label="Total Revenue"
            value={`৳${Number(stats.totalRevenue ?? 0).toLocaleString()}`}
            icon={Trophy}
            color="yellow"
          />
        </div>
      )}

      {/* Banner Settings */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Ludo Offline Banner</h2>
          <span className="ml-auto rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
            Shown when Ludo is OFF
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {/* Banner Image */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Banner Image URL
            </label>
            <div className="flex gap-2">
              <input
                value={bannerImageInput !== "" ? bannerImageInput : bannerConfig.bannerImage}
                onChange={(e) => setBannerImageInput(e.target.value)}
                placeholder="https://..."
                className="h-9 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
              />
              <button
                onClick={() => {
                  saveSetting({ key: "ludo_banner_image", value: bannerImageInput.trim() });
                  setBannerImageInput("");
                }}
                disabled={savingBanner || bannerImageInput.trim() === ""}
                className="rounded-lg bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {bannerConfig.bannerImage && (
              <p className="truncate text-[10px] text-slate-500">
                Current: {bannerConfig.bannerImage}
              </p>
            )}
          </div>

          {/* Banner Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Banner Title
            </label>
            <div className="flex gap-2">
              <input
                value={bannerTitleInput !== "" ? bannerTitleInput : bannerConfig.bannerTitle}
                onChange={(e) => setBannerTitleInput(e.target.value)}
                placeholder="Ludo Bet — Coming Soon"
                className="h-9 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
              />
              <button
                onClick={() => {
                  saveSetting({ key: "ludo_banner_title", value: bannerTitleInput.trim() });
                  setBannerTitleInput("");
                }}
                disabled={savingBanner || bannerTitleInput.trim() === ""}
                className="rounded-lg bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>

          {/* Banner Message */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Banner Message
            </label>
            <div className="flex gap-2">
              <input
                value={bannerMessageInput !== "" ? bannerMessageInput : bannerConfig.bannerMessage}
                onChange={(e) => setBannerMessageInput(e.target.value)}
                placeholder="We are preparing something amazing..."
                className="h-9 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
              />
              <button
                onClick={() => {
                  saveSetting({ key: "ludo_banner_message", value: bannerMessageInput.trim() });
                  setBannerMessageInput("");
                }}
                disabled={savingBanner || bannerMessageInput.trim() === ""}
                className="rounded-lg bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        {bannerConfig.bannerImage && (
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <img
              src={bannerConfig.bannerImage}
              alt="Banner preview"
              className="h-32 w-full object-cover"
            />
            <div className="bg-slate-900 px-3 py-2">
              <p className="text-xs font-bold text-white">{bannerConfig.bannerTitle}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{bannerConfig.bannerMessage}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Card */}
        <div className="space-y-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
          <h2 className="text-sm font-bold text-white">Game Settings</h2>

          {loadingSettings ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-700" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* On/Off Toggle */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors duration-300",
                  settings.isEnabled
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-red-500/40 bg-red-500/10",
                )}
              >
                <div className="flex items-center gap-2">
                  <Power
                    className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      settings.isEnabled ? "text-emerald-400" : "text-red-400",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Game Status</p>
                    <p className={cn("text-xs font-semibold", settings.isEnabled ? "text-emerald-400" : "text-slate-500")}>
                      {settings.isEnabled ? "ONLINE" : "OFFLINE"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updateSettings({ isEnabled: !settings.isEnabled })}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 disabled:opacity-50",
                    settings.isEnabled
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                      : "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      settings.isEnabled ? "bg-white animate-pulse" : "bg-white",
                    )}
                  />
                  {settings.isEnabled ? "Turn OFF" : "Turn ON"}
                </button>
              </div>

              {/* Free Mode Toggle */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors duration-300",
                  isFreeMode
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : "border-slate-700 bg-slate-900/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <Gift
                    className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      isFreeMode ? "text-cyan-300" : "text-slate-400",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Free Mode</p>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        isFreeMode ? "text-cyan-300" : "text-slate-500",
                      )}
                    >
                      {isFreeMode
                        ? "Users only see Free Play"
                        : "Users see stake options"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFreeMode(!isFreeMode)}
                  disabled={saving || savingFreeMode}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 disabled:opacity-50",
                    isFreeMode
                      ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400"
                      : "bg-slate-700 text-slate-200 hover:bg-slate-600",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isFreeMode ? "bg-slate-950 animate-pulse" : "bg-slate-400",
                    )}
                  />
                  {isFreeMode ? "Free ON" : "Free OFF"}
                </button>
              </div>

              {/* Allowed Stakes */}
              <div
                className={cn(
                  "rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-2",
                  isFreeMode && "opacity-50",
                )}
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Allowed Stakes (৳)
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_STAKES.map((stake) => {
                    const active = allowedStakes.includes(stake);
                    return (
                      <button
                        key={stake}
                        onClick={() => toggleStake(stake)}
                        disabled={saving || isFreeMode}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all",
                          active
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-600 bg-slate-800 text-slate-400",
                        )}
                      >
                        {active ? (
                          <CheckSquare className="h-3.5 w-3.5" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                        ৳{stake}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission */}
              <div
                className={cn(
                  "rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-2",
                  isFreeMode && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Commission %
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={commissionInput !== "" ? commissionInput : (settings.commissionPct ?? "")}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    placeholder={String(settings.commissionPct ?? 10)}
                    disabled={isFreeMode}
                    className="h-9 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      const v = Number(commissionInput);
                      if (isNaN(v) || v < 0 || v > 50) {
                        toast.error("Enter 0–50");
                        return;
                      }
                      updateSettings({ commissionPct: v });
                      setCommissionInput("");
                    }}
                    disabled={saving || isFreeMode || commissionInput === ""}
                    className="rounded-lg bg-purple-600 px-4 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Queue & Turn Timeout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Queue Timeout (min)
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={queueInput !== "" ? queueInput : (settings.queueTimeoutMin ?? "")}
                      onChange={(e) => setQueueInput(e.target.value)}
                      placeholder={String(settings.queueTimeoutMin ?? 5)}
                      className="h-8 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => {
                        const v = Number(queueInput);
                        if (!v || v < 1) return;
                        updateSettings({ queueTimeoutMin: v });
                        setQueueInput("");
                      }}
                      disabled={saving || queueInput === ""}
                      className="rounded-lg bg-purple-600 px-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Turn Timeout (sec)
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={5}
                      value={turnInput !== "" ? turnInput : (settings.turnTimeoutSec ?? "")}
                      onChange={(e) => setTurnInput(e.target.value)}
                      placeholder={String(settings.turnTimeoutSec ?? 30)}
                      className="h-8 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => {
                        const v = Number(turnInput);
                        if (!v || v < 5) return;
                        updateSettings({ turnTimeoutSec: v });
                        setTurnInput("");
                      }}
                      disabled={saving || turnInput === ""}
                      className="rounded-lg bg-purple-600 px-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Matches */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Recent Matches</h2>
            <Link
              href="/admin/ludo/matches"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingMatches ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-700" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              No matches yet
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      ৳{Number(m.stakeAmount).toLocaleString()} stake
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      statusColor[m.status] ?? "text-slate-400 bg-slate-700",
                    )}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
