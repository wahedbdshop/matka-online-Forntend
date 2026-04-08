/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/win-history/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { AdminService } from "@/services/admin.service";

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

const LIMIT = 20;

const fmtUsd = (usd: number) =>
  `$${Number(usd).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ThaiWinHistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");

  const { data: roundsData } = useQuery({
    queryKey: ["admin-thai-rounds-all"],
    queryFn: () => AdminService.getThaiRounds(undefined, 1, 100),
  });

  const rounds = roundsData?.data?.rounds ?? [];
  const activeRoundId = roundFilter || rounds[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-thai-win-history",
      activeRoundId,
      page,
      search,
      playTypeFilter,
    ],
    queryFn: () =>
      AdminService.getThaiRoundBets(activeRoundId, {
        page,
        limit: LIMIT,
        status: "WON",
        search: search || undefined,
        playType: playTypeFilter || undefined,
      }),
    enabled: !!activeRoundId,
  });

  const bets = data?.data?.bets ?? [];
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/15">
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Win History</h1>
            <p className="text-xs text-slate-400">All winning bets</p>
          </div>
        </div>
        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
          {total} Records
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={roundFilter}
          onChange={(e) => {
            setRoundFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">Latest Round</option>
          {rounds.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.issueNumber}
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
          {Object.entries(PLAY_TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Username / number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="w-44 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-300" />
          </button>
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
                Username
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Bet Code
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Game Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Win Number
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Direct Amt
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Win Amt
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Date Time
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bets.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No win history found
                </td>
              </tr>
            ) : (
              bets.map((bet: any, idx: number) => (
                <tr
                  key={bet.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {bet.user?.name ?? "-"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{bet.user?.username ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {bet.confirmCode ? (
                      <span className="rounded-md border border-[#2a3f7a] bg-[#0d183a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#71a6ff]">
                        #{bet.confirmCode}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-yellow-400">
                    {bet.betNumber}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {fmtUsd(Number(bet.actualAmount ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-yellow-400">
                    {fmtUsd(Number(bet.actualWin ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(bet.settledAt ?? bet.placedAt)}
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
