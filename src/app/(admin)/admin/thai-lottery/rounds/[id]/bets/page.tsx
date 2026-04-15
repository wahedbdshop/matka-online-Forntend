/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { api } from "@/lib/axios";
import { formatBangladeshDateTime } from "@/lib/bangladesh-time";

const PLAY_TYPE_LABEL: Record<string, string> = {
  THREE_UP_DIRECT: "3Up Direct",
  THREE_UP_RUMBLE: "3Up Rumble",
  THREE_UP_SINGLE: "3Up Single",
  THREE_UP_TOTAL: "3Up Total",
  TWO_UP_DIRECT: "2Up Direct",
  DOWN_DIRECT: "Down Direct",
  DOWN_SINGLE: "Down Single",
  DOWN_TOTAL: "Down Total",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  WON: "bg-green-500/15  text-green-400  border-green-500/30",
  LOST: "bg-red-500/15    text-red-400    border-red-500/30",
  CANCELLED: "bg-slate-500/15  text-slate-300  border-slate-500/30",
  REVERSED: "bg-cyan-500/15   text-cyan-300   border-cyan-500/30",
};

const LIMIT = 20;

function BetsContent() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.id as string;
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "",
  );
  const [playTypeFilter, setPlayTypeFilter] = useState("");

  // Live currency rate — no hardcoding
  const { data: currencyData } = useQuery({
    queryKey: ["thai-currency-rate"],
    queryFn: () => api.get("/game-rates/currency").then((r) => r.data?.data),
    staleTime: 5 * 60 * 1000,
  });
  const bdtPerDollar = Number(currencyData?.bdtPerDollar ?? 110);

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-round-bets",
      roundId,
      page,
      search,
      statusFilter,
      playTypeFilter,
    ],
    queryFn: () =>
      AdminService.getThaiRoundBets(roundId, {
        page,
        limit: LIMIT,
        search: search || undefined,
        status: statusFilter || undefined,
        playType: playTypeFilter || undefined,
      }),
  });

  const bets = data?.data?.bets ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push(`/admin/thai-lottery/rounds/${roundId}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Round Bets</h1>
          <p className="text-xs text-slate-400">{total} total bets</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Live rate badge */}
          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1 text-xs text-yellow-400">
            $1 = ৳{bdtPerDollar}
          </span>
          {statusFilter === "WON" && (
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-400">
              🏆 Winners only
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Search number / user..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500 w-48"
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-300" />
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Status</option>
          {["PENDING", "WON", "LOST", "CANCELLED", "REVERSED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={playTypeFilter}
          onChange={(e) => {
            setPlayTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(PLAY_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {(statusFilter || playTypeFilter || search) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPlayTypeFilter("");
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

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                SI
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                User
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Bet Code
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Number
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Amount (USD)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Win (USD)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Time (BD)
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bets.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {statusFilter === "WON"
                    ? "No winners found for this round"
                    : "No bets found"}
                </td>
              </tr>
            ) : (
              bets
                .filter((bet: any) => bet.status === "WON")
                .map((bet: any, idx: number) => {
                  const amtUSD = Number(bet.actualAmount ?? 0);
                  const winUSD = Number(bet.actualWin ?? 0);
                  const isWon = bet.status === "WON";
                  const serial = (page - 1) * LIMIT + idx + 1;

                  return (
                    <tr
                      key={bet.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20"
                    >
                      {/* SI */}
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {String(serial).padStart(2, "0")}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium">
                          {bet.user?.name ?? "-"}
                        </p>
                        <p className="text-slate-500 text-[10px]">
                          @{bet.user?.username ?? "-"}
                        </p>
                      </td>

                      {/* Number */}
                      <td className="px-4 py-3 font-mono font-bold text-white tracking-widest">
                        {bet.betNumber}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType}
                      </td>

                      {/* Amount USD */}
                      <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                        ${amtUSD.toFixed(2)}
                      </td>

                      {/* Win USD — only WON */}
                      <td className="px-4 py-3 text-xs font-semibold text-green-400 font-mono">
                        {isWon ? `$${winUSD.toFixed(2)}` : "-"}
                      </td>

                      {/* Bet Code — only WON */}
                      <td className="px-4 py-3">
                        {isWon && bet.confirmCode ? (
                          <span className="rounded-md border border-[#2a3f7a] bg-[#0d183a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#71a6ff]">
                            #{bet.confirmCode}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[bet.status] ?? ""}`}
                        >
                          {bet.status}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatBangladeshDateTime(bet.placedAt, {
                          timeZone: bet.round?.scheduleTimeZone,
                        })}
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
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function ThaiRoundBetsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-slate-700" />
          <div className="h-10 w-full rounded-lg bg-slate-800" />
          <div className="h-64 rounded-xl bg-slate-800" />
        </div>
      }
    >
      <BetsContent />
    </Suspense>
  );
}
