/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-slate-800/50 p-4 transition-all duration-200",
        href ? "hover:border-slate-500 hover:bg-slate-800 cursor-pointer" : "",
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
          <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-white font-mono">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 animate-pulse">
      <div className="h-9 w-9 rounded-xl bg-slate-700 mb-3" />
      <div className="h-6 w-20 rounded bg-slate-700 mb-1.5" />
      <div className="h-3 w-24 rounded bg-slate-700" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { canRunAdminQuery, isAuthReady } = useAdminAuth();
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
  const totalDeposit =
    pickMetric(
      d,
      "revenue.totalDeposit",
      "revenue.depositTotal",
      "revenue.totalDeposits",
      "revenue.depositsTotal",
      "revenue.approvedDepositTotal",
      "revenue.totalApprovedDeposit",
      "revenue.totalApprovedDeposits",
      "revenue.allTimeApprovedDeposit",
      "revenue.allTimeApprovedDeposits",
      "revenue.total_deposit",
      "summary.totalDeposit",
      "summary.depositTotal",
      "summary.totalDeposits",
      "summary.depositsTotal",
      "summary.approvedDepositTotal",
      "summary.totalApprovedDeposit",
      "summary.totalApprovedDeposits",
      "summary.allTimeApprovedDeposit",
      "summary.allTimeApprovedDeposits",
      "summary.total_deposit",
      "totalDeposit",
      "depositTotal",
      "totalDeposits",
      "depositsTotal",
      "approvedDepositTotal",
      "totalApprovedDeposit",
      "totalApprovedDeposits",
      "allTimeApprovedDeposit",
      "allTimeApprovedDeposits",
      "total_deposit",
    ) ||
    pickSectionMetric(
      d,
      ["deposits", "deposit", "revenue", "summary"],
      [
        "totalApprovedAmount",
        "approvedTotalAmount",
        "approvedTotal",
        "totalApproved",
        "totalApprovedDeposits",
        "approvedDepositsTotal",
        "allTimeApprovedAmount",
        "allTimeAmount",
        "total_approved_amount",
        "approvedAmount",
        "approved_amount",
        "totalAmount",
        "amountTotal",
        "sumAmount",
        "depositTotal",
        "totalDeposit",
        "totalDeposits",
        "total_amount",
      ],
      [
        "totalApprovedAmount",
        "approvedTotalAmount",
        "approvedTotal",
        "totalApproved",
        "totalApprovedDeposits",
        "approvedDepositsTotal",
        "allTimeApprovedAmount",
        "allTimeAmount",
        "total_approved_amount",
        "approvedAmount",
        "approved_amount",
        "depositAmount",
        "deposit_amount",
        "depositTotal",
        "totalDeposit",
        "totalDeposits",
      ],
    ) ||
    pickMetricFromArray(d?.metrics, [
      "totalDeposit",
      "totalDeposits",
      "approvedDeposit",
      "approvedDeposits",
    ]) ||
    pickMetricFromArray(d?.summary, [
      "totalDeposit",
      "totalDeposits",
      "approvedDeposit",
      "approvedDeposits",
    ]) ||
    0;
  const totalWithdrawal =
    pickMetric(
      d,
      "revenue.totalWithdrawal",
      "revenue.withdrawalTotal",
      "revenue.totalWithdrawals",
      "revenue.withdrawalsTotal",
      "revenue.approvedWithdrawalTotal",
      "revenue.totalApprovedWithdrawal",
      "revenue.totalApprovedWithdrawals",
      "revenue.allTimeApprovedWithdrawal",
      "revenue.allTimeApprovedWithdrawals",
      "revenue.total_withdrawal",
      "summary.totalWithdrawal",
      "summary.withdrawalTotal",
      "summary.totalWithdrawals",
      "summary.withdrawalsTotal",
      "summary.approvedWithdrawalTotal",
      "summary.totalApprovedWithdrawal",
      "summary.totalApprovedWithdrawals",
      "summary.allTimeApprovedWithdrawal",
      "summary.allTimeApprovedWithdrawals",
      "summary.total_withdrawal",
      "totalWithdrawal",
      "withdrawalTotal",
      "totalWithdrawals",
      "withdrawalsTotal",
      "approvedWithdrawalTotal",
      "totalApprovedWithdrawal",
      "totalApprovedWithdrawals",
      "allTimeApprovedWithdrawal",
      "allTimeApprovedWithdrawals",
      "total_withdrawal",
    ) ||
    pickSectionMetric(
      d,
      ["withdrawals", "withdrawal", "revenue", "summary"],
      [
        "totalApprovedAmount",
        "approvedTotalAmount",
        "approvedTotal",
        "totalApproved",
        "totalApprovedWithdrawals",
        "approvedWithdrawalsTotal",
        "allTimeApprovedAmount",
        "allTimeAmount",
        "total_approved_amount",
        "approvedAmount",
        "approved_amount",
        "totalAmount",
        "amountTotal",
        "sumAmount",
        "withdrawalTotal",
        "totalWithdrawal",
        "totalWithdrawals",
        "total_amount",
      ],
      [
        "totalApprovedAmount",
        "approvedTotalAmount",
        "approvedTotal",
        "totalApproved",
        "totalApprovedWithdrawals",
        "approvedWithdrawalsTotal",
        "allTimeApprovedAmount",
        "allTimeAmount",
        "total_approved_amount",
        "approvedAmount",
        "approved_amount",
        "withdrawalAmount",
        "withdrawal_amount",
        "withdrawalTotal",
        "totalWithdrawal",
        "totalWithdrawals",
      ],
    ) ||
    pickMetricFromArray(d?.metrics, [
      "totalWithdrawal",
      "totalWithdrawals",
      "approvedWithdrawal",
      "approvedWithdrawals",
    ]) ||
    pickMetricFromArray(d?.summary, [
      "totalWithdrawal",
      "totalWithdrawals",
      "approvedWithdrawal",
      "approvedWithdrawals",
    ]) ||
    0;
  const adminProfitRaw =
    pickMetric(
      d,
      "revenue.adminProfit",
      "revenue.admin_profit",
      "revenue.profit",
      "revenue.totalProfit",
      "revenue.profitTotal",
      "revenue.netRevenue",
      "revenue.net_revenue",
      "revenue.depositMinusWithdrawal",
      "revenue.deposit_minus_withdrawal",
      "summary.adminProfit",
      "summary.admin_profit",
      "summary.profit",
      "summary.totalProfit",
      "summary.profitTotal",
      "summary.netRevenue",
      "summary.net_revenue",
      "summary.depositMinusWithdrawal",
      "summary.deposit_minus_withdrawal",
      "adminProfit",
      "admin_profit",
      "profit",
      "totalProfit",
      "profitTotal",
      "netRevenue",
      "net_revenue",
      "depositMinusWithdrawal",
      "deposit_minus_withdrawal",
      "revenue.netProfit",
      "revenue.net_profit",
      "summary.netProfit",
      "summary.net_profit",
    ) ||
    findMetricDeep(d, [
      "adminProfit",
      "admin_profit",
      "profit",
      "totalProfit",
      "profitTotal",
      "netProfit",
      "net_profit",
      "netRevenue",
      "net_revenue",
      "depositMinusWithdrawal",
      "deposit_minus_withdrawal",
    ]) ||
    pickMetricFromArray(d?.metrics, [
      "adminProfit",
      "profit",
      "netProfit",
      "netRevenue",
    ]) ||
    pickMetricFromArray(d?.summary, [
      "adminProfit",
      "profit",
      "netProfit",
      "netRevenue",
    ]);
  const adminProfit =
    adminProfitRaw !== undefined &&
    adminProfitRaw !== null &&
    adminProfitRaw !== ""
      ? Number(adminProfitRaw)
      : Number(totalDeposit ?? 0) - Number(totalWithdrawal ?? 0);
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
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleString("en-BD", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* ── Overview ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Overview
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total Users"
                value={fmt(totalUsers)}
                sub="All registered accounts"
                color="blue"
                href="/admin/users"
              />
              <StatCard
                icon={UserCheck}
                label="Active Users"
                value={fmt(activeUsers)}
                sub="Logged in last 15 days"
                color="green"
                href="/admin/users/active"
              />
              <StatCard
                icon={Activity}
                label="New Today"
                value={fmt(newUsersToday)}
                sub="Registered today"
                color="cyan"
              />
              <StatCard
                icon={Clock}
                label="Pending Deposits"
                value={fmt(pendingDeposits)}
                sub="Awaiting review"
                color="yellow"
                href="/admin/deposits"
              />
              <StatCard
                icon={Clock}
                label="Pending Withdrawals"
                value={fmt(pendingWithdrawals)}
                sub="Awaiting approval"
                color="red"
                href="/admin/withdrawals"
              />
            </>
          )}
        </div>
      </section>
      {/* ── Revenue Summary ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Revenue Summary
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {/* Total Deposit */}
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-800/50 p-4">
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 mb-3">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-emerald-400 font-mono">
                  Rs {fmt(totalDeposit)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Total Deposits</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  All-time approved
                </p>
              </div>

              {/* Total Withdrawal */}
              <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-slate-800/50 p-4">
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-red-500/60 to-transparent" />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 mb-3">
                  <ArrowUpFromLine className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-red-400 font-mono">
                  Rs {fmt(totalWithdrawal)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Withdrawals
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  All-time approved
                </p>
              </div>

              {/* Admin Profit */}
              <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-slate-800/50 p-4">
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-yellow-500/60 to-transparent" />
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-yellow-500/10 border-yellow-500/30 text-yellow-400 mb-3">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold font-mono",
                    adminProfit >= 0
                      ? "text-yellow-400"
                      : "text-red-400",
                  )}
                >
                  Rs {fmt(Math.abs(adminProfit))}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin {adminProfit >= 0 ? "Profit" : "Loss"}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Deposit − Withdrawal
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Deposits ── */}
      {/* ── Deposits ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Deposits
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {isLoading || smsStatsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={ArrowDownToLine}
                label="Today's Deposits"
                value={`Rs ${fmt(depositsTodayTotal)}`}
                sub={`${fmt(depositsTodayCount)} transactions`}
                color="green"
              />
              <StatCard
                icon={CheckCircle}
                label="Approved Today"
                value={fmt(depositsTodayCount)}
                sub="Deposit requests"
                color="green"
              />
              <StatCard
                icon={Smartphone}
                label="SMS Auto Deposit"
                value={fmt(smsStats?.today ?? 0)}
                sub={
                  smsStats?.isEnabled
                    ? `${fmt(smsStats?.matched ?? 0)} matched`
                    : "Currently disabled"
                }
                color={smsStats?.isEnabled ? "cyan" : "red"}
                href="/admin/sms-auto-deposit"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Withdrawals ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Withdrawals
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={ArrowUpFromLine}
                label="Today's Withdrawals"
                value={`Rs ${fmt(withdrawalsTodayTotal)}`}
                sub={`${fmt(withdrawalsTodayCount)} transactions`}
                color="purple"
              />
              <StatCard
                icon={Wallet}
                label="Processed Today"
                value={fmt(withdrawalsTodayCount)}
                sub="Withdrawal requests"
                color="purple"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Bets ── */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Bets Today
        </p>
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={TrendingUp}
                label="Total Bets Today"
                value={fmt(betsTodayCount)}
                sub="All games combined"
                color="cyan"
              />
              <StatCard
                icon={Gamepad2}
                label="Thai Lottery"
                value={fmt(thaiBetsTodayCount)}
                sub="Bets placed today"
                color="blue"
                href="/admin/thai-lottery"
              />
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
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
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
                className="h-16 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-700/50"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 px-4 py-6 text-center">
            <ShieldAlert className="h-6 w-6 text-slate-600 mx-auto mb-2" />
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
                  "flex items-center gap-3 rounded-2xl border bg-slate-800/50 px-4 py-3",
                  isCurrent
                    ? "border-purple-500/30"
                    : "border-slate-700/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    isCurrent
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                      : "bg-slate-700/40 border-slate-600/30 text-slate-400",
                  )}
                >
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white truncate">
                      {deviceLabel}
                    </p>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-green-500/15 border border-green-500/30 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
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
                <p className="shrink-0 text-[10px] text-slate-600">
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
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
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
