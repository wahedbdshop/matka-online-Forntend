"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";

function formatMoney(value?: string | number | null) {
  return `Tk ${Number(value ?? 0).toLocaleString("en-BD")}`;
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
      icon: Eye,
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

  return {
    label: method || "Unknown",
    icon: Wallet,
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

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  APPROVED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-950 dark:text-white">
        {value || "-"}
      </p>
    </div>
  );
}

export default function AdminDepositHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposit-detail", id],
    queryFn: () => AdminService.getDepositById(id),
  });

  const deposit = data?.data;
  const method = useMemo(() => getMethodMeta(deposit?.paymentMethod), [deposit]);
  const MethodIcon = method.icon;

  const { mutate: approveDeposit, isPending: isApproving } = useMutation({
    mutationFn: () => AdminService.approveDeposit(id, reviewNote || undefined),
    onSuccess: () => {
      toast.success("Deposit approved successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-deposit-detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-deposits-history"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to approve deposit"),
  });

  const { mutate: rejectDeposit, isPending: isRejecting } = useMutation({
    mutationFn: () => AdminService.rejectDeposit(id, reviewNote || undefined),
    onSuccess: () => {
      toast.success("Deposit rejected successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-deposit-detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-deposits-history"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to reject deposit"),
  });

  if (isLoading) {
    return <div className="p-4 text-slate-400">Loading deposit details...</div>;
  }

  if (!deposit) {
    return <div className="p-4 text-rose-400">Deposit request not found.</div>;
  }

  const isPending = deposit.status === "PENDING";
  const isReviewing = isApproving || isRejecting;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">
            Deposit Details
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Full information for this user deposit request
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${method.className}`}
          >
            <MethodIcon className="h-3.5 w-3.5" />
            {method.label}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[deposit.status] ?? STATUS_STYLES.PENDING}`}
          >
            {deposit.status}
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="User Name" value={deposit.user?.name ?? "-"} />
            <InfoCard label="Email" value={deposit.user?.email ?? "-"} />
            <InfoCard label="Phone Number" value={deposit.user?.phone ?? "-"} />
            <InfoCard label="Username" value={deposit.user?.username ?? "-"} />
            <InfoCard label="Deposit Amount" value={formatMoney(deposit.amount)} />
            <InfoCard label="Bonus" value={formatMoney(deposit.bonus)} />
            <InfoCard
              label="Total Credit"
              value={formatMoney(deposit.totalCredit)}
            />
            <InfoCard label="Transaction ID" value={deposit.transactionId ?? "-"} />
            <InfoCard label="Sender Number" value={deposit.senderNumber ?? "-"} />
            <InfoCard
              label="Deposit Date & Time"
              value={formatDateTime(deposit.createdAt)}
            />
            <InfoCard
              label="Expires At"
              value={formatDateTime(deposit.expiresAt)}
            />
            <InfoCard
              label="Reviewed At"
              value={formatDateTime(deposit.reviewedAt)}
            />
            <div className="sm:col-span-2">
              <InfoCard
                label="Agent Numbers"
                value={getAgentNumbers(deposit).join(", ") || "-"}
              />
            </div>
            <div className="sm:col-span-2">
              <InfoCard label="Review Note" value={deposit.reviewNote ?? "-"} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Quick Actions
            </p>

            {isPending ? (
              <div className="mt-4 space-y-4">
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Admin note (optional)"
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => approveDeposit()}
                    disabled={isReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isApproving ? "Approving..." : "Approve Deposit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectDeposit()}
                    disabled={isReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    {isRejecting ? "Rejecting..." : "Reject Deposit"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                This deposit is already processed. No further action is needed.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Navigation
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/deposits/history"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to User Deposit History
              </Link>
              <Link
                href="/admin/deposits"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Go to Deposit Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
