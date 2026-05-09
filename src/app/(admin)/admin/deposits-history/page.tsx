"use client";

import {
  Suspense,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bitcoin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Landmark,
  Loader2,
  Search,
  Smartphone,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";

const LIMIT = 20;

const STATUS_OPTIONS = [
  { label: "All Status", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  APPROVED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function getLocalDateInputValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

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

function formatMoney(value?: string | number | null) {
  return `Tk ${Number(value ?? 0).toLocaleString("en-BD")}`;
}

function formatStatsDateLabel(value?: string | null) {
  if (!value) return "Selected";
  return new Date(value).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeMethod(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getMethodMeta(method?: string | null) {
  const normalized = normalizeMethod(method);

  if (normalized.includes("bkash")) {
    return {
      label: "Bkash",
      icon: Smartphone,
      className:
        "border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-300",
    };
  }

  if (normalized.includes("nagad")) {
    return {
      label: "Nagad",
      icon: Wallet,
      className:
        "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }

  if (normalized.includes("rocket")) {
    return {
      label: "Rocket",
      icon: ArrowUpRight,
      className:
        "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    };
  }

  if (normalized.includes("bank")) {
    return {
      label: "Bank Transfer",
      icon: Landmark,
      className:
        "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }

  if (normalized.includes("usdt")) {
    return {
      label: "USDT",
      icon: Bitcoin,
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: method || "Unknown",
    icon: CreditCard,
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };
}

function getAgentNumbers(deposit: any) {
  const numbers: string[] = [];
  const push = (label: string, value?: string | null) => {
    if (!value) return;
    numbers.push(`${label}: ${value}`);
  };

  push("Selected", deposit?.agentNumber);
  push("Bkash", deposit?.agent?.bkashNumber);
  push("Nagad", deposit?.agent?.nagadNumber);
  push("Rocket", deposit?.agent?.rocketNumber);
  push("Bank", deposit?.agent?.bankNumber);
  push("USDT", deposit?.agent?.usdtNumber);

  if (Array.isArray(deposit?.agent?.extraMethods)) {
    deposit.agent.extraMethods.forEach((method: any) => {
      if (method?.number) {
        numbers.push(`${method?.name || "Extra"}: ${method.number}`);
      }
    });
  }

  return [...new Set(numbers)];
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DepositsHistoryContent() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("userId") || "";
  const today = useMemo(() => getLocalDateInputValue(), []);
  const selectedDateRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("ALL");
  const [selectedDate, setSelectedDate] = useState(today);

  const deferredSearch = useDeferredValue(search.trim());

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      "admin-deposits-history",
      page,
      deferredSearch,
      status,
      selectedDate,
      userIdFilter,
    ],
    queryFn: () =>
      AdminService.getDeposits({
        page,
        limit: LIMIT,
        search: deferredSearch || undefined,
        status: status === "ALL" ? undefined : status,
        fromDate: selectedDate,
        toDate: selectedDate,
        userId: userIdFilter || undefined,
        useTodayDefault: true,
      }),
  });

  const deposits = data?.data?.deposits ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const stats = data?.data?.stats;
  const statsDateLabel = formatStatsDateLabel(stats?.statsDate);
  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as Error | undefined)?.message ||
    "Failed to load deposit history";

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  const resetToday = () => {
    setSelectedDate(today);
    setStatus("ALL");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard
          label={`${statsDateLabel} Total Deposits`}
          value={formatMoney(stats?.todayTotalDeposits)}
          hint="Amount requested on selected date"
          icon={Wallet}
          accent="border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
        />
        <StatCard
          label={`${statsDateLabel} Pending Deposits`}
          value={String(stats?.todayPendingDeposits ?? 0)}
          hint="Pending on selected date"
          icon={Loader2}
          accent="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        />
        <StatCard
          label="Total Deposit Count"
          value={String(stats?.totalDepositCount ?? 0)}
          hint="All submitted deposits"
          icon={CreditCard}
          accent="border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,220px)_minmax(0,190px)_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by user name, phone number, transaction ID"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={selectedDateRef}
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setPage(1);
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-900 outline-none transition [color-scheme:light] focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:relative [&::-webkit-calendar-picker-indicator]:z-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          />
          <button
            type="button"
            onClick={() => openPicker(selectedDateRef)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Open date picker"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as (typeof STATUS_OPTIONS)[number]["value"]);
              setPage(1);
            }}
            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={resetToday}
          className="h-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-300"
        >
          Today
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-950 dark:text-white">
              User Deposit History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {selectedDate} deposits, {total} records found
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {userIdFilter ? (
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                Filtered by user
              </span>
            ) : null}
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/70">
                {[
                  "SI No",
                  "User Name",
                  "Email",
                  "Phone Number",
                  "Deposit Amount",
                  "Payment Method",
                  "Transaction ID",
                  "Sender Number",
                  "Deposit Date & Time",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-900">
                    {Array.from({ length: 11 }).map((__, columnIndex) => (
                      <td key={columnIndex} className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-rose-500">
                    {errorMessage}
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                    No matching deposit history found
                  </td>
                </tr>
              ) : (
                deposits.map((deposit: any, index: number) => {
                  const method = getMethodMeta(deposit.paymentMethod);
                  const MethodIcon = method.icon;
                  const rowNumber = (page - 1) * LIMIT + index + 1;

                  return (
                    <tr key={deposit.id} className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-900 dark:hover:bg-slate-900/60">
                      <td className="px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{rowNumber}</td>
                      <td className="px-4 py-4"><p className="text-sm font-semibold text-slate-950 dark:text-white">{deposit.user?.name ?? "-"}</p></td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{deposit.user?.email ?? "-"}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{deposit.user?.phone ?? "-"}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-950 dark:text-white">{formatMoney(deposit.amount)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${method.className}`}>
                          <MethodIcon className="h-3.5 w-3.5" />
                          {method.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">{deposit.transactionId ?? "-"}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{deposit.senderNumber ?? "-"}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">{formatDateTime(deposit.createdAt)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[deposit.status] ?? STATUS_STYLES.PENDING}`}>
                          {deposit.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/deposits/history/${deposit.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            : null}
          {!isLoading && isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          ) : null}
          {!isLoading && !isError && deposits.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No matching deposit history found
            </div>
          ) : null}
          {!isLoading && !isError
            ? deposits.map((deposit: any, index: number) => {
                const method = getMethodMeta(deposit.paymentMethod);
                const MethodIcon = method.icon;
                const rowNumber = (page - 1) * LIMIT + index + 1;
                return (
                  <div key={deposit.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {rowNumber}. {deposit.user?.name ?? "-"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {deposit.user?.email ?? "-"}
                        </p>
                      </div>
                      <Link
                        href={`/admin/deposits/history/${deposit.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Phone Number", deposit.user?.phone ?? "-"],
                        ["Deposit Amount", formatMoney(deposit.amount)],
                        ["Transaction ID", deposit.transactionId ?? "-"],
                        ["Sender Number", deposit.senderNumber ?? "-"],
                        ["Deposit Date & Time", formatDateTime(deposit.createdAt)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${method.className}`}>
                        <MethodIcon className="h-3.5 w-3.5" />
                        {method.label}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[deposit.status] ?? STATUS_STYLES.PENDING}`}>
                        {deposit.status}
                      </span>
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDepositsHistoryPage() {
  return (
    <Suspense fallback={<div className="p-4 text-slate-400">Loading...</div>}>
      <DepositsHistoryContent />
    </Suspense>
  );
}
