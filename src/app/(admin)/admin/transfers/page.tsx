/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AdminService } from "@/services/admin.service";

const LIMIT = 20;
const fmt = (n: any) => Number(n ?? 0).toLocaleString("en-BD");

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

export default function AdminTransfersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transfers", page, search],
    queryFn: () =>
      AdminService.getAllTransfers({
        page,
        limit: LIMIT,
        search: search || undefined,
      }),
  });

  const transfers = data?.data?.transfers ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">All Transfers</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
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
              placeholder="Username or email..."
              className="w-52 rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
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
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {["#", "Sender", "Receiver", "Amount", "Note", "Date"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No transfers found
                </td>
              </tr>
            ) : (
              transfers.map((t: any, idx: number) => (
                <tr
                  key={t.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {t.sender?.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{t.sender?.username}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {t.receiver?.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{t.receiver?.username}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">
                    ৳{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[140px] truncate">
                    {t.note ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(t.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
