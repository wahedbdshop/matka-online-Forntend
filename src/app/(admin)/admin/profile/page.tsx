/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldBan,
  Pencil,
  X,
  Monitor,
  MapPin,
  Wifi,
  Trash2,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminService } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

function extractApiErrorMessage(error: any, fallback: string) {
  const responseData = error?.response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }
  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const firstError = responseData.errors[0];
    if (typeof firstError === "string" && firstError.trim()) return firstError;
    if (typeof firstError?.message === "string" && firstError.message.trim()) {
      return firstError.message;
    }
  }

  return fallback;
}

function normalizeSessionList(source: any): any[] {
  if (Array.isArray(source)) return source;

  const candidates = [
    source?.data,
    source?.sessions,
    source?.items,
    source?.results,
    source?.list,
    source?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function pickSessionValue(session: any, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<any>((acc, key) => acc?.[key], session);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "current";
  }

  return false;
}

function getSessionCustomName(session: any) {
  const customName = pickSessionValue(session, [
    "customName",
    "custom_name",
    "deviceCustomName",
    "device.customName",
  ]);

  return typeof customName === "string" ? customName : "";
}

// ─── Active Session Row ────────────────────────────────────────
function SessionRow({
  session,
  onRevoke,
  revoking,
  onBlockIp,
  blockingIp,
}: {
  session: any;
  onRevoke: (id: string) => void;
  revoking: boolean;
  onBlockIp: (id: string) => void;
  blockingIp: boolean;
}) {
  const sessionId = String(
    pickSessionValue(session, ["id", "_id", "sessionId", "session_id", "sid"]) ?? "",
  );
  const customName = getSessionCustomName(session);
  const isCurrent = normalizeBoolean(
    pickSessionValue(session, [
      "isCurrent",
      "is_current",
      "current",
      "isThisDevice",
      "device.isCurrent",
    ]),
  );
  const isActive = normalizeBoolean(
    pickSessionValue(session, ["isActive", "is_active", "active"]),
  );
  const deviceLabel =
    pickSessionValue(session, [
      "deviceName",
      "device.name",
      "device.label",
      "device.model",
      "deviceInfo.deviceName",
      "deviceInfo.name",
      "browser",
      "browserName",
      "deviceInfo.browser",
      "userAgent",
      "user_agent",
    ]) ?? "Unknown Device";
  const rawIp =
    pickSessionValue(session, [
      "ipAddress",
      "ip",
      "ip_address",
      "location.ip",
      "device.ipAddress",
      "meta.ip",
    ]) ?? "";
  // ::ffff:x.x.x.x → x.x.x.x, ::1 → 127.0.0.1 (localhost)
  const ip = rawIp === "::1"
    ? "127.0.0.1 (localhost)"
    : rawIp.startsWith("::ffff:")
      ? rawIp.replace("::ffff:", "")
      : rawIp || "—";
  const location = [
    pickSessionValue(session, ["city", "cityName", "location.city", "geo.city"]),
    pickSessionValue(session, ["region", "regionName", "state", "location.region", "geo.region"]),
    pickSessionValue(session, [
      "country",
      "countryName",
      "countryCode",
      "location.country",
      "location.countryName",
      "geo.country",
    ]),
  ]
    .filter(Boolean)
    .join(", ");
  const lastActive = pickSessionValue(session, [
    "lastActive",
    "lastSeenAt",
    "last_seen_at",
    "updatedAt",
    "updated_at",
    "createdAt",
    "created_at",
  ]);
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,255,0.98))] px-4 py-3 shadow-[0_12px_28px_rgba(148,163,184,0.16)] md:flex-row md:items-center dark:bg-[linear-gradient(135deg,rgba(33,18,66,0.88),rgba(11,18,36,0.96))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        isCurrent
          ? "border-violet-300 shadow-[0_0_0_1px_rgba(167,139,250,0.22)] dark:border-violet-500/25 dark:shadow-[0_0_0_1px_rgba(76,29,149,0.12)]"
          : "border-slate-200 dark:border-slate-700/60",
      )}
    >
      {/* Device icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          isCurrent
            ? "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
            : "border-slate-200 bg-white text-slate-500 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-400",
        )}
      >
        <Monitor className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Device name + badge */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
            {deviceLabel}
          </p>
          {customName && customName.trim() && (
            <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
              {customName.trim()}
            </span>
          )}
          {sessionId && (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-600/70 dark:bg-slate-900/70 dark:text-slate-400">
              {sessionId}
            </span>
          )}
          {isCurrent && (
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300">
              Current
            </span>
          )}
          {!isCurrent && !isActive && (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-600/50 dark:bg-slate-500/10 dark:text-slate-400">
              Logged out
            </span>
          )}
        </div>

        {/* IP address — prominent */}
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 shrink-0 text-cyan-500" />
          <span className="text-[11px] font-mono font-semibold text-cyan-700 dark:text-cyan-400">
            {ip}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
          {location ? (
            <span className="text-[11px] text-slate-600 dark:text-slate-300">{location}</span>
          ) : (
            <span className="text-[11px] italic text-slate-500 dark:text-slate-600">Unknown location</span>
          )}
          {lastActive && (
            <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-600">
              · {new Date(lastActive).toLocaleString("en-BD", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {sessionId && (
        <div className="shrink-0 flex items-center gap-1.5 self-end md:self-center">
          <Link
            href={`/admin/profile/sessions/${encodeURIComponent(sessionId)}`}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[11px] font-medium text-cyan-700 transition-all hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/20"
          >
            <Eye className="h-3 w-3" />
            View
          </Link>
          {!isCurrent && (
            <button
              onClick={() => onBlockIp(sessionId)}
              disabled={blockingIp}
              title="Block this IP address"
              className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] font-medium text-orange-700 transition-all hover:border-orange-300 hover:bg-orange-100 disabled:opacity-40 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/20"
            >
              {blockingIp ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShieldBan className="h-3 w-3" />
              )}
              Block IP
            </button>
          )}
          <button
            onClick={() => onRevoke(sessionId)}
            disabled={revoking}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:opacity-40 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/20"
          >
            {revoking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Remove Device
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function AdminProfilePage() {
  const { canRunAdminQuery, isAuthReady } = useAdminAuth();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [blockingIpId, setBlockingIpId] = useState<string | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Seed initial values from auth store
  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarPreview(user?.image ?? null);
  }, [user?.name, user?.email, user?.image]);

  // Fetch profile from backend (optional — hydrates store)
  const { data: profileData } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: () => AdminService.getAdminProfile(),
    enabled: canRunAdminQuery,
  });
  useEffect(() => {
    const p = (profileData as any)?.data;
    if (!p) return;
    updateUser({ name: p.name, email: p.email, image: p.image });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  // Fetch active sessions
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: AdminService.getActiveSessions,
    enabled: canRunAdminQuery,
  });
  const sessions = normalizeSessionList(sessionsData);

  // ── Mutations ──────────────────────────────────────────────
  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const nextPayload: {
        name?: string;
        email?: string;
        image?: File;
      } = {};

      if (trimmedName && trimmedName !== (user?.name ?? "")) {
        nextPayload.name = trimmedName;
      }
      if (trimmedEmail && trimmedEmail !== (user?.email ?? "")) {
        nextPayload.email = trimmedEmail;
      }
      if (avatarFile) {
        nextPayload.image = avatarFile;
      }
      if (Object.keys(nextPayload).length === 0) {
        throw new Error("No profile changes to save");
      }

      return AdminService.updateAdminProfile(nextPayload);
    },
    onSuccess: (data: any) => {
      const p = data?.data;
      updateUser({ name: p?.name, email: p?.email, image: p?.image });
      setName(p?.name ?? name.trim());
      setEmail(p?.email ?? email.trim());
      setAvatarPreview(p?.image ?? avatarPreview);
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setIsEditing(false);
      setAvatarFile(null);
      toast.success("Profile updated");
    },
    onError: (err: any) => {
      toast.error(
        extractApiErrorMessage(
          err,
          err?.message ?? "Failed to update profile",
        ),
      );
    },
  });

  const { mutate: changePassword, isPending: changingPassword } = useMutation({
    mutationFn: () =>
      AdminService.updateAdminPassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(extractApiErrorMessage(err, "Failed to change password"));
    },
  });

  const { mutate: revokeSession } = useMutation({
    mutationFn: (id: string) => AdminService.revokeSession(id),
    onSuccess: () => {
      toast.success("Session removed");
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(extractApiErrorMessage(err, "Failed to remove session"));
    },
    onSettled: () => setRevokingId(null),
  });

  const { mutate: revokeAll, isPending: revokingAll } = useMutation({
    mutationFn: () => AdminService.revokeAllSessions(),
    onSuccess: () => {
      toast.success("All other sessions removed");
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(extractApiErrorMessage(err, "Failed to remove sessions"));
    },
  });

  const { mutate: blockIp } = useMutation({
    mutationFn: (id: string) => AdminService.blockSessionIp(id),
    onSuccess: () => {
      toast.success("IP blocked and session removed");
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(extractApiErrorMessage(err, "Failed to block IP"));
    },
    onSettled: () => setBlockingIpId(null),
  });

  const handleRevoke = (id: string) => {
    setRevokingId(id);
    revokeSession(id);
  };

  const handleBlockIp = (id: string) => {
    setBlockingIpId(id);
    blockIp(id);
  };

  const handleCancelEdit = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarPreview(user?.image ?? null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePasswordSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    changePassword();
  };

  const otherSessions = sessions.filter(
    (s) =>
      !normalizeBoolean(
        pickSessionValue(s, [
          "isCurrent",
          "is_current",
          "current",
          "isThisDevice",
          "device.isCurrent",
        ]),
      ),
  );

  if (!isAuthReady) {
    return <div className="max-w-2xl mx-auto space-y-6" />;
  }

  if (!canRunAdminQuery) {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(196,181,253,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.98))] p-4 shadow-[0_24px_70px_rgba(148,163,184,0.22)] dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_left,rgba(88,28,135,0.22),transparent_28%),linear-gradient(180deg,rgba(13,20,40,0.98),rgba(6,11,24,0.98))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.55)] xl:grid-cols-[1.45fr_0.95fr] xl:grid-rows-[auto_auto]">

      {/* ══════════════════════════════════════
          Profile Info
      ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[0_18px_42px_rgba(148,163,184,0.16)] dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(22,29,51,0.94),rgba(10,15,29,0.98))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-start-1 xl:row-start-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-5 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Profile Information
            </h2>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700 dark:border-slate-600/80 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-violet-400/40 dark:hover:text-violet-200"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:border-slate-600/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-5 px-4 py-4 md:px-5 md:py-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-violet-500/10">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="avatar" />
                )}
                <AvatarFallback className="bg-linear-to-br from-violet-600 to-fuchsia-600 text-xl font-bold text-white">
                  {(user?.name ?? "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-violet-600 transition-colors hover:bg-violet-500 dark:border-slate-900"
                  >
                    <Camera className="h-3 w-3 text-white" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {user?.name ?? "Admin"}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {user?.role ?? "admin"}
              </p>
              {isEditing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 text-[11px] text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                >
                  Change photo
                </button>
              )}
            </div>
          </div>

          {/* ── View mode ── */}
          {!isEditing && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Full Name
                </p>
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-950/55">
                  <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-900 dark:text-white">
                    {user?.name ?? "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email Address
                </p>
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-950/55">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-900 truncate dark:text-white">
                    {user?.email ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit mode ── */}
          {isEditing && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Admin name"
                      className="border-slate-200 bg-white pl-9 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="border-slate-200 bg-white pl-9 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => saveProfile()}
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-500"
              >
                {savingProfile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          Active Sessions
      ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[0_18px_42px_rgba(148,163,184,0.16)] dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(18,28,48,0.94),rgba(10,15,29,0.98))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-span-2 xl:col-start-1 xl:row-start-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-5 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Active Sessions
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Devices currently logged in as admin
              </p>
            </div>
          </div>
          <button
            onClick={() => revokeAll()}
            disabled={revokingAll || otherSessions.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
          >
            {revokingAll ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <LogOut className="h-3 w-3" />
            )}
            Remove All Devices
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 md:px-5">
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl border border-slate-200 bg-slate-100 animate-pulse dark:border-slate-700/30 dark:bg-slate-900/60"
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-700/30 dark:bg-slate-900/40">
              <Monitor className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-700" />
              <p className="text-xs text-slate-500 dark:text-slate-500">
                No active session data available
              </p>
            </div>
          ) : (
            sessions.map((session, i) => (
              <SessionRow
                key={session.id ?? i}
                session={session}
                onRevoke={handleRevoke}
                revoking={revokingId === session.id}
                onBlockIp={handleBlockIp}
                blockingIp={blockingIpId === session.id}
              />
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          Change Password
      ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] shadow-[0_18px_42px_rgba(148,163,184,0.16)] dark:border-slate-700/70 dark:bg-[linear-gradient(180deg,rgba(18,24,43,0.96),rgba(9,14,28,0.98))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:col-start-2 xl:row-start-1">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 md:px-5 dark:border-slate-700/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 text-yellow-300">
            <Lock className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 px-4 py-4 md:px-5 md:py-5">
          {(
            [
              {
                id: "current",
                label: "Current Password",
                value: currentPassword,
                set: setCurrentPassword,
                show: showCurrent,
                toggle: () => setShowCurrent((p) => !p),
              },
              {
                id: "new",
                label: "New Password",
                value: newPassword,
                set: setNewPassword,
                show: showNew,
                toggle: () => setShowNew((p) => !p),
              },
              {
                id: "confirm",
                label: "Confirm New Password",
                value: confirmPassword,
                set: setConfirmPassword,
                show: showConfirm,
                toggle: () => setShowConfirm((p) => !p),
              },
            ] as const
          ).map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label
                htmlFor={f.id}
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {f.label}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  id={f.id}
                  type={f.show ? "text" : "password"}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  required
                  className="rounded-2xl border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
                />
                <button
                  type="button"
                  onClick={f.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
                >
                  {f.show ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-yellow-500/20 dark:bg-yellow-500/5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-yellow-400" />
            <p className="text-[11px] text-amber-700 dark:text-yellow-300/80">
              Use a strong password with at least 6 characters.
            </p>
          </div>

          <Button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 rounded-xl bg-yellow-600 text-white text-sm hover:bg-yellow-500"
          >
            {changingPassword ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
