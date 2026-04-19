/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

const LIMIT = 20;
const fmt = (n: any) => Number(n ?? 0).toLocaleString("en-BD");

const formatDate = (d?: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Avatar({ name }: { name?: string }) {
  return (
    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-300">
      {name?.charAt(0)?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function AdminTransfersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transfers", page, search],
    queryFn: () =>
      AdminService.getAllTransfers({ page, limit: LIMIT, search: search || undefined }),
  });

  const transfers: any[] = data?.data?.transfers ?? [];
  const total: number = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT) || 1;

  const totalAmount = transfers.reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <ArrowLeftRight className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">All Transfers</h1>
            <p className="text-xs text-slate-400 mt-0.5">{fmt(total)} total transfers</p>
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
              placeholder="Username or email..."
              className="w-52 rounded-xl border border-slate-700 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500/60 transition-colors"
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

      {/* Stats bar */}
      {!isLoading && transfers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ArrowLeftRight className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">This Page</p>
              <p className="text-sm font-bold text-white">{transfers.length} transfers</p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Page Volume</p>
              <p className="text-sm font-bold text-white">৳{fmt(totalAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["SL", "Sender", "", "Receiver", "Amount", "Note", "Date"].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      "px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap",
                      h === "Amount" ? "text-right" : "text-left",
                      h === "" ? "px-1 w-6" : "",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 w-16 animate-pulse rounded bg-slate-700/60" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((t: any, idx: number) => (
                  <tr
                    key={t.id}
                    onClick={() => setDetail(t)}
                    className="border-b border-slate-700/20 hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.sender?.name} />
                        <div>
                          <p className="font-semibold text-white leading-tight">{t.sender?.name ?? "—"}</p>
                          <p className="text-[10px] text-slate-500">@{t.sender?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-1 text-slate-600">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500/60" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.receiver?.name} />
                        <div>
                          <p className="font-semibold text-white leading-tight">{t.receiver?.name ?? "—"}</p>
                          <p className="text-[10px] text-slate-500">@{t.receiver?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-emerald-400">৳{fmt(t.amount)}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[120px]">
                      <span className="truncate block text-slate-400">{t.note ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/40 px-4 py-3">
            <span className="text-[10px] text-slate-500">
              Page {page} of {totalPages} &nbsp;·&nbsp; {fmt(total)} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Transfer Detail</h2>
              <button onClick={() => setDetail(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount highlight */}
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center">
              <p className="text-3xl font-black text-emerald-400">৳{fmt(detail.amount)}</p>
              <p className="text-[11px] text-slate-500 mt-1">{formatDate(detail.createdAt)}</p>
            </div>

            {/* Sender → Receiver */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Sender</p>
                <p className="text-xs font-bold text-white">{detail.sender?.name}</p>
                <p className="text-[10px] text-slate-500">@{detail.sender?.username}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex-1 rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">Receiver</p>
                <p className="text-xs font-bold text-white">{detail.receiver?.name}</p>
                <p className="text-[10px] text-slate-500">@{detail.receiver?.username}</p>
              </div>
            </div>

            {detail.note && (
              <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-3">
                <p className="text-[10px] text-slate-500 mb-1">Note</p>
                <p className="text-xs text-slate-300">{detail.note}</p>
              </div>
            )}

            <button
              onClick={() => setDetail(null)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
