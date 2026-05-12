/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  Laptop,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Smartphone,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  getSessionCustomName,
  getSessionDeviceLabel,
  getSessionId,
  getSessionIpLabel,
  getSessionLastActive,
  getSessionLocationLabel,
  normalizeBoolean,
  normalizeSessionList,
  pickSessionValue,
} from "@/lib/admin-session-utils";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

function SessionInfoCard({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string;
  accent?: "slate" | "cyan" | "violet";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/5"
      : accent === "violet"
        ? "border-violet-500/20 bg-violet-500/5"
        : "border-slate-700/60 bg-slate-950/45";

  return (
    <div className={cn("rounded-2xl border px-4 py-3", accentClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-white">{value || "-"}</p>
    </div>
  );
}

function formatSessionDateTime(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-BD", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickFirstNumber(source: any, paths: string[]) {
  for (const path of paths) {
    const value = pickSessionValue(source, [path]);
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function SessionNameEditor({
  savedName,
  onSave,
  onClear,
  canEdit,
  isSaving,
}: {
  savedName: string;
  onSave: (value: string) => void;
  onClear: () => void;
  canEdit: boolean;
  isSaving: boolean;
}) {
  const [customName, setCustomName] = useState(savedName);

  return (
    <div className="mt-5 space-y-3">
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
          Custom Name
        </label>
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Example: Matkta Laptop"
          disabled={!canEdit || isSaving}
          className="h-11 rounded-2xl border-slate-700 bg-slate-950/70 text-sm text-white"
        />
      </div>

      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
        <p className="text-[11px] text-yellow-200/90">
          This name is now saved in the backend and stays after logout/login on this same device.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => onSave(customName)}
          disabled={!canEdit || isSaving}
          className="rounded-xl bg-violet-600 text-white hover:bg-violet-500"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save Name"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCustomName("");
            onClear();
          }}
          disabled={!canEdit || isSaving}
          className="rounded-xl border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Clear Name
        </Button>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <p className="text-[11px] leading-5 text-emerald-200/90">
            Only the currently logged-in device can save or clear its own name. Other devices cannot edit this label.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSessionDetailsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = decodeURIComponent(String(params?.sessionId ?? ""));
  const { canRunAdminQuery, isAuthReady } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: AdminService.getActiveSessions,
    enabled: canRunAdminQuery,
  });

  const sessions = normalizeSessionList(sessionsData);
  const session = useMemo(
    () => sessions.find((item) => getSessionId(item) === sessionId),
    [sessions, sessionId],
  );
  const savedCustomName = session ? getSessionCustomName(session) : "";

  const deviceLabel = session ? getSessionDeviceLabel(session) : "Unknown Device";
  const ipLabel = session ? getSessionIpLabel(session) : "-";
  const locationLabel = session ? getSessionLocationLabel(session) : "";
  const lastActive = session ? getSessionLastActive(session) : null;
  const isCurrent = session
    ? normalizeBoolean(
        pickSessionValue(session, [
          "isCurrent",
          "is_current",
          "current",
          "isThisDevice",
          "device.isCurrent",
        ]),
      )
    : false;
  const isActive = session
    ? normalizeBoolean(pickSessionValue(session, ["isActive", "is_active", "active"]))
    : false;
  const browser = session
    ? String(
        pickSessionValue(session, ["browser", "browserName", "deviceInfo.browser"]) ?? "-",
      )
    : "-";
  const firstLoginAt = session
    ? pickSessionValue(session, [
        "firstLoginAt",
        "loginAt",
        "connectedAt",
        "createdAt",
        "created_at",
      ])
    : null;
  const lastLogoutAt = session
    ? pickSessionValue(session, [
        "lastLogoutAt",
        "logoutAt",
        "disconnectedAt",
        "closedAt",
        "lastDisconnectAt",
      ])
    : null;
  const loginCount = session
    ? pickFirstNumber(session, [
        "loginCount",
        "meta.loginCount",
        "stats.loginCount",
        "count.login",
      ])
    : null;
  const logoutCount = session
    ? pickFirstNumber(session, [
        "logoutCount",
        "disconnectCount",
        "meta.logoutCount",
        "stats.logoutCount",
      ])
    : null;
  const reconnectCount = session
    ? pickFirstNumber(session, [
        "reconnectCount",
        "reloginCount",
        "meta.reconnectCount",
        "stats.reconnectCount",
      ])
    : null;
  const userAgent = session
    ? String(pickSessionValue(session, ["userAgent", "user_agent"]) ?? "-")
    : "-";

  const activityEvents = [
    firstLoginAt
      ? { label: "Logged In", time: formatSessionDateTime(firstLoginAt), tone: "emerald" }
      : null,
    lastActive
      ? { label: "Last Active", time: formatSessionDateTime(lastActive), tone: "cyan" }
      : null,
    lastLogoutAt
      ? { label: "Logged Out", time: formatSessionDateTime(lastLogoutAt), tone: "rose" }
      : null,
  ].filter(Boolean) as Array<{ label: string; time: string; tone: "emerald" | "cyan" | "rose" }>;

  const { mutate: saveSessionName, isPending: isSavingSessionName } = useMutation({
    mutationFn: (customName: string | null) =>
      AdminService.updateSessionCustomName(sessionId, { customName }),
    onSuccess: (response, customName) => {
      queryClient.invalidateQueries({ queryKey: ["admin-active-sessions"] });
      toast.success(customName ? "Device name saved" : "Device name cleared");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to save device name";
      toast.error(message);
    },
  });

  const handleSave = (value: string) => {
    const trimmed = value.trim();
    saveSessionName(trimmed || null);
  };

  if (!isAuthReady) {
    return <div className="mx-auto max-w-5xl" />;
  }

  if (!canRunAdminQuery) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.09),transparent_25%),linear-gradient(180deg,rgba(13,20,40,0.98),rgba(6,11,24,0.98))] p-4 shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/profile"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Profile
          </Link>
          <h1 className="text-xl font-semibold text-white">Session Details</h1>
          <p className="text-sm text-slate-500">
            Ei page theke device name, custom label, ar session info manage korte parben.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200">
          {sessionId || "No Session ID"}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-72 animate-pulse rounded-[24px] border border-slate-700/50 bg-slate-900/60" />
          <div className="h-72 animate-pulse rounded-[24px] border border-slate-700/50 bg-slate-900/60" />
        </div>
      ) : !session ? (
        <div className="rounded-[24px] border border-slate-700/60 bg-slate-900/60 p-8 text-center">
          <Eye className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-medium text-white">Session not found</p>
          <p className="mt-1 text-sm text-slate-500">
            Session ta expire hoye geche ba logout hoye gese.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(22,29,51,0.94),rgba(10,15,29,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
                  <Laptop className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-white">
                      {deviceLabel}
                    </p>
                    {savedCustomName.trim() && (
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                        {savedCustomName.trim()}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                        Current
                      </span>
                    )}
                    {!isCurrent && !isActive && (
                      <span className="rounded-full border border-slate-600/60 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Logged out
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-cyan-400" />
                      {ipLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {locationLabel || "Unknown location"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <SessionInfoCard label="Device Name" value={deviceLabel} accent="violet" />
                <SessionInfoCard label="Custom Name" value={savedCustomName || "-"} accent="violet" />
                <SessionInfoCard label="IP Address" value={ipLabel} accent="cyan" />
                <SessionInfoCard label="Browser" value={browser} />
                <SessionInfoCard
                  label="Last Active"
                  value={formatSessionDateTime(lastActive)}
                />
                <SessionInfoCard
                  label="Status"
                  value={isCurrent ? "Current Device" : isActive ? "Active" : "Logged Out"}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(18,28,48,0.94),rgba(10,15,29,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Raw Session Data</h2>
                  <p className="text-xs text-slate-500">Extra info for identifying shared admin devices.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-950/55 p-4">
                <p className="break-all text-xs leading-6 text-slate-300">{userAgent}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(17,33,47,0.96),rgba(9,14,28,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Activity Summary</h2>
                  <p className="text-xs text-slate-500">
                    Login/logout/browser reopen related info jodi backend theke ase, ekhane dekhabe.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SessionInfoCard label="First Login" value={formatSessionDateTime(firstLoginAt)} accent="cyan" />
                <SessionInfoCard label="Last Logout" value={formatSessionDateTime(lastLogoutAt)} />
                <SessionInfoCard label="Login Count" value={loginCount !== null ? String(loginCount) : "-"} />
                <SessionInfoCard label="Logout Count" value={logoutCount !== null ? String(logoutCount) : "-"} />
                <SessionInfoCard label="Reconnect Count" value={reconnectCount !== null ? String(reconnectCount) : "-"} />
                <SessionInfoCard
                  label="Activity Signals"
                  value={activityEvents.length > 0 ? `${activityEvents.length} events available` : "No extra signals"}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-950/55 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Timeline
                </p>
                {activityEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Once the detailed login/logout timeline is received from the backend, the exact history will be displayed here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityEvents.map((event) => (
                      <div key={`${event.label}-${event.time}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            event.tone === "emerald" && "text-emerald-300",
                            event.tone === "cyan" && "text-cyan-300",
                            event.tone === "rose" && "text-rose-300",
                          )}
                        >
                          {event.label}
                        </span>
                        <span className="text-xs text-slate-400">{event.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(18,24,43,0.96),rgba(9,14,28,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 text-yellow-300">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Set Device Name</h2>
                <p className="text-xs text-slate-500">
                 Set a custom name to recognize this device from multiple active sessions.
                </p>
              </div>
            </div>

            <SessionNameEditor
              key={`${sessionId}:${savedCustomName}`}
              savedName={savedCustomName}
              onSave={handleSave}
              onClear={() => saveSessionName(null)}
              canEdit={isCurrent}
              isSaving={isSavingSessionName}
            />
            {!isCurrent && (
              <p className="mt-3 text-xs text-slate-500">
                Ei device-er name only oi current device/browser thekei change kora jabe.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
