"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AdminService,
  SmsWebhookStatus,
} from "@/services/admin.service";

const LIMIT = 20;

const STATUS_FILTERS: Array<"ALL" | SmsWebhookStatus> = [
  "ALL",
  "MATCHED",
  "UNMATCHED",
  "DUPLICATE",
];

const STATUS_STYLES: Record<SmsWebhookStatus, string> = {
  MATCHED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  UNMATCHED: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  DUPLICATE: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

const METHOD_STYLES: Record<string, string> = {
  bkash: "bg-pink-500/10 text-pink-400",
  nagad: "bg-orange-500/10 text-orange-400",
  rocket: "bg-purple-500/10 text-purple-400",
};

function formatNumber(value: number | string | undefined) {
  return Number(value ?? 0).toLocaleString("en-BD");
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MiniStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof Activity;
  tone: "blue" | "green" | "yellow" | "red" | "cyan";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-slate-800/50 p-4",
        tone === "blue" && "border-blue-500/20",
        tone === "green" && "border-emerald-500/20",
        tone === "yellow" && "border-yellow-500/20",
        tone === "red" && "border-rose-500/20",
        tone === "cyan" && "border-cyan-500/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white font-mono">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{sub}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            tone === "blue" && "border-blue-500/30 bg-blue-500/10 text-blue-400",
            tone === "green" &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
            tone === "yellow" &&
              "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
            tone === "red" && "border-rose-500/30 bg-rose-500/10 text-rose-400",
            tone === "cyan" && "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function AdminSmsAutoDepositPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | SmsWebhookStatus>("ALL");

  const {
    data: statsResponse,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["sms-webhook-stats"],
    queryFn: () => AdminService.getSmsWebhookStats(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const { data: logsResponse, isLoading: logsLoading } = useQuery({
    queryKey: ["sms-webhook-logs", page, status],
    queryFn: () =>
      AdminService.getSmsWebhookLogs({
        page,
        limit: LIMIT,
        status: status === "ALL" ? undefined : status,
      }),
  });

  const { mutate: toggleWebhook, isPending: togglePending } = useMutation({
    mutationFn: (enabled: boolean) => AdminService.toggleSmsWebhook(enabled),
    onSuccess: (response) => {
      toast.success(
        response.data.isEnabled
          ? "SMS auto deposit is now enabled"
          : "SMS auto deposit is now disabled",
      );
      queryClient.invalidateQueries({ queryKey: ["sms-webhook-stats"] });
      queryClient.invalidateQueries({ queryKey: ["sms-webhook-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message
          : "Failed to update toggle";
      toast.error(message || "Failed to update toggle");
    },
  });

  const stats = statsResponse?.data;
  const logsData = logsResponse?.data;
  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">SMS Auto Deposit</h1>
          <p className="mt-1 text-xs text-slate-400">
            Track SMS webhook matching, duplicates, and unmatched deposit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetchStats()}
            disabled={statsFetching}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", statsFetching && "animate-spin")}
            />
            Refresh
          </button>

          <button
            onClick={() => toggleWebhook(!(stats?.isEnabled ?? false))}
            disabled={togglePending || statsLoading}
            className={cn(
              "flex min-w-[168px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50",
              stats?.isEnabled
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700",
            )}
          >
            {togglePending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : stats?.isEnabled ? (
              <CopyCheck className="h-3.5 w-3.5" />
            ) : (
              <Unplug className="h-3.5 w-3.5" />
            )}
            {stats?.isEnabled ? "Turn Off Auto Deposit" : "Turn On Auto Deposit"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  stats?.isEnabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400",
                )}
              >
                {stats?.isEnabled ? "Enabled" : "Disabled"}
              </span>
              <span className="text-xs text-slate-500">
                Android app can continue posting to `/api/v1/sms-webhook`
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Logs: {formatNumber(total)} entries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[118px] animate-pulse rounded-2xl border border-slate-700 bg-slate-800/50"
            />
          ))
        ) : (
          <>
            <MiniStat
              label="Total Logs"
              value={formatNumber(stats?.total)}
              sub="All webhook messages"
              icon={MessageSquareText}
              tone="blue"
            />
            <MiniStat
              label="Matched"
              value={formatNumber(stats?.matched)}
              sub="Auto-linked to deposits"
              icon={CheckCircle2}
              tone="green"
            />
            <MiniStat
              label="Unmatched"
              value={formatNumber(stats?.unmatched)}
              sub="Needs manual review"
              icon={Activity}
              tone="yellow"
            />
            <MiniStat
              label="Duplicate"
              value={formatNumber(stats?.duplicate)}
              sub="Repeated transaction IDs"
              icon={CopyCheck}
              tone="red"
            />
            <MiniStat
              label="Today"
              value={formatNumber(stats?.today)}
              sub="Incoming SMS today"
              icon={RefreshCw}
              tone="cyan"
            />
            <MiniStat
              label="Match Rate"
              value={
                stats?.total
                  ? `${Math.round((stats.matched / stats.total) * 100)}%`
                  : "0%"
              }
              sub="Matched vs total logs"
              icon={CheckCircle2}
              tone="green"
            />
          </>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">SMS Logs</h2>
            <p className="mt-1 text-xs text-slate-500">
              Filter by webhook status to review matching quality.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setStatus(filter);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  status === filter
                    ? "border-blue-500 bg-blue-500/15 text-blue-400"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                {[
                  "#",
                  "Transaction ID",
                  "Sender",
                  "Amount",
                  "Method",
                  "Deposit Request",
                  "Status",
                  "Received",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-800/70">
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No SMS logs found for this filter.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/70 transition-colors hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {(page - 1) * LIMIT + index + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-200">
                      {log.transactionId || "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {log.senderPhone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">
                      ৳{formatNumber(log.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                          METHOD_STYLES[log.paymentMethod] ||
                            "bg-slate-800 text-slate-300",
                        )}
                      >
                        {log.paymentMethod || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {log.depositRequestId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_STYLES[log.status],
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-400">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>

          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>

          <button
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
