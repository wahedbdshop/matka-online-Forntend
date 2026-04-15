/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/edit-history/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, History } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { useCurrency } from "@/hooks/use-currency";
import { formatBangladeshDateTime } from "@/lib/bangladesh-time";

const LIMIT = 20;

export default function ThaiEditHistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roundFilter, setRoundFilter] = useState("");

  const fmtUsd = (usd: number) =>
    `$${Number(usd).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const { data: roundsData } = useQuery({
    queryKey: ["admin-thai-rounds-all"],
    queryFn: () => AdminService.getThaiRounds(undefined, 1, 100),
  });

  const rounds = roundsData?.data?.rounds ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-edit-logs", page, search, roundFilter],
    queryFn: () =>
      AdminService.getThaiEditLogs({
        page,
        limit: LIMIT,
        search: search || undefined,
        roundId: roundFilter || undefined,
      }),
  });

  const logs = data?.data?.logs ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
            <History className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Edit History</h1>
            <p className="text-xs text-slate-400">
              History of Bets Modified by Admin
            </p>
          </div>
        </div>
        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
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
          <option value="">All Rounds</option>
          {rounds.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.issueNumber}
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
            className="w-44 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-orange-500"
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
              {[
                "#",
                "User",
                "Round",
                "Confirm Code",
                "Old Number",
                "New Number",
                "Old Amount",
                "New Amount",
                "Edited By",
                "Edited At (BD Time)",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium text-slate-400"
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
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No edit history found
                </td>
              </tr>
            ) : (
              logs.map((log: any, idx: number) => {
                const oldAmtBdt = Number(log.oldAmount);
                const newAmtBdt = Number(log.newAmount);
                const numChanged = log.oldBetNumber !== log.newBetNumber;
                const amtChanged = oldAmtBdt !== newAmtBdt;

                return (
                  <tr
                    key={log.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-white">
                        {log.bet?.user?.name ?? "-"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        @{log.bet?.user?.username ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      #{log.bet?.round?.issueNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {log.confirmCode ? (
                        <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-xs font-bold text-blue-400">
                          #{log.confirmCode}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {/* Old Number */}
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono font-bold tracking-widest text-sm ${numChanged ? "text-slate-500 line-through" : "text-white"}`}
                      >
                        {log.oldBetNumber}
                      </span>
                    </td>
                    {/* New Number */}
                    <td className="px-4 py-3">
                      {numChanged ? (
                        <span className="font-mono font-bold tracking-widest text-sm text-green-400">
                          {log.newBetNumber}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {/* Old Amount */}
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          amtChanged
                            ? "text-slate-500 line-through"
                            : "text-slate-300"
                        }
                      >
                        {fmtUsd(oldAmtBdt)}
                      </span>
                    </td>
                    {/* New Amount */}
                    <td className="px-4 py-3 text-xs">
                      {amtChanged ? (
                        <span className="font-semibold text-orange-400">
                          {fmtUsd(newAmtBdt)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.admin?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatBangladeshDateTime(log.editedAt, {
                        timeZone: log.bet?.round?.scheduleTimeZone,
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
