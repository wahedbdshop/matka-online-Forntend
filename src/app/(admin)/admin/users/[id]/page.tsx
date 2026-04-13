/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  TrendingUp,
  ArrowLeftRight,
  DollarSign,
  LogIn,
  Bell,
  Shield,
  Ban,
  CheckCircle,
  X,
} from "lucide-react";
import { ResetUserPasswordAction } from "@/components/admin/reset-user-password-action";
import { AdminService } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { ADMIN_LOGIN_AS_CHANNEL_PREFIX } from "@/lib/admin-login-as";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const adminUser = useAuthStore((state) => state.user);
  const adminToken = useAuthStore((state) => state.token);

  // balance modal
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceAmt, setBalanceAmt] = useState("");
  // const [balanceType, setBalanceType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [balanceNote, setBalanceNote] = useState("");

  // notification modal
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPage, setNotifPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => AdminService.getUserById(id),
  });

  const user = data?.data;

  // notifications query
  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ["admin-user-notifs", id, notifPage],
    queryFn: () => AdminService.getUserNotifications(id, notifPage, 20),
    enabled: notifOpen,
  });

  const notifications = notifData?.data?.notifications ?? [];
  const notifTotal = notifData?.data?.total ?? 0;
  const notifPages = Math.ceil(notifTotal / 20);

  // ── Mutations ──
  const { mutate: banUser, isPending: banning } = useMutation({
    mutationFn: () => AdminService.banUser(id),
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: unbanUser, isPending: unbanning } = useMutation({
    mutationFn: () => AdminService.unbanUser(id),
    onSuccess: () => {
      toast.success("User unbanned");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: adjustBalance, isPending: adjusting } = useMutation({
    mutationFn: () =>
      AdminService.adjustBalance({
        userId: id,
        amount: Number(balanceAmt),
        // type: balanceType,
        type: "DEBIT",
        note: balanceNote || undefined,
      }),
    onSuccess: () => {
      toast.success("Balance adjusted");
      setBalanceOpen(false);
      setBalanceAmt("");
      setBalanceNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: toggleDeposit, isPending: togglingDeposit } = useMutation({
    mutationFn: (val: boolean) => AdminService.toggleUserDeposit(id, val),
    onSuccess: () => {
      toast.success("Deposit setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: toggleTransfer, isPending: togglingTransfer } = useMutation({
    mutationFn: (val: boolean) => AdminService.toggleUserTransfer(id, val),
    onSuccess: () => {
      toast.success("Transfer setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: toggleWithdraw, isPending: togglingWithdraw } = useMutation({
    mutationFn: (val: boolean) => AdminService.toggleUserWithdraw(id, val),
    onSuccess: () => {
      toast.success("Withdrawal setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: loginAsUser, isPending: loggingIn } = useMutation({
    mutationFn: ({
      popup,
      flowId,
    }: {
      popup: Window | null;
      flowId: string;
    }) =>
      AdminService.loginAsUser(id).then((res) => ({
        res,
        popup,
        flowId,
      })),
    onSuccess: ({ res, popup, flowId }) => {
      const token = res.data.token;
      const userData = res.data.user;

      if (!token || !userData || !adminToken || adminUser?.role !== "ADMIN") {
        popup?.close();
        toast.error("Could not prepare a secure admin session handoff");
        return;
      }

      const channel = new BroadcastChannel(
        `${ADMIN_LOGIN_AS_CHANNEL_PREFIX}:${flowId}`,
      );

      if (!popup || popup.closed) {
        channel.close();
        toast.error("Pop-up blocked. Please allow pop-ups and try again.");
        return;
      }

      popup.location.href = `/admin-login-as?flow=${encodeURIComponent(flowId)}`;

      const timeout = window.setTimeout(() => {
        channel.close();
        if (!popup.closed && popup.location.pathname === "/blank") {
          popup.close();
        }
      }, 15_000);

      channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
        if (event.data?.type !== "ready") return;

        channel.postMessage({
          type: "auth-payload",
          payload: {
            token,
            user: userData,
            createdAt: Date.now(),
            adminBackup: {
              token: adminToken,
              user: adminUser,
            },
          },
        });

        window.clearTimeout(timeout);
        channel.close();
        toast.success("Opening the user account in a new tab...");
      };
    },
    onError: (e: any, variables) => {
      variables.popup?.close();
      toast.error(e?.response?.data?.message || "Failed");
    },
  });

  const handleLoginAsUser = () => {
    const flowId = crypto.randomUUID();
    const popup = window.open("", "_blank");

    if (!popup) {
      toast.error("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }

    popup.document.write(`
      <html>
        <head><title>Logging in...</title></head>
        <body style="margin:0;background:#050b1f;color:#cbd5e1;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
          <div style="text-align:center;">
            <div style="width:32px;height:32px;border:2px solid rgba(168,85,247,.35);border-top-color:#a855f7;border-radius:9999px;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>
            <p style="margin:0;font-size:14px;">Preparing secure login...</p>
          </div>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </body>
      </html>
    `);
    popup.document.close();

    loginAsUser({ popup, flowId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <p className="text-slate-400 p-4">User not found</p>;

  const isBanned = user.status === "BANNED";
  const totalBets =
    (user._count?.thaiBets ?? 0) + (user._count?.kalyanBets ?? 0);

  const statCards = [
    {
      label: "Balance",
      value: `৳${Number(user.balance).toLocaleString()}`,
      icon: Wallet,
      color: "from-[#3b1f8c] to-[#4c35a0]",
      border: "border-purple-500/30",
      href: null,
    },
    {
      label: "Deposits",
      value: user._count?.deposits ?? 0,
      sub: `৳${Number(user.depositTotal ?? 0).toLocaleString()} total`,
      icon: ArrowDownToLine,
      color: "from-[#1a3fa8] to-[#2651c7]",
      border: "border-blue-500/30",
      href: `/admin/deposits?userId=${id}`,
    },
    {
      label: "Withdrawals",
      value: user._count?.withdrawals ?? 0,
      sub: `৳${Number(user.withdrawalTotal ?? 0).toLocaleString()} total`,
      icon: ArrowUpFromLine,
      color: "from-[#0d6e5e] to-[#0e8a75]",
      border: "border-teal-500/30",
      href: `/admin/withdrawals?userId=${id}`,
    },
    {
      label: "Total Played",
      value: totalBets,
      icon: Gamepad2,
      color: "from-[#1c3a6e] to-[#244d8f]",
      border: "border-blue-400/30",
      href: null,
    },
    {
      label: "Bonus Balance",
      value: `৳${Number(user.bonusBalance ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "from-[#0e5c2e] to-[#117a3d]",
      border: "border-green-500/30",
      href: null,
    },
    {
      label: "Referrals",
      value: user._count?.referrals ?? 0,
      icon: ArrowLeftRight,
      color: "from-[#1a5c1a] to-[#24802b]",
      border: "border-green-400/30",
      href: null,
    },
  ];

  const actionBtns = [
    {
      label: "Balance",
      color: "bg-red-600 hover:bg-red-700",
      icon: DollarSign,
      onClick: () => setBalanceOpen(true),
    },
    {
      label: "Notifications",
      color: "bg-slate-600 hover:bg-slate-700",
      icon: Bell,
      onClick: () => setNotifOpen(true),
    },
    {
      label: "Login as User",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: LogIn,
      onClick: handleLoginAsUser,
      loading: loggingIn,
    },
    {
      label: "Wallets",
      color: "bg-indigo-600 hover:bg-indigo-700",
      icon: Wallet,
      onClick: () => router.push(`/admin/users/${id}/wallets`),
    },
    {
      label: "Deposits",
      color: "bg-slate-600 hover:bg-slate-700",
      icon: ArrowDownToLine,
      onClick: () => router.push(`/admin/deposits?userId=${id}`),
    },
    {
      label: "Login Info",
      color: "bg-cyan-700 hover:bg-cyan-800",
      icon: LogIn,
      onClick: () => router.push(`/admin/users/${id}/login-history`),
    },
    {
      label: "Change Password",
      render: () => (
        <ResetUserPasswordAction
          userId={id}
          userName={user.name}
          buttonLabel="Change Password"
          buttonClassName="flex items-center gap-2 rounded-lg bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/30 transition-colors hover:bg-amber-500/25"
        />
      ),
    },
    {
      label: "KYC Data",
      color: "bg-slate-900 hover:bg-slate-800 border border-slate-600",
      icon: Shield,
      onClick: () => router.push(`/admin/kyc?userId=${id}`),
    },
    {
      label: isBanned ? "Unban User" : "Ban User",
      color: isBanned
        ? "bg-green-600 hover:bg-green-700"
        : "bg-orange-500 hover:bg-orange-600",
      icon: isBanned ? CheckCircle : Ban,
      onClick: () => (isBanned ? unbanUser() : banUser()),
      loading: banning || unbanning,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/users")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            User Detail — {user.name}
          </h1>
          <p className="text-xs text-slate-400">
            @{user.username} · {user.email}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full border px-3 py-1 text-xs font-medium ${
            isBanned
              ? "border-red-500/30 bg-red-500/15 text-red-400"
              : user.status === "ACTIVE"
                ? "border-green-500/30 bg-green-500/15 text-green-400"
                : "border-yellow-500/30 bg-yellow-500/15 text-yellow-400"
          }`}
        >
          {user.status}
        </span>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div
              className={`relative overflow-hidden rounded-xl border ${card.border} bg-gradient-to-br ${card.color} p-4 group cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-white/60 uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="mt-1.5 text-xl font-bold text-white">
                    {card.value}
                  </p>
                  {(card as any).sub && (
                    <p className="mt-0.5 text-sm text-white/50">
                      {(card as any).sub}
                    </p>
                  )}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
              </div>
              {card.href && (
                <p className="mt-2 text-[10px] text-white/40 group-hover:text-white/70 transition-colors">
                  View All →
                </p>
              )}
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5" />
            </div>
          );

          return card.href ? (
            <a key={card.label} href={card.href}>
              {content}
            </a>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap gap-2">
        {actionBtns.map((btn) => {
          if ((btn as any).render) {
            return <div key={btn.label}>{(btn as any).render()}</div>;
          }

          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={(btn as any).loading}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60 ${btn.color}`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* ── User Info ── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">
          Information of {user.name}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Name", value: user.name },
            { label: "Username", value: `@${user.username}` },
            { label: "Email", value: user.email },
            { label: "Phone", value: user.phone ?? "-" },
            { label: "Country", value: user.country ?? "-" },
            { label: "Referral Code", value: user.referralCode },
            {
              label: "Email Verified",
              value: user.emailVerified ? "✓ Verified" : "✗ Not verified",
              color: user.emailVerified ? "text-green-400" : "text-red-400",
            },
            { label: "Role", value: user.role },
          ].map((item: any) => (
            <div
              key={item.label}
              className="rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${item.color ?? "text-white"}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KYC Status ── */}
      {user.kycDocument && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">KYC Status</h2>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                user.kycDocument.status === "VERIFIED"
                  ? "border-green-500/30 bg-green-500/15 text-green-400"
                  : user.kycDocument.status === "PENDING"
                    ? "border-yellow-500/30 bg-yellow-500/15 text-yellow-400"
                    : "border-red-500/30 bg-red-500/15 text-red-400"
              }`}
            >
              {user.kycDocument.status}
            </span>
            {user.kycDocument.documentType && (
              <span className="text-xs text-slate-400">
                {user.kycDocument.documentType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Account Restrictions ── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">
          Account Restrictions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* ✅ Deposit toggle যোগ করো */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Deposit</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {(user.canDeposit ?? true) ? "Enabled" : "Disabled"}
              </p>
            </div>
            <button
              onClick={() => toggleDeposit(!(user.canDeposit ?? true))}
              disabled={togglingDeposit}
              className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                (user.canDeposit ?? true) ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  (user.canDeposit ?? true)
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {/* Balance Transfer */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Balance Transfer</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {user.canTransfer ? "Enabled" : "Disabled"}
              </p>
            </div>
            <button
              onClick={() => toggleTransfer(!(user.canTransfer ?? true))}
              disabled={togglingTransfer}
              className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                (user.canTransfer ?? true) ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  (user.canTransfer ?? true)
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Withdrawal */}
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">Withdrawal</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {user.canWithdraw ? "Enabled" : "Disabled"}
              </p>
            </div>
            <button
              onClick={() => toggleWithdraw(!user.canWithdraw)}
              disabled={togglingWithdraw}
              className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                user.canWithdraw ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  user.canWithdraw ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Balance Adjust Modal ── */}
      {balanceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBalanceOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Adjust Balance</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">{user.name}</p>
              </div>
              <button onClick={() => setBalanceOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBalanceType("CREDIT")}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  balanceType === "CREDIT"
                    ? "bg-green-600 text-white"
                    : "border border-slate-600 bg-slate-800 text-slate-400"
                }`}
              >
                Credit (+)
              </button>
              <button
                onClick={() => setBalanceType("DEBIT")}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  balanceType === "DEBIT"
                    ? "bg-red-600 text-white"
                    : "border border-slate-600 bg-slate-800 text-slate-400"
                }`}
              >
                Debit (-)
              </button>
            </div> */}

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
              <p className="text-[10px] text-slate-500">Current Balance</p>
              <p className="text-lg font-bold text-purple-400">
                ৳{Number(user.balance).toLocaleString()}
              </p>
            </div>

            <input
              type="number"
              value={balanceAmt}
              onChange={(e) => setBalanceAmt(e.target.value)}
              placeholder="Amount (৳)"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
            <input
              value={balanceNote}
              onChange={(e) => setBalanceNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setBalanceOpen(false)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => adjustBalance()}
                disabled={adjusting || !balanceAmt}
                className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {adjusting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications Modal ── */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotifOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Notifications</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {user.name} — {notifTotal} total
                </p>
              </div>
              <button onClick={() => setNotifOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
              {notifLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-slate-800"
                  />
                ))
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No notifications found
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`rounded-lg border p-3 space-y-1 ${
                      notif.isRead
                        ? "border-slate-700 bg-slate-800/50"
                        : "border-blue-500/20 bg-blue-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white">
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-blue-400 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(notif.createdAt).toLocaleString("en-BD", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {notifPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                <button
                  disabled={notifPage <= 1}
                  onClick={() => setNotifPage((p) => p - 1)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <p className="text-xs text-slate-500">
                  {notifPage} / {notifPages}
                </p>
                <button
                  disabled={notifPage >= notifPages}
                  onClick={() => setNotifPage((p) => p + 1)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
