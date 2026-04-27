/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  X,
  Plus,
  Minus,
} from "lucide-react";
import {
  AdminService,
  type AdminUserTransaction,
  type AdminUserTransactionsResponse,
} from "@/services/admin.service";
import { cn } from "@/lib/utils";

const fmt = (n: any) => Number(n ?? 0).toLocaleString("en-BD");

// Cycle of distinct row-group background colors
const GROUP_COLORS = [
  "bg-slate-50 dark:bg-slate-800/20",
  "bg-blue-50/80 dark:bg-blue-900/15",
  "bg-violet-50/80 dark:bg-purple-900/15",
  "bg-emerald-50/80 dark:bg-emerald-900/15",
  "bg-orange-50/80 dark:bg-orange-900/15",
  "bg-rose-50/80 dark:bg-rose-900/15",
  "bg-cyan-50/80 dark:bg-cyan-900/15",
  "bg-yellow-50/70 dark:bg-yellow-900/10",
];


function tranColor(tranType: string) {
  if (tranType.startsWith("Deposit"))            return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (tranType.startsWith("Withdraw"))           return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  if (tranType.startsWith("Transfer"))           return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400";
  if (tranType.toLowerCase().includes("thai"))   return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400";
  if (tranType.toLowerCase().includes("kalyan")) return "border-violet-200 bg-violet-50 text-violet-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400";
  return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400";
}

