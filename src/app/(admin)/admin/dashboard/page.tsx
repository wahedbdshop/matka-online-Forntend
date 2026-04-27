/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  TrendingUp,
  Clock,
  CheckCircle,
  Activity,
  RefreshCw,
  ArrowRight,
  Wallet,
  Smartphone,
  UserCheck,
  Monitor,
  MapPin,
  Wifi,
  ShieldAlert,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

const fmt = (n: number | string) => Number(n ?? 0).toLocaleString("en-BD");

function pickMetric(source: any, ...paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<any>((acc, key) => acc?.[key], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function normalizeKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findMetricDeep(source: any, targetKeys: string[]) {
  const normalizedTargets = targetKeys.map(normalizeKey);
  const visited = new WeakSet<object>();

  const walk = (value: any): any => {
    if (!value || typeof value !== "object") return undefined;
    if (visited.has(value)) return undefined;
    visited.add(value);

    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = normalizeKey(key);
      if (
        normalizedTargets.some(
          (target) =>
            normalizedKey === target ||
            normalizedKey.includes(target),
        )
      ) {
        if (child !== undefined && child !== null && child !== "") return child;
      }

      const nested = walk(child);
      if (nested !== undefined) return nested;
    }

    return undefined;
  };

  return walk(source);
}

function pickMetricFromArray(
  source: any,
  labelKeys: string[],
  valueKeys = ["value", "amount", "total", "sum", "count"],
) {
  if (!Array.isArray(source)) return undefined;

  const normalizedLabels = labelKeys.map(normalizeKey);
  const normalizedValueKeys = valueKeys.map(normalizeKey);

  for (const item of source) {
    if (!item || typeof item !== "object") continue;

    const itemEntries = Object.entries(item);
    const labelMatch = itemEntries.some(([key, value]) => {
      const normalizedKey = normalizeKey(key);
      const normalizedValue = normalizeKey(String(value ?? ""));

      if (
        normalizedKey !== "label" &&
        normalizedKey !== "name" &&
        normalizedKey !== "title" &&
        normalizedKey !== "key"
      ) {
        return false;
      }

      return normalizedLabels.some(
        (target) =>
          normalizedValue === target ||
          normalizedValue.includes(target) ||
          target.includes(normalizedValue),
      );
    });

    if (!labelMatch) continue;

    for (const [key, value] of itemEntries) {
      const normalizedKey = normalizeKey(key);
      if (
        normalizedValueKeys.includes(normalizedKey) &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }
  }

  return undefined;
}

function pickSectionMetric(
  source: any,
  sectionKeys: string[],
  metricPaths: string[],
  deepMetricKeys: string[],
) {
  for (const sectionKey of sectionKeys) {
    const section = source?.[sectionKey];
    if (!section) continue;

    const direct = pickMetric(section, ...metricPaths);
    if (direct !== 0) return direct;

    const deep = findMetricDeep(section, deepMetricKeys);
    if (deep !== undefined && deep !== null && deep !== "") return deep;
  }

  return undefined;
}

function pickFirstValue(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return 0;
}

function normalizeSessionList(source: any): any[] {
  if (Array.isArray(source)) return source;

  // Check one level deep
  const level1 = [
    source?.data,
    source?.sessions,
    source?.items,
    source?.results,
    source?.list,
    source?.rows,
  ];

  for (const candidate of level1) {
    if (Array.isArray(candidate)) return candidate;
  }

  // Check two levels deep (e.g. { data: { sessions: [...] } })
  const inner = source?.data ?? source?.result ?? source?.payload;
  if (inner && typeof inner === "object") {
    const level2 = [
      inner?.sessions,
      inner?.items,
      inner?.results,
      inner?.list,
      inner?.rows,
      inner?.data,
    ];
    for (const candidate of level2) {
      if (Array.isArray(candidate)) return candidate;
    }
  }

  return [];
}

function parseUserAgent(ua: string): string {
  if (!ua || ua.length < 5) return ua || "Unknown Device";

  // Detect browser
  let browser = "Browser";
  if (ua.includes("Edg/") || ua.includes("EdgA/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "IE";

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("iPhone")) {
    const m = ua.match(/OS (\d+[_\d]*)/);
    os = `iOS ${m ? m[1].replace(/_/g, ".") : ""}`.trim();
  } else if (ua.includes("iPad")) {
    const m = ua.match(/OS (\d+[_\d]*)/);
    os = `iPadOS ${m ? m[1].replace(/_/g, ".") : ""}`.trim();
  } else if (ua.includes("Android")) {
    const m = ua.match(/Android ([0-9.]+)/);
    os = `Android ${m ? m[1] : ""}`.trim();
  } else if (ua.includes("Windows NT 10.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("Windows NT 6.3")) {
    os = "Windows 8.1";
  } else if (ua.includes("Windows NT 6.1")) {
    os = "Windows 7";
  } else if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS X")) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    os = `macOS ${m ? m[1].replace(/_/g, ".") : ""}`.trim();
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return `${browser} on ${os}`;
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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
  showValues,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  href?: string;
  showValues: boolean;
}) {
  const masked = "••••••";
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 dark:bg-slate-800/50 dark:shadow-none",
        href ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-slate-800" : "",
        color === "blue" && "border-blue-500/20",
        color === "green" && "border-emerald-500/20",
        color === "yellow" && "border-yellow-500/20",
        color === "purple" && "border-purple-500/20",
        color === "red" && "border-red-500/20",
        color === "cyan" && "border-cyan-500/20",
      )}
    >
      {/* top shimmer */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-px",
          color === "blue" &&
            "bg-gradient-to-r from-transparent via-blue-500/60 to-transparent",
          color === "green" &&
            "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent",
          color === "yellow" &&
            "bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent",
          color === "purple" &&
            "bg-gradient-to-r from-transparent via-purple-500/60 to-transparent",
          color === "red" &&
            "bg-gradient-to-r from-transparent via-red-500/60 to-transparent",
          color === "cyan" &&
            "bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent",
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border",
            color === "blue" &&
              "bg-blue-500/10 border-blue-500/30 text-blue-400",
            color === "green" &&
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
            color === "yellow" &&
              "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
            color === "purple" &&
              "bg-purple-500/10 border-purple-500/30 text-purple-400",
            color === "red" && "bg-red-500/10 border-red-500/30 text-red-400",
            color === "cyan" &&
              "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {href && (
          <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400" />
        )}
      </div>

      <div className="mt-3">
        <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
          {showValues ? value : masked}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-600">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40 dark:shadow-none">
      <div className="mb-3 h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="mb-1.5 h-6 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { canRunAdminQuery, isAuthReady } = useAdminAuth();
  const [showValues, setShowValues] = useState(true);
  const { data, isLoading: isDashboardLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => AdminService.getDashboardStats(),
    enabled: canRunAdminQuery,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const { data: smsStatsData, isLoading: smsStatsLoading } = useQuery({
    queryKey: ["sms-webhook-stats"],
    queryFn: () => AdminService.getSmsWebhookStats(),
    enabled: canRunAdminQuery,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["admin-active-sessions"],
    queryFn: () => AdminService.getActiveSessions(),
    enabled: canRunAdminQuery,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Show skeleton while auth is bootstrapping OR data is fetching for the first time
  const isLoading = !isAuthReady || isDashboardLoading;

  const d = data?.data;
  const smsStats = smsStatsData?.data;
  const sessions = normalizeSessionList(sessionsData);
  const totalUsers = pickFirstValue(
    pickMetric(
      d,
      "users.total",
      "summary.totalUsers",
      "summary.users.total",
      "totals.users",
      "totals.totalUsers",
      "totalUsers",
      "userCount",
      "usersCount",
    ),
    pickSectionMetric(
      d,
      ["users", "user", "summary", "totals"],
      ["total", "count", "totalUsers", "usersTotal", "userCount"],
      ["totalUsers", "usersCount", "userCount", "registeredUsers"],
    ),
    pickMetricFromArray(d?.metrics, ["totalUsers", "users", "registeredUsers"]),
    pickMetricFromArray(d?.summary, ["totalUsers", "users", "registeredUsers"]),
  );
  const activeUsers = pickFirstValue(
    pickMetric(
      d,
      "users.active",
      "summary.activeUsers",
      "summary.users.active",
      "totals.activeUsers",
      "activeUsers",
      "usersActive",
    ),
    pickSectionMetric(
      d,
      ["users", "user", "summary", "totals"],
      ["active", "activeUsers", "usersActive", "currentlyActive"],
      ["activeUsers", "usersActive", "currentlyActive"],
    ),
    pickMetricFromArray(d?.metrics, ["activeUsers", "usersActive"]),
    pickMetricFromArray(d?.summary, ["activeUsers", "usersActive"]),
  );
  const newUsersToday = pickFirstValue(
    pickMetric(
      d,
      "users.newToday",
      "users.todayNew",
      "summary.newUsersToday",
      "summary.users.newToday",
      "newUsersToday",
      "newToday",
    ),
    pickSectionMetric(
      d,
      ["users", "user", "summary"],
      ["newToday", "todayNew", "todayCount", "newUsersToday"],
      ["newUsersToday", "newToday", "todayNew"],
    ),
    pickMetricFromArray(d?.metrics, ["newUsersToday", "newToday"]),
    pickMetricFromArray(d?.summary, ["newUsersToday", "newToday"]),
  );
  const pendingDeposits = pickFirstValue(
    pickMetric(
      d,
      "deposits.pending",
      "deposit.pending",
      "summary.pendingDeposits",
      "pendingDeposits",
    ),
    pickSectionMetric(
      d,
      ["deposits", "deposit", "summary"],
      ["pending", "pendingCount", "pendingDeposits"],
      ["pendingDeposits", "pendingCount", "pending"],
    ),
    pickMetricFromArray(d?.metrics, ["pendingDeposits", "depositPending"]),
    pickMetricFromArray(d?.summary, ["pendingDeposits", "depositPending"]),
  );
  const pendingWithdrawals = pickFirstValue(
    pickMetric(
      d,
      "withdrawals.pending",
      "withdrawal.pending",
      "summary.pendingWithdrawals",
      "pendingWithdrawals",
    ),
    pickSectionMetric(
      d,
      ["withdrawals", "withdrawal", "summary"],
      ["pending", "pendingCount", "pendingWithdrawals"],
      ["pendingWithdrawals", "pendingCount", "pending"],
    ),
    pickMetricFromArray(d?.metrics, ["pendingWithdrawals", "withdrawalPending"]),
    pickMetricFromArray(d?.summary, ["pendingWithdrawals", "withdrawalPending"]),
  );
  const depositsTodayTotal = pickFirstValue(
    pickMetric(
      d,
      "deposits.todayTotal",
      "deposits.totalToday",
      "summary.deposits.todayTotal",
      "summary.todayDepositTotal",
      "todayDepositTotal",
    ),
    pickSectionMetric(
      d,
      ["deposits", "deposit", "summary"],
      ["todayTotal", "totalToday", "todayAmount", "todayDepositTotal"],
      ["todayDepositTotal", "todayTotal", "todayAmount"],
    ),
    pickMetricFromArray(d?.metrics, ["todayDepositTotal", "depositsToday"]),
    pickMetricFromArray(d?.summary, ["todayDepositTotal", "depositsToday"]),
  );
  const depositsTodayCount = pickFirstValue(
    pickMetric(
      d,
      "deposits.todayCount",
      "deposits.countToday",
      "summary.deposits.todayCount",
      "summary.todayDepositCount",
      "todayDepositCount",
    ),
    pickSectionMetric(
      d,
      ["deposits", "deposit", "summary"],
      ["todayCount", "countToday", "todayRequests", "todayDepositCount"],
      ["todayDepositCount", "todayCount", "countToday"],
    ),
    pickMetricFromArray(d?.metrics, ["todayDepositCount", "depositsTodayCount"]),
    pickMetricFromArray(d?.summary, ["todayDepositCount", "depositsTodayCount"]),
  );
  const withdrawalsTodayTotal = pickFirstValue(
    pickMetric(
      d,
      "withdrawals.todayTotal",
      "withdrawals.totalToday",
      "summary.withdrawals.todayTotal",
      "summary.todayWithdrawalTotal",
      "todayWithdrawalTotal",
    ),
    pickSectionMetric(
      d,
      ["withdrawals", "withdrawal", "summary"],
      ["todayTotal", "totalToday", "todayAmount", "todayWithdrawalTotal"],
      ["todayWithdrawalTotal", "todayTotal", "todayAmount"],
    ),
    pickMetricFromArray(d?.metrics, ["todayWithdrawalTotal", "withdrawalsToday"]),
    pickMetricFromArray(d?.summary, ["todayWithdrawalTotal", "withdrawalsToday"]),
  );
  const withdrawalsTodayCount = pickFirstValue(
    pickMetric(
      d,
      "withdrawals.todayCount",
      "withdrawals.countToday",
      "summary.withdrawals.todayCount",
      "summary.todayWithdrawalCount",
      "todayWithdrawalCount",
    ),
    pickSectionMetric(
      d,
      ["withdrawals", "withdrawal", "summary"],
      ["todayCount", "countToday", "todayRequests", "todayWithdrawalCount"],
      ["todayWithdrawalCount", "todayCount", "countToday"],
    ),
    pickMetricFromArray(d?.metrics, ["todayWithdrawalCount", "withdrawalsTodayCount"]),
    pickMetricFromArray(d?.summary, ["todayWithdrawalCount", "withdrawalsTodayCount"]),
  );
  const betsTodayCount = pickFirstValue(
    pickMetric(
      d,
      "bets.todayCount",
      "bets.totalToday",
      "summary.bets.todayCount",
      "summary.todayBetCount",
      "todayBetCount",
    ),
    pickSectionMetric(
      d,
      ["bets", "bet", "summary"],
      ["todayCount", "countToday", "totalToday", "todayBetCount"],
      ["todayBetCount", "todayCount", "countToday"],
    ),
    pickMetricFromArray(d?.metrics, ["todayBetCount", "betsToday"]),
    pickMetricFromArray(d?.summary, ["todayBetCount", "betsToday"]),
  );
  const thaiBetsTodayCount = pickFirstValue(
    pickMetric(
      d,
      "bets.thaiToday",
      "bets.thai.todayCount",
      "summary.bets.thaiToday",
      "summary.thaiBetsToday",
      "thaiBetsToday",
      "thaiToday",
    ),
    pickSectionMetric(
      d,
      ["bets", "bet", "summary"],
      ["thaiToday", "thaiCountToday", "thaiBetsToday"],
      ["thaiBetsToday", "thaiToday", "thaiCountToday"],
    ),
    pickMetricFromArray(d?.metrics, ["thaiBetsToday", "thaiToday"]),
    pickMetricFromArray(d?.summary, ["thaiBetsToday", "thaiToday"]),
  );

  if (!isAuthReady) {
    return <div className="space-y-6" />;
  }

  if (!canRunAdminQuery) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {new Date().toLocaleString("en-BD", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValues((v) => !v)}
            title={showValues ? "Hide values" : "Show values"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-all",
              showValues
                ? "border-violet-300 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
            )}
          >
            {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Overview ── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
          Overview
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total Users"
                value={fmt(totalUsers)}
                sub="All registered accounts"
                color="blue"
                href="/admin/users"
                showValues={showValues}
              />
              <StatCard
                icon={UserCheck}
                label="Active Users"
                value={fmt(activeUsers)}
                sub="Logged in last 15 days"
                color="green"
                href="/admin/users/active"
                showValues={showValues}
              />
              <StatCard
                icon={Activity}
                label="New Today"
                value={fmt(newUsersToday)}
                sub="Registered today"
                color="cyan"
                showValues={showValues}
              />
              <StatCard
                icon={Clock}
                label="Pending Deposits"
                value={fmt(pendingDeposits)}
                sub="Awaiting review"
                color="yellow"
                href="/admin/deposits"
                showValues={showValues}
              />
              <StatCard
                icon={Clock}
                label="Pending Withdrawals"
                value={fmt(pendingWithdrawals)}
                sub="Awaiting approval"
                color="red"
                href="/admin/withdrawals"
                showValues={showValues}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Deposits ── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
          Deposits
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {isLoading || smsStatsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard icon={ArrowDownToLine} label="Today's Deposits" value={`Rs ${fmt(depositsTodayTotal)}`} sub={`${fmt(depositsTodayCount)} transactions`} color="green" showValues={showValues} />
              <StatCard icon={CheckCircle} label="Approved Today" value={fmt(depositsTodayCount)} sub="Deposit requests" color="green" showValues={showValues} />
              <StatCard icon={Smartphone} label="SMS Auto Deposit" value={fmt(smsStats?.today ?? 0)} sub={smsStats?.isEnabled ? `${fmt(smsStats?.matched ?? 0)} matched` : "Currently disabled"} color={smsStats?.isEnabled ? "cyan" : "red"} href="/admin/sms-auto-deposit" showValues={showValues} />
            </>
          )}
        </div>
      </section>

      {/* ── Withdrawals ── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
          Withdrawals
        </p>
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard icon={ArrowUpFromLine} label="Today's Withdrawals" value={`Rs ${fmt(withdrawalsTodayTotal)}`} sub={`${fmt(withdrawalsTodayCount)} transactions`} color="purple" showValues={showValues} />
              <StatCard icon={Wallet} label="Processed Today" value={fmt(withdrawalsTodayCount)} sub="Withdrawal requests" color="purple" showValues={showValues} />
            </>
          )}
        </div>
      </section>

      {/* ── Bets ── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
          Bets Today
        </p>
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard icon={TrendingUp} label="Total Bets Today" value={fmt(betsTodayCount)} sub="All games combined" color="cyan" showValues={showValues} />
              <StatCard icon={Gamepad2} label="Thai Lottery" value={fmt(thaiBetsTodayCount)} sub="Bets placed today" color="blue" href="/admin/thai-lottery" showValues={showValues} />
            </>
          )}
        </div>
      </section>

      {/* ── Active Sessions ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Active Sessions
          </p>
          <button
            onClick={() => refetchSessions()}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/40"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm dark:border-slate-700/40 dark:bg-slate-800/30 dark:shadow-none">
            <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-slate-400 dark:text-slate-600" />
            <p className="text-xs text-slate-500">No active session data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session: any, i: number) => {
              const sessionId =
                pickSessionValue(session, ["id", "_id", "sessionId", "session_id", "sid"]) ?? i;
              const isCurrent = normalizeBoolean(
                pickSessionValue(session, [
                  "isCurrent",
                  "is_current",
                  "current",
                  "isThisDevice",
                  "device.isCurrent",
                ]),
              );
              const rawDeviceLabel = pickSessionValue(session, [
                "deviceName",
                "device.name",
                "device.label",
                "device.model",
                "deviceInfo.deviceName",
                "deviceInfo.name",
                "browser",
                "browserName",
                "deviceInfo.browser",
              ]);
              const rawUserAgent = pickSessionValue(session, [
                "userAgent",
                "user_agent",
                "ua",
                "device.userAgent",
                "deviceInfo.userAgent",
              ]);
              const deviceLabel =
                rawDeviceLabel ??
                (rawUserAgent ? parseUserAgent(String(rawUserAgent)) : "Unknown Device");
              const sessionIp =
                pickSessionValue(session, [
                  "ipAddress",
                  "ip",
                  "ip_address",
                  "ipv4",
                  "client_ip",
                  "clientIp",
                  "location.ip",
                  "device.ipAddress",
                  "device.ip",
                  "meta.ip",
                ]) ?? "—";
              const sessionLocation = [
                pickSessionValue(session, ["city", "cityName", "location.city", "geo.city"]),
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
              const sessionLastActive = pickSessionValue(session, [
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
                key={sessionId}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm dark:bg-slate-800/50 dark:shadow-none",
                  isCurrent
                    ? "border-violet-200 dark:border-purple-500/30"
                    : "border-slate-200 dark:border-slate-700/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    isCurrent
                      ? "border-violet-200 bg-violet-50 text-violet-600 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600/30 dark:bg-slate-700/40 dark:text-slate-400",
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {deviceLabel}
                    </p>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-600 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-400">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Wifi className="h-2.5 w-2.5" />
                      {sessionIp === "::1"
                        ? "127.0.0.1 (localhost)"
                        : String(sessionIp).startsWith("::ffff:")
                          ? String(sessionIp).replace("::ffff:", "")
                          : sessionIp}
                    </span>
                    {sessionLocation && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <MapPin className="h-2.5 w-2.5" />
                        {sessionLocation}
                      </span>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">
                  {sessionLastActive
                    ? new Date(sessionLastActive).toLocaleString("en-BD", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Quick Actions ── */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Deposit Requests",
              href: "/admin/deposits",
              color: "text-green-400  bg-green-500/10  border-green-500/20",
            },
            {
              label: "Withdrawals",
              href: "/admin/withdrawals",
              color: "text-red-400    bg-red-500/10    border-red-500/20",
            },
            {
              label: "KYC Pending",
              href: "/admin/kyc",
              color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
            },
            {
              label: "Support Tickets",
              href: "/admin/tickets",
              color: "text-blue-400   bg-blue-500/10   border-blue-500/20",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold transition-all hover:scale-[1.02]",
                item.color,
              )}
            >
              {item.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
