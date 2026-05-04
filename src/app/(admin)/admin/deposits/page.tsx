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
  Eye,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";

const LIMIT = 20;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/15  text-green-400  border-green-500/30",
  REJECTED: "bg-red-500/15    text-red-400    border-red-500/30",
};

const METHOD_STYLE: Record<string, string> = {
  bkash: "bg-pink-500/15   text-pink-400",
  nagad: "bg-orange-500/15 text-orange-400",
  rocket: "bg-purple-500/15 text-purple-400",
  whatsapp: "bg-green-500/15  text-green-400",
};

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
  push("Upay", deposit?.agent?.upayNumber);
  push("RL", deposit?.agent?.rlNumber);
  push("WhatsApp", deposit?.agent?.whatsappNumber);

  if (Array.isArray(deposit?.agent?.extraMethods)) {
    deposit.agent.extraMethods.forEach((method: any) => {
      if (method?.number) {
        numbers.push(`${method?.name || "Extra"}: ${method.number}`);
      }
    });
  }

  return [...new Set(numbers)];
}

function DepositsContent() {
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("userId") || "";

  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    id: string;
    type: "approve" | "reject";
    amount: number;
    bonus: number;
    totalCredit: number;
    user: string;
    method: string;
    agentNumbers: string[];
    txnId: string;
    senderNumber: string;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const [detailDialog, setDetailDialog] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", activeTab, page, userIdFilter, search],
    queryFn: () =>
      AdminService.getDeposits({
        status: activeTab === "ALL" ? undefined : activeTab,
        page,
        limit: LIMIT,
        userId: userIdFilter || undefined,
        search: search || undefined,
      }),
  });

  const { mutate: approveDeposit, isPending: isApproving } = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      AdminService.approveDeposit(id, note),
    onSuccess: () => {
      toast.success("Deposit approved — balance credited");
      setReviewDialog(null);
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: rejectDeposit, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      AdminService.rejectDeposit(id, note),
    onSuccess: () => {
      toast.success("Deposit rejected");
      setReviewDialog(null);
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const deposits = data?.data?.deposits ?? [];
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

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deposit Requests</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total</p>
        </div>
        {userIdFilter && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
            Filtered by user
          </span>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
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

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Name, TXN ID, phone..."
              className="w-56 rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
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
              {[
                "#",
                "User",
                "Method",
                "Agent Number",
                "TXN ID",
                "Sender No.",
                "Amount",
                "Bonus",
                "Total Credit",
                "Status",
                "Expire",
                "Date",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 13 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : deposits.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No deposit requests found
                </td>
              </tr>
            ) : (
              deposits.map((d: any, idx: number) => {
                const isExpired =
                  d.status === "PENDING" && new Date(d.expiresAt) < new Date();
                const agentNumbers = getAgentNumbers(d);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-white">
                        {d.user?.name ?? "-"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {d.user?.phone ?? d.user?.email ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${METHOD_STYLE[d.paymentMethod] ?? "bg-slate-700 text-slate-300"}`}
                      >
                        {d.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {agentNumbers.length > 0 ? (
                        <div className="space-y-0.5">
                          {agentNumbers.map((number) => (
                            <p key={number} className="whitespace-nowrap">
                              {number}
                            </p>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {d.transactionId ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {d.senderNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-white">
                      ৳{Number(d.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-emerald-400">
                      +৳{Number(d.bonus).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-blue-300">
                      ৳{Number(d.totalCredit).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[d.status] ?? ""}`}
                      >
                        {d.status}
                      </span>
                      {isExpired && (
                        <span className="ml-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-400">
                          EXPIRED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(d.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Detail button */}
                        <button
                          onClick={() => setDetailDialog(d)}
                          className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        {/* Approve / Reject */}
                        {d.status === "PENDING" && (
                          <>
                            <button
                              onClick={() =>
                                setReviewDialog({
                                  open: true,
                                  id: d.id,
                                  type: "approve",
                                  amount: d.amount,
                                  bonus: d.bonus,
                                  totalCredit: d.totalCredit,
                                  user: d.user?.name,
                                  method: d.paymentMethod,
                                  agentNumbers,
                                  txnId: d.transactionId,
                                  senderNumber: d.senderNumber,
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
                                  id: d.id,
                                  type: "reject",
                                  amount: d.amount,
                                  bonus: d.bonus,
                                  totalCredit: d.totalCredit,
                                  user: d.user?.name,
                                  method: d.paymentMethod,
                                  agentNumbers,
                                  txnId: d.transactionId,
                                  senderNumber: d.senderNumber,
                                })
                              }
                              className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20"
                            >
                              <XCircle className="h-3 w-3" /> Reject
                            </button>
                          </>
                        )}
                        {d.status !== "PENDING" && (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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

      {/* Detail Modal */}
      {detailDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailDialog(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-bold text-white">Deposit Detail</h2>
            <div className="space-y-2 text-xs">
              {[
                ["User", detailDialog.user?.name],
                ["Email", detailDialog.user?.email],
                ["Phone", detailDialog.user?.phone],
                ["Method", detailDialog.paymentMethod],
                ["Agent Numbers", getAgentNumbers(detailDialog).join(", ")],
                ["Agent", detailDialog.agent?.name],
                ["Transaction ID", detailDialog.transactionId],
                ["Sender Number", detailDialog.senderNumber],
                ["Amount", `৳${Number(detailDialog.amount).toLocaleString()}`],
                ["Bonus", `+৳${Number(detailDialog.bonus).toLocaleString()}`],
                [
                  "Total Credit",
                  `৳${Number(detailDialog.totalCredit).toLocaleString()}`,
                ],
                ["Status", detailDialog.status],
                [
                  "Submitted",
                  new Date(detailDialog.createdAt).toLocaleString(),
                ],
                ["Expires", new Date(detailDialog.expiresAt).toLocaleString()],
                ["Review Note", detailDialog.reviewNote ?? "-"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white text-right font-medium">
                    {value ?? "-"}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDetailDialog(null)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewDialog?.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReviewDialog(null);
              setReviewNote("");
            }
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h2
              className={`text-sm font-bold ${reviewDialog.type === "approve" ? "text-green-400" : "text-red-400"}`}
            >
              {reviewDialog.type === "approve" ? "Approve" : "Reject"} Deposit
            </h2>

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-2">
              <Row label="User" value={reviewDialog.user} />
              <Row label="Method" value={reviewDialog.method} />
              <Row
                label="Agent No."
                value={
                  reviewDialog.agentNumbers.length > 0
                    ? reviewDialog.agentNumbers.join(", ")
                    : "-"
                }
              />
              <Row label="TXN ID" value={reviewDialog.txnId} />
              <Row
                label="Sender No."
                value={reviewDialog.senderNumber || "-"}
              />
              <Row
                label="Amount"
                value={`৳${Number(reviewDialog.amount).toLocaleString()}`}
              />
              <Row
                label="Bonus"
                value={`+৳${Number(reviewDialog.bonus).toLocaleString()}`}
                highlight="text-emerald-400"
              />
              <Row
                label="Total Credit"
                value={`৳${Number(reviewDialog.totalCredit).toLocaleString()}`}
                highlight="text-blue-300 font-bold"
              />
            </div>

            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Admin note (optional)"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReviewDialog(null);
                  setReviewNote("");
                }}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reviewDialog.type === "approve") {
                    approveDeposit({
                      id: reviewDialog.id,
                      note: reviewNote || undefined,
                    });
                  } else {
                    rejectDeposit({
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
                {isApproving || isRejecting
                  ? "Processing..."
                  : reviewDialog.type === "approve"
                    ? "Confirm Approve"
                    : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ?? "text-white"}>{value}</span>
    </div>
  );
}

export default function AdminDepositsPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 p-4">Loading...</div>}>
      <DepositsContent />
    </Suspense>
  );
}
