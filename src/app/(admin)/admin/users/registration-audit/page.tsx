"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  Globe,
  Monitor,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminService,
  type AdminRegistrationAuditIpAccount,
  type AdminUserRegistrationAudit,
} from "@/services/admin.service";

const LIMIT = 20;

const SOURCE_OPTIONS = [
  { label: "All Sources", value: "ALL" },
  { label: "Frontend", value: "FRONTEND" },
  { label: "Direct API", value: "DIRECT_API" },
  { label: "Unverified Web", value: "UNVERIFIED_WEB" },
  { label: "Unknown", value: "UNKNOWN" },
] as const;

const RISK_OPTIONS = [
  { label: "All Risk", value: "ALL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getLocalDateInputValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getUserInitials(user: AdminUserRegistrationAudit) {
  const source = user.name?.trim() || user.username?.trim() || "U";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function riskClassName(riskLevel: string) {
  if (riskLevel === "HIGH") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }
  if (riskLevel === "MEDIUM") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

export default function UserRegistrationAuditPage() {
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateInputValue());
  const [search, setSearch] = useState("");
  const [source, setSource] =
    useState<(typeof SOURCE_OPTIONS)[number]["value"]>("ALL");
  const [riskLevel, setRiskLevel] =
    useState<(typeof RISK_OPTIONS)[number]["value"]>("ALL");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [selectedIpAddress, setSelectedIpAddress] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "admin-user-registration-audit",
      selectedDate,
      deferredSearch,
      source,
      riskLevel,
      suspiciousOnly,
      page,
    ],
    queryFn: () =>
      AdminService.getUserRegistrationAudit({
        page,
        limit: LIMIT,
        search: deferredSearch || undefined,
        source: source === "ALL" ? undefined : source,
        riskLevel: riskLevel === "ALL" ? undefined : riskLevel,
        date: selectedDate,
        suspiciousOnly,
      }),
  });

  const audits = useMemo(() => data?.data?.audits ?? [], [data]);
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const summary = data?.data?.summary;
  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as Error | undefined)?.message ||
    "Failed to load registration audit";

  const {
    data: ipAccountsData,
    isLoading: isIpAccountsLoading,
    isError: isIpAccountsError,
    error: ipAccountsError,
  } = useQuery({
    queryKey: ["admin-registration-audit-ip-accounts", selectedIpAddress],
    enabled: Boolean(selectedIpAddress),
    queryFn: () =>
      AdminService.getRegistrationAuditAccountsByIp(selectedIpAddress!),
  });

  const ipAccounts = ipAccountsData?.data?.accounts ?? [];
  const ipAccountsErrorMessage =
    (ipAccountsError as any)?.response?.data?.message ||
    (ipAccountsError as Error | undefined)?.message ||
    "Failed to load accounts for this IP";

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  const openIpAccountsDialog = (ipAddress?: string | null) => {
    if (!ipAddress) return;
    setSelectedIpAddress(ipAddress);
  };

  const closeIpAccountsDialog = () => {
    setSelectedIpAddress(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600">
              Registration Audit
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Direct API and suspicious signup monitor
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Existing register info page untouched rekhe ekhane sudhu source, flags,
              origin/referer, ar same IP cluster dekhano hocche.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">High risk</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                {summary?.highRiskCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct API</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                {summary?.directApiCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Suspicious</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                {summary?.suspiciousCount ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_200px_180px_180px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search user, IP, source, UA, origin..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as (typeof SOURCE_OPTIONS)[number]["value"]);
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={riskLevel}
          onChange={(e) => {
            setRiskLevel(
              e.target.value as (typeof RISK_OPTIONS)[number]["value"],
            );
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          {RISK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={openDatePicker}
          className="flex h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <span>{summary?.selectedDate || selectedDate}</span>
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="sr-only"
          />
        </button>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <input
          type="checkbox"
          checked={suspiciousOnly}
          onChange={(e) => {
            setSuspiciousOnly(e.target.checked);
            setPage(1);
          }}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Show suspicious entries only
      </label>

      <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-slate-900/70">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Source</th>
                <th className="px-5 py-4">Risk</th>
                <th className="px-5 py-4">IP / Device</th>
                <th className="px-5 py-4">Origin</th>
                <th className="px-5 py-4">Flags</th>
                <th className="px-5 py-4">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                    Loading registration audit...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-rose-500">
                    {errorMessage}
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                    No audit entries found
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
                  <tr key={audit.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-800">
                          <AvatarFallback className="bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                            {getUserInitials(audit)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/users/${audit.userId}`}
                            className="truncate font-medium text-slate-900 hover:text-cyan-600 dark:text-white"
                          >
                            {audit.name}
                          </Link>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            @{audit.username} • {audit.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Status: {audit.accountStatus}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        <Globe className="h-3.5 w-3.5" />
                        {audit.source}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskClassName(audit.riskLevel)}`}>
                        {audit.riskLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-medium">{audit.ipAddress || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {audit.deviceName || audit.browser || "Unknown device"}
                      </p>
                      <button
                        type="button"
                        onClick={() => openIpAccountsDialog(audit.ipAddress)}
                        disabled={!audit.ipAddress || audit.sameIpAccountCount <= 0}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs text-cyan-600 transition hover:text-cyan-700 disabled:cursor-default disabled:text-slate-400 dark:text-cyan-400 dark:hover:text-cyan-300 dark:disabled:text-slate-500"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Same IP accounts: {audit.sameIpAccountCount}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <p className="max-w-xs truncate">{audit.origin || "-"}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {audit.referer || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-wrap gap-2">
                        {audit.flags.length > 0 ? (
                          audit.flags.map((flag) => (
                            <span
                              key={flag}
                              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              {flag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No flags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <p>{formatDateTime(audit.registeredAt)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {audit.location || "Location unavailable"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:hidden">
        {isLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
            Loading registration audit...
          </div>
        ) : isError ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-4 py-10 text-center text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : (
          audits.map((audit) => (
            <div
              key={audit.id}
              className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-slate-200 dark:border-slate-800">
                    <AvatarFallback className="bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                      {getUserInitials(audit)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/admin/users/${audit.userId}`}
                      className="font-medium text-slate-900 dark:text-white"
                    >
                      {audit.name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      @{audit.username}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskClassName(audit.riskLevel)}`}>
                  {audit.riskLevel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span>{audit.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => openIpAccountsDialog(audit.ipAddress)}
                    disabled={!audit.ipAddress || audit.sameIpAccountCount <= 0}
                    className="inline-flex items-center gap-1.5 text-left text-cyan-600 transition hover:text-cyan-700 disabled:cursor-default disabled:text-slate-400 dark:text-cyan-400 dark:hover:text-cyan-300 dark:disabled:text-slate-500"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Same IP accounts: {audit.sameIpAccountCount}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-400" />
                  <span>{audit.deviceName || audit.browser || "Unknown device"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate">{audit.origin || "-"}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {audit.referer || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {audit.flags.length > 0 ? (
                    audit.flags.map((flag) => (
                      <span
                        key={flag}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {flag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No flags</span>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  Registered {formatDateTime(audit.registeredAt)} • {audit.location || "Location unavailable"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing page {page} of {totalPages} • {total} records
          {isFetching && !isLoading ? " • refreshing..." : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium text-slate-900 dark:text-white">
              How to identify a suspicious entry
            </p>
            <p>`DIRECT_API` + `API_TOOL_USER_AGENT` is a strong signal.</p>
            <p>`MISSING_ORIGIN` / `MISSING_REFERER` suggests a possible form bypass.</p>
            <p>`MULTI_ACCOUNT_IP` means 4+ accounts were detected from the same IP.</p>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedIpAddress)}
        onOpenChange={(open) => {
          if (!open) closeIpAccountsDialog();
        }}
      >
        <DialogContent className="max-w-3xl bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
          <DialogHeader>
            <DialogTitle>Accounts Using the Same IP</DialogTitle>
            <DialogDescription>
              {selectedIpAddress
                ? `Showing accounts registered from IP ${selectedIpAddress}.`
                : "Showing accounts for the selected IP."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {isIpAccountsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                Loading accounts...
              </div>
            ) : isIpAccountsError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-10 text-center text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {ipAccountsErrorMessage}
              </div>
            ) : ipAccounts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                No accounts found for this IP.
              </div>
            ) : (
              <div className="space-y-3">
                {ipAccounts.map((account: AdminRegistrationAuditIpAccount) => (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${account.userId}`}
                          className="font-medium text-slate-900 hover:text-cyan-600 dark:text-white"
                        >
                          {account.name}
                        </Link>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          @{account.username} • {account.email}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Status: {account.accountStatus}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${riskClassName(account.riskLevel)}`}
                        >
                          {account.riskLevel}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {account.source}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                      <p>Registered: {formatDateTime(account.registeredAt)}</p>
                      <p>Account Created: {formatDateTime(account.accountCreatedAt)}</p>
                      <p>Phone: {account.phone || "-"}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.flags.length > 0 ? (
                        account.flags.map((flag) => (
                          <span
                            key={`${account.id}-${flag}`}
                            className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                          >
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No flags</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
