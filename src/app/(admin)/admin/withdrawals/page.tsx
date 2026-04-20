/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";

const LIMIT = 20;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/15  text-green-400  border-green-500/30",
  REJECTED: "bg-red-500/15    text-red-400    border-red-500/30",
};

function WithdrawalsContent() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("userId") || "";

  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    id: string;
    type: "approve" | "reject";
    withdrawal: any | null;
  }>({ open: false, id: "", type: "approve", withdrawal: null });
  const [reviewNote, setReviewNote] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", activeTab, page, userIdFilter, search],
    queryFn: () =>
      AdminService.getWithdrawals({
        status: activeTab === "ALL" ? undefined : activeTab,
        page,
        limit: LIMIT,
        userId: userIdFilter || undefined,
        search: search || undefined,
      }),
  });

  const { mutate: approveWithdrawal, isPending: isApproving } = useMutation({
    mutationFn: ({
      id,
      transactionId,
      note,
    }: {
      id: string;
      transactionId?: string;
      note?: string;
    }) => AdminService.approveWithdrawal(id, transactionId, note),
    onSuccess: () => {
      toast.success("Withdrawal approved");
      setReviewDialog((p) => ({ ...p, open: false }));
      setReviewNote("");
      setTransactionId("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: rejectWithdrawal, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      AdminService.rejectWithdrawal(id, note),
    onSuccess: () => {
      toast.success("Withdrawal rejected");
      setReviewDialog((p) => ({ ...p, open: false }));
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const withdrawals = data?.data?.withdrawals ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (amount?: string | number | null) =>
    `Tk ${Number(amount ?? 0).toLocaleString("en-BD")}`;

  const copyText = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Number copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const getMethodType = (method?: string | null) => {
    const normalized = method?.toLowerCase().trim() ?? "";
    const looksLikeBankMethod =
      normalized === "bank" ||
      normalized.includes("bank") ||
      normalized.includes("account");
    return looksLikeBankMethod ? "bank" : "mobile";
  };

  const getWithdrawalValue = (
    withdrawal: any,
    ...keys: string[]
  ): string | number | null => {
    for (const key of keys) {
      const directValue = withdrawal?.[key];
      if (directValue !== undefined && directValue !== null && directValue !== "")
        return directValue;

      const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      const snakeValue = withdrawal?.[snakeKey];
      if (snakeValue !== undefined && snakeValue !== null && snakeValue !== "")
        return snakeValue;

      const bankDetailsValue = withdrawal?.bankDetails?.[key];
      if (
        bankDetailsValue !== undefined &&
        bankDetailsValue !== null &&
        bankDetailsValue !== ""
      )
        return bankDetailsValue;

      const bankDetailsSnakeValue = withdrawal?.bankDetails?.[snakeKey];
      if (
        bankDetailsSnakeValue !== undefined &&
        bankDetailsSnakeValue !== null &&
        bankDetailsSnakeValue !== ""
      )
        return bankDetailsSnakeValue;
    }

    return null;
  };

  const reviewRows = [
    ["Date", formatDate(reviewDialog.withdrawal?.createdAt)],
    ["User Name", reviewDialog.withdrawal?.user?.name ?? "-"],
    ["Method", reviewDialog.withdrawal?.paymentMethod ?? "-"],
    ["Amount", formatMoney(reviewDialog.withdrawal?.amount)],
    ["Charge", formatMoney(reviewDialog.withdrawal?.charge ?? 0)],
    [
      "Charge Rate",
      reviewDialog.withdrawal?.chargeType === "PERCENTAGE"
        ? `${Number(reviewDialog.withdrawal?.chargeValue ?? 0)}%`
        : reviewDialog.withdrawal?.chargeType === "FIXED"
          ? formatMoney(reviewDialog.withdrawal?.chargeValue)
          : "-",
    ],
    [
      "Payable",
      formatMoney(
        reviewDialog.withdrawal?.finalPayableAmount ??
          reviewDialog.withdrawal?.amount,
      ),
    ],
  ];

  const withdrawalInfoRows =
    getMethodType(reviewDialog.withdrawal?.paymentMethod) === "bank"
      ? [
          [
            "Bank Name",
            getWithdrawalValue(reviewDialog.withdrawal, "bankName") ?? "-",
          ],
          [
            "Bank Account Number",
            getWithdrawalValue(reviewDialog.withdrawal, "accountNumber") ?? "-",
          ],
          [
            "Account Holder Name",
            getWithdrawalValue(
              reviewDialog.withdrawal,
              "accountHolderName",
              "accountHolder",
              "holderName",
            ) ??
              reviewDialog.withdrawal?.user?.name ??
              "-",
          ],
          [
            "Branch Name",
            getWithdrawalValue(reviewDialog.withdrawal, "branchName") ?? "-",
          ],
          [
            "Swift Code",
            getWithdrawalValue(reviewDialog.withdrawal, "swiftCode") ?? "-",
          ],
          ["Amount", formatMoney(reviewDialog.withdrawal?.amount)],
        ]
      : [
          ["Wallet Method", reviewDialog.withdrawal?.paymentMethod ?? "-"],
          ["Wallet Number", reviewDialog.withdrawal?.accountNumber ?? "-"],
          [
            "Payable",
            formatMoney(
              reviewDialog.withdrawal?.finalPayableAmount ??
                reviewDialog.withdrawal?.amount,
            ),
          ],
        ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Withdrawals</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total</p>
        </div>
        {userIdFilter && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
            Filtered by user
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setActiveTab(s);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === s
                  ? "border-blue-500 bg-blue-500/20 text-blue-400"
                  : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              placeholder="Username, account number..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
          >
            Search
          </button>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                #
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                User
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Email
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Method
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Account
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Amount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : withdrawals.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No withdrawals found
                </td>
              </tr>
            ) : (
              withdrawals.map((w: any, idx: number) => (
                <tr
                  key={w.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {w.user?.username ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {w.user?.email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {w.paymentMethod}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {w.accountNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-white">
                      Tk {Number(w.amount).toLocaleString("en-BD")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[w.status] ?? ""}`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(w.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {w.status === "PENDING" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setReviewDialog({
                              open: true,
                              id: w.id,
                              type: "approve",
                              withdrawal: w,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-500/20"
                        >
                          <CheckCircle className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() =>
                            setReviewDialog({
                              open: true,
                              id: w.id,
                              type: "reject",
                              withdrawal: w,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Review Modal */}
      {reviewDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setReviewDialog((p) => ({ ...p, open: false }));
          }}
        >
          <div className="w-full max-w-3xl rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2
              className={`text-sm font-bold ${reviewDialog.type === "approve" ? "text-green-400" : "text-red-400"}`}
            >
              {reviewDialog.type === "approve" ? "Approve" : "Reject"}{" "}
              Withdrawal
            </h2>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Requested by</p>
                      <p className="text-base font-semibold text-white">
                        {reviewDialog.withdrawal?.user?.name ?? "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        @{reviewDialog.withdrawal?.user?.username ?? "-"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLE[reviewDialog.withdrawal?.status] ?? ""}`}
                    >
                      {reviewDialog.withdrawal?.status ?? "-"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 divide-y divide-slate-700/70">
                    {reviewRows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-start justify-between gap-3 px-3 py-3"
                      >
                        <p className="text-[11px] text-slate-500">{label}</p>
                        <p className="text-right text-sm font-medium text-white break-words">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
                  <p className="text-xs font-semibold text-white">
                    User Withdrawal Information
                  </p>
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 divide-y divide-slate-700/70">
                    {withdrawalInfoRows.map(([label, value]) => {
                      const isCopyable =
                        (getMethodType(
                          reviewDialog.withdrawal?.paymentMethod,
                        ) === "bank" ||
                          (label !== "Wallet Method" && label !== "Payable")) &&
                        value &&
                        value !== "-";

                      return (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-3 px-3 py-3"
                        >
                          <p className="text-[11px] text-slate-500">{label}</p>
                          {isCopyable ? (
                            <button
                              type="button"
                              onClick={() => copyText(String(value))}
                              className="inline-flex items-center gap-2 text-right text-sm font-medium text-blue-400 hover:text-blue-300"
                            >
                              <span className="break-all font-mono">
                                {String(value)}
                              </span>
                              <Copy className="h-3.5 w-3.5 shrink-0" />
                            </button>
                          ) : (
                            <p className="text-right text-sm font-medium text-white break-words">
                              {value}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-500">Payable Amount</p>
                    <p className="text-right text-xl font-bold text-white">
                      {formatMoney(
                        reviewDialog.withdrawal?.finalPayableAmount ??
                          reviewDialog.withdrawal?.amount,
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
                  {reviewDialog.type === "approve" && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-500">
                        Transaction ID
                      </p>
                      <input
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID (optional)"
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500">Note</p>
                    <input
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setReviewDialog((p) => ({ ...p, open: false }))
                    }
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (reviewDialog.type === "approve") {
                        approveWithdrawal({
                          id: reviewDialog.id,
                          transactionId: transactionId || undefined,
                          note: reviewNote || undefined,
                        });
                      } else {
                        rejectWithdrawal({
                          id: reviewDialog.id,
                          note: reviewNote || undefined,
                        });
                      }
                    }}
                    disabled={isApproving || isRejecting}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      reviewDialog.type === "approve"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isApproving || isRejecting ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
      <WithdrawalsContent />
    </Suspense>
  );
}
