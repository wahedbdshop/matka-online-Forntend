/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/game-result/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { AdminService } from "@/services/admin.service";
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

const LIMIT = 20;

export default function ThaiGameResultPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");

  const { data: currencyData } = useQuery({
    queryKey: ["thai-currency-rate"],
    queryFn: () => AdminService.getThaiCurrencyRate(),
    staleTime: 5 * 60 * 1000,
  });

  const bdtPerDollar = Number(currencyData?.data?.bdtPerDollar ?? 110);

  // rounds list for filter dropdown
  const { data: roundsData } = useQuery({
    queryKey: ["admin-thai-rounds-all"],
    queryFn: () => AdminService.getThaiRounds(undefined, 1, 100),
  });

  const rounds = roundsData?.data?.rounds ?? [];

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-thai-game-result",
      roundFilter,
      page,
      search,
      playTypeFilter,
    ],
    queryFn: () =>
      AdminService.getThaiRoundBets(roundFilter || rounds[0]?.id, {
        page,
        limit: LIMIT,
        status: "WON",
        search: search || undefined,
        playType: playTypeFilter || undefined,
      }),
    enabled: rounds.length > 0,
  });

  const bets = data?.data?.bets ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
          <Trophy className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Game Result</h1>
          <p className="text-xs text-slate-400">Winner list by round</p>
        </div>
        <span className="ml-auto rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          {total} Winners
        </span>
        <span className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1 text-xs text-yellow-400">
          $1 = ৳{bdtPerDollar}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Round */}
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

        {/* Play Type */}
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

        {/* Search */}
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
                User
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
                Bet Amount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Win Amount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Date (BD Time)
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
                  No winners found
                </td>
              </tr>
            ) : (
              bets.map((bet: any, idx: number) => {
                const betUsd = Number(bet.actualAmount ?? 0) / bdtPerDollar;
                const winUsd = Number(bet.actualWin ?? 0) / bdtPerDollar;
                return (
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
                    <td className="px-4 py-3 font-mono font-bold tracking-widest text-green-400">
                      {bet.betNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      ${betUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-green-400">
                      ${winUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                        {formatBangladeshDateTime(
                          bet.settledAt ?? bet.placedAt,
                          { timeZone: bet.round?.scheduleTimeZone },
                        )}
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