export default function UserTransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-transactions", page, search],
    queryFn: () =>
      AdminService.getUserTransactions({
        page,
        limit: 20,
        search: search || undefined,
      }),
  });

  const rawData: any = data?.data;
  const rawRows: any[] = Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData)
      ? rawData
      : [];

  const rows: AdminUserTransaction[] = rawRows.map((t: any, i: number) => ({
    sl: t.sl ?? i + 1,
    transactionId: t.transactionId ?? t.id ?? "",
    userId: t.userId ?? t.user_id ?? "",
    username: t.username ?? "",
    name: t.name ?? null,
    tranType: t.tranType ?? t.tran_type ?? t.type ?? "",
    amount: t.amount ?? 0,
    oldBalance: t.oldBalance ?? t.balanceBefore ?? t.balance_before ?? 0,
    newBalance: t.newBalance ?? t.balanceAfter ?? t.balance_after ?? 0,
    balanceChangeType: t.balanceChangeType ?? t.balance_change_type ?? "",
    createdAt: t.createdAt ?? t.created_at ?? "",
    senderUsername: t.senderUsername ?? t.sender_username ?? t.sender?.username ?? t.fromUser?.username ?? null,
    receiverUsername: t.receiverUsername ?? t.receiver_username ?? t.receiver?.username ?? t.toUser?.username ?? null,
    bonusAmount: t.bonusAmount ?? t.bonus_amount ?? null,
    bonusName: t.bonusName ?? t.bonus_name ?? null,
    reason: t.reason ?? t.description ?? t.note ?? t.remarks ?? t.chargeReason ?? t.charge_reason ?? null,
  }));

  const meta: AdminUserTransactionsResponse["meta"] = (rawData as any)?.meta ?? (rawData as any)?.pagination;
  const totalPages: number = meta?.totalPages ?? 1;

  // Assign a color index per unique user (stable within this page)
  const userColorMap = new Map<string, number>();
  let colorCounter = 0;
  const rowColors = rows.map((row) => {
    const key = row.userId || row.username;
    if (!userColorMap.has(key)) {
      userColorMap.set(key, colorCounter % GROUP_COLORS.length);
      colorCounter++;
    }
    return GROUP_COLORS[userColorMap.get(key)!];
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <ReceiptText className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">All User Transactions</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {meta?.total ? `${fmt(meta.total)} records` : "Per-transaction history"}
            </p>
          </div>
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search username or name…"
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-500/60"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/40 dark:bg-slate-800/30 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                {[
                  "SL",
                  "User Name",
                  "Transaction ID",
                  "Date & Time",
                  "Tran Type",
                  "Old Balance",
                  "Amount",
                  "New Balance",
                  "View",
                ].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "whitespace-nowrap border-r border-slate-200 px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 last:border-r-0 dark:border-slate-700/60 dark:text-slate-400",
                      h === "View"
                        ? "text-center"
                        : h === "Old Balance" || h === "Amount" || h === "New Balance"
                          ? "text-right"
                          : h === "Date & Time"
                            ? "text-left"
                            : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-200 bg-white dark:border-slate-700/40 dark:bg-slate-800/20">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="border-r border-slate-200 px-5 py-3.5 last:border-r-0 dark:border-slate-700/30">
                        <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-slate-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={`${row.transactionId}-${idx}`}
                    className={cn(
                      "border-b border-slate-200 transition-colors hover:bg-slate-100/80 dark:border-slate-700/40 dark:hover:brightness-110",
                      rowColors[idx],
                    )}
                  >
                    <td className="w-14 border-r border-slate-200 px-5 py-3.5 font-mono text-slate-400 dark:border-slate-700/30 dark:text-slate-500">
                      {row.sl}
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 dark:border-slate-700/30">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.username}</p>
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 font-mono text-slate-500 dark:border-slate-700/30 dark:text-slate-300">
                      {row.transactionId || "-"}
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-200 px-5 py-3.5 dark:border-slate-700/30">
                      {row.createdAt ? (
                        <>
                          <p className="font-mono text-slate-700 dark:text-slate-300">
                            {new Date(row.createdAt).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(row.createdAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 dark:border-slate-700/30">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-semibold",
                          tranColor(row.tranType),
                        )}
                      >
                        {row.tranType}
                      </span>
                      {row.tranType?.toLowerCase().includes("transfer") && (
                        <div className="mt-1 flex items-center gap-1 text-xs">
                          {row.balanceChangeType?.toLowerCase() === "credit" ? (
                            <>
                              <span className="text-slate-500">Receiver:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.username}</span>
                            </>
                          ) : row.balanceChangeType?.toLowerCase() === "debit" ? (
                            <>
                              <span className="text-slate-500">Sender:</span>
                              <span className="font-bold text-red-600 dark:text-red-400">{row.username}</span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 text-right font-mono text-slate-600 dark:border-slate-700/30 dark:text-slate-300">
                      Rs {fmt(row.oldBalance)}
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 text-right font-mono font-bold dark:border-slate-700/30">
                      {(() => {
                        const isCredit = row.balanceChangeType?.toLowerCase() === "credit";
                        const isDebit = row.balanceChangeType?.toLowerCase() === "debit";
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className={cn(
                              "inline-flex items-center gap-1",
                              isCredit ? "text-emerald-600 dark:text-emerald-400" : isDebit ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white",
                            )}>
                              {isCredit ? <Plus className="h-3 w-3" /> : isDebit ? <Minus className="h-3 w-3" /> : null}
                              <span>Rs {fmt(row.amount)}</span>
                            </div>
                            {row.bonusAmount != null && Number(row.bonusAmount) > 0 && (
                              <span className="text-[10px] font-normal text-yellow-600 dark:text-yellow-400">
                                {row.bonusName ? `${row.bonusName}: ` : "Bonus: "}Rs {fmt(row.bonusAmount)}
                              </span>
                            )}
                            {isDebit && row.reason && (
                              <span className="max-w-[140px] text-right text-[10px] font-normal leading-tight text-slate-500 dark:text-slate-400">
                                {row.reason}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border-r border-slate-200 px-5 py-3.5 text-right font-mono text-slate-900 dark:border-slate-700/30 dark:text-white">
                      <div className="flex items-center justify-end gap-2">
                        <span>Rs {fmt(row.newBalance)}</span>
                        {row.balanceChangeType && (
                          <span className={cn(
                            "inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold",
                            row.balanceChangeType.toLowerCase() === "credit"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : row.balanceChangeType.toLowerCase() === "debit"
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
                          )}>
                            {row.balanceChangeType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        href={`/admin/users/${row.userId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-600 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:bg-cyan-500/5 dark:hover:text-white"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700/40">
            <span className="text-[10px] text-slate-500">
              Page {page} {meta?.total ? `of ${totalPages} · ${fmt(meta.total)} records` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={rows.length < 20 && page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
