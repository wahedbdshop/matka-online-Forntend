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
  "bg-slate-800/20",
  "bg-blue-900/15",
  "bg-purple-900/15",
  "bg-emerald-900/15",
  "bg-orange-900/15",
  "bg-rose-900/15",
  "bg-cyan-900/15",
  "bg-yellow-900/10",
];


function tranColor(tranType: string) {
  if (tranType.startsWith("Deposit"))            return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (tranType.startsWith("Withdraw"))           return "bg-red-500/10    text-red-400    border-red-500/20";
  if (tranType.startsWith("Transfer"))           return "bg-blue-500/10   text-blue-400   border-blue-500/20";
  if (tranType.toLowerCase().includes("thai"))   return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (tranType.toLowerCase().includes("kalyan")) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
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
            <h1 className="text-xl font-bold text-white">All User Transactions</h1>
            <p className="text-xs text-slate-400 mt-0.5">
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search username or name…"
              className="w-56 rounded-xl border border-slate-700 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-500 hover:text-white transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 border-b-2 border-slate-700">
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
                      "px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap border-r border-slate-700/60 last:border-r-0",
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
                  <tr key={i} className="border-b border-slate-700/40 bg-slate-800/20">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5 border-r border-slate-700/30 last:border-r-0">
                        <div className="h-3 w-20 animate-pulse rounded bg-slate-700/60" />
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
                      "border-b border-slate-700/40 hover:brightness-110 transition-colors",
                      rowColors[idx],
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-500 border-r border-slate-700/30 w-14">
                      {row.sl}
                    </td>
                    <td className="px-5 py-3.5 border-r border-slate-700/30">
                      <p className="font-semibold text-white">{row.username}</p>
                      {row.name && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{row.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300 border-r border-slate-700/30">
                      {row.transactionId || "-"}
                    </td>
                    <td className="px-5 py-3.5 border-r border-slate-700/30 whitespace-nowrap">
                      {row.createdAt ? (
                        <>
                          <p className="text-slate-300 font-mono">
                            {new Date(row.createdAt).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {new Date(row.createdAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 border-r border-slate-700/30">
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
                              <span className="font-bold text-emerald-400">{row.username}</span>
                            </>
                          ) : row.balanceChangeType?.toLowerCase() === "debit" ? (
                            <>
                              <span className="text-slate-500">Sender:</span>
                              <span className="font-bold text-red-400">{row.username}</span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-300 border-r border-slate-700/30">
                      Rs {fmt(row.oldBalance)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold border-r border-slate-700/30">
                      {(() => {
                        const isCredit = row.balanceChangeType?.toLowerCase() === "credit";
                        const isDebit = row.balanceChangeType?.toLowerCase() === "debit";
                        return (
                          <div className={cn(
                            "inline-flex items-center gap-1",
                            isCredit ? "text-emerald-400" : isDebit ? "text-red-400" : "text-white",
                          )}>
                            {isCredit ? <Plus className="h-3 w-3" /> : isDebit ? <Minus className="h-3 w-3" /> : null}
                            <span>Rs {fmt(row.amount)}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-white border-r border-slate-700/30">
                      <div className="flex items-center justify-end gap-2">
                        <span>Rs {fmt(row.newBalance)}</span>
                        {row.balanceChangeType && (
                          <span className={cn(
                            "inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold",
                            row.balanceChangeType.toLowerCase() === "credit"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : row.balanceChangeType.toLowerCase() === "debit"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-slate-500/10 text-slate-300 border-slate-500/20",
                          )}>
                            {row.balanceChangeType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        href={`/admin/users/${row.userId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
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
          <div className="flex items-center justify-between border-t border-slate-700/40 px-4 py-3">
            <span className="text-[10px] text-slate-500">
              Page {page} {meta?.total ? `of ${totalPages} · ${fmt(meta.total)} records` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[10px] text-slate-400 font-mono">{page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={rows.length < 20 && page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
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
