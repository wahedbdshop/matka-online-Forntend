/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
  const rawIp = session.ipAddress ?? session.ip ?? session.ip_address ?? "";
  // ::ffff:x.x.x.x → x.x.x.x, ::1 → 127.0.0.1 (localhost)
  const ip = rawIp === "::1"
    ? "127.0.0.1 (localhost)"
    : rawIp.startsWith("::ffff:")
      ? rawIp.replace("::ffff:", "")
      : rawIp || "—";
  const location = [
    session.city ?? session.cityName,
    session.region ?? session.regionName,
    session.country ?? session.countryName ?? session.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-slate-900/60 px-4 py-3",
        session.isCurrent
          ? "border-purple-500/30"
          : "border-slate-700/40",
      )}
    >
      {/* Device icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          session.isCurrent
            ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
            : "bg-slate-800 border-slate-700/60 text-slate-400",
        )}
      >
        <Monitor className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Device name + badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-white truncate">
            {session.deviceName ?? session.browser ?? session.userAgent ?? "Unknown Device"}
          </p>
          {session.isCurrent && (
            <span className="shrink-0 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wide">
              Current
            </span>
          )}
        </div>

        {/* IP address — prominent */}
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 shrink-0 text-cyan-500" />
          <span className="text-[11px] font-mono font-semibold text-cyan-400">
            {ip}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
          {location ? (
            <span className="text-[11px] text-slate-300">{location}</span>
          ) : (
            <span className="text-[11px] text-slate-600 italic">Unknown location</span>
          )}
          {session.lastActive && (
            <span className="ml-2 text-[10px] text-slate-600">
              · {new Date(session.lastActive).toLocaleString("en-BD", {
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
      {!session.isCurrent && (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={() => onBlockIp(session.id)}
            disabled={blockingIp}
            title="Block this IP address"
            className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1.5 text-[11px] font-medium text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40 transition-all disabled:opacity-40"
          >
            {blockingIp ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ShieldBan className="h-3 w-3" />
            )}
            Block IP
          </button>
          <button
            onClick={() => onRevoke(session.id)}
            disabled={revoking}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-40"
          >
            {revoking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function AdminProfilePage() {
  const { canRunAdminQuery } = useAdminAuth();
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
  const sessions: any[] = (sessionsData as any)?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────
  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("email", email);
      if (avatarFile) fd.append("avatar", avatarFile);
      return AdminService.updateAdminProfile(fd);
    },
    onSuccess: (data: any) => {
      const p = data?.data;
      updateUser({ name: p?.name, email: p?.email, image: p?.image });
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setIsEditing(false);
      setAvatarFile(null);
      toast.success("Profile updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to update profile");
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
      toast.error(err?.response?.data?.message ?? "Failed to change password");
    },
  });

  const { mutate: revokeSession } = useMutation({
    mutationFn: (id: string) => AdminService.revokeSession(id),
    onSuccess: () => {
      toast.success("Session removed");
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to remove session");
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
      toast.error(err?.response?.data?.message ?? "Failed to remove sessions");
    },
  });

  const { mutate: blockIp } = useMutation({
    mutationFn: (id: string) => AdminService.blockSessionIp(id),
    onSuccess: () => {
      toast.success("IP blocked and session removed");
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to block IP");
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

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ══════════════════════════════════════
          Profile Info
      ══════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">
              Profile Information
            </h2>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-purple-500/50 hover:text-purple-400 transition-all"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {avatarPreview && (
                  <AvatarImage src={avatarPreview} alt="avatar" />
                )}
                <AvatarFallback className="bg-linear-to-br from-purple-600 to-indigo-600 text-xl font-bold text-white">
                  {(user?.name ?? "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 border-2 border-slate-800 hover:bg-purple-500 transition-colors"
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
              <p className="text-sm font-semibold text-white">
                {user?.name ?? "Admin"}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {user?.role ?? "admin"}
              </p>
              {isEditing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 text-[11px] text-purple-400 hover:text-purple-300"
                >
                  Change photo
                </button>
              )}
            </div>
          </div>

          {/* ── View mode ── */}
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Full Name
                </p>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5">
                  <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-white">
                    {user?.name ?? "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Email Address
                </p>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="text-sm text-white truncate">
                    {user?.email ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit mode ── */}
          {isEditing && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-400">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Admin name"
                      className="bg-slate-900 border-slate-700 text-white text-sm pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-400">
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
                      className="bg-slate-900 border-slate-700 text-white text-sm pl-9"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => saveProfile()}
                disabled={savingProfile}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm"
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
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Active Sessions
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Devices currently logged in as admin
              </p>
            </div>
          </div>
          {otherSessions.length > 0 && (
            <button
              onClick={() => revokeAll()}
              disabled={revokingAll}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {revokingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              Remove All Others
            </button>
          )}
        </div>

        <div className="p-4 space-y-2">
          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-900/60 animate-pulse border border-slate-700/30"
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-8 text-center">
              <Monitor className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                No active session data available
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Backend endpoint not yet connected
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
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <div className="border-b border-slate-700/40 px-5 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            <Lock className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-white">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
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
                className="text-xs font-medium text-slate-400"
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
                  className="bg-slate-900 border-slate-700 text-white text-sm pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={f.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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

          <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <p className="text-[11px] text-yellow-300/80">
              Use a strong password with at least 6 characters.
            </p>
          </div>

          <Button
            type="submit"
            disabled={changingPassword}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
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
