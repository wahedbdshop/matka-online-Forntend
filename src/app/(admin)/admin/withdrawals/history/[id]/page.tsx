"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
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

function getMethodMeta(method?: string | null) {
  const normalized = method?.trim().toLowerCase() ?? "";

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

  if (normalized.includes("bank") || normalized.includes("account")) {
    return {
      label: method || "Bank Transfer",
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

export default function AdminWithdrawalHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawal-detail", id],
    queryFn: () => AdminService.getWithdrawalById(id),
  });

  const withdrawal = data?.data;
  const method = useMemo(
    () => getMethodMeta(withdrawal?.paymentMethod),
    [withdrawal],
  );
  const MethodIcon = method.icon;

  const { mutate: approveWithdrawal, isPending: isApproving } = useMutation({
    mutationFn: () =>
      AdminService.approveWithdrawal(id, transactionId || undefined, reviewNote || undefined),
    onSuccess: () => {
      toast.success("Withdrawal approved successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals-history"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to approve withdrawal"),
  });

  const { mutate: rejectWithdrawal, isPending: isRejecting } = useMutation({
    mutationFn: () => AdminService.rejectWithdrawal(id, reviewNote || undefined),
    onSuccess: () => {
      toast.success("Withdrawal rejected successfully");
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals-history"] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to reject withdrawal"),
  });

  if (isLoading) {
    return <div className="p-4 text-slate-400">Loading withdrawal details...</div>;
  }

  if (!withdrawal) {
    return <div className="p-4 text-rose-400">Withdrawal request not found.</div>;
  }

  const isPending = withdrawal.status === "PENDING";
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
            Withdrawal Details
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Full information for this user withdrawal request
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${method.className}`}>
            <MethodIcon className="h-3.5 w-3.5" />
            {method.label}
          </span>
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[withdrawal.status] ?? STATUS_STYLES.PENDING}`}>
            {withdrawal.status}
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="User Name" value={withdrawal.user?.name ?? "-"} />
            <InfoCard label="Email" value={withdrawal.user?.email ?? "-"} />
            <InfoCard label="Phone Number" value={withdrawal.user?.phone ?? "-"} />
            <InfoCard label="Username" value={withdrawal.user?.username ?? "-"} />
            <InfoCard label="Withdrawal Amount" value={formatMoney(withdrawal.amount)} />
            <InfoCard label="Charge" value={formatMoney(withdrawal.charge)} />
            <InfoCard
              label="Payable Amount"
              value={formatMoney(withdrawal.finalPayableAmount ?? withdrawal.amount)}
            />
            <InfoCard label="Account Number" value={withdrawal.accountNumber ?? "-"} />
            <InfoCard label="Transaction ID" value={withdrawal.transactionId ?? "-"} />
            <InfoCard label="Bank Name" value={withdrawal.bankName ?? "-"} />
            <InfoCard
              label="Account Holder Name"
              value={withdrawal.accountHolderName ?? "-"}
            />
            <InfoCard label="Branch Name" value={withdrawal.branchName ?? "-"} />
            <InfoCard
              label="Withdrawal Date & Time"
              value={formatDateTime(withdrawal.createdAt)}
            />
            <InfoCard
              label="Reviewed At"
              value={formatDateTime(withdrawal.reviewedAt)}
            />
            <div className="sm:col-span-2">
              <InfoCard label="Review Note" value={withdrawal.reviewNote ?? "-"} />
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
                <input
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="Transaction ID (optional)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
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
                    onClick={() => approveWithdrawal()}
                    disabled={isReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isApproving ? "Approving..." : "Approve Withdrawal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectWithdrawal()}
                    disabled={isReviewing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    {isRejecting ? "Rejecting..." : "Reject Withdrawal"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                This withdrawal is already processed. No further action is needed.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Navigation
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/withdrawals/history"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to User Withdrawal History
              </Link>
              <Link
                href="/admin/withdrawals"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Go to Withdrawal Requests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
