/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const LIMIT = 20;

export default function KalyanGamesEditHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-edit-history", page],
    queryFn: () => KalyanAdminService.getEditHistory({ page, limit: LIMIT }),
  });

  const rows: any[] = data?.data?.logs ?? data?.data ?? [];
  const total: number = data?.data?.total ?? rows.length;
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

  const normalizeHistoryRecord = (value: any): Record<string, any> | null => {
    if (!value) return null;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    }

    return typeof value === "object" ? value : null;
  };

  const getHistoryValue = (value: any, keys: string[]) => {
    const record = normalizeHistoryRecord(value);
    if (!record) return "-";

    for (const key of keys) {
      const fieldValue =
        record?.[key] ??
        record?.item?.[key] ??
        record?.entryItem?.[key] ??
        record?.payload?.[key] ??
        record?.data?.[key];
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
        return String(fieldValue);
      }
    }

    return "-";
  };

  const resolveGameName = (row: any) =>
    row.gameName ??
    row.marketName ??
    row.market?.name ??
    row.baseGameName ??
    row.marketId ??
    "-";

  const resolveSessionType = (row: any): "OPEN" | "CLOSE" | undefined => {
    const oldRecord = normalizeHistoryRecord(row?.oldValue);
    const newRecord = normalizeHistoryRecord(row?.newValue);
    const value =
      row?.sessionType ??
      row?.session ??
      row?.market?.sessionType ??
      oldRecord?.sessionType ??
      oldRecord?.session ??
      oldRecord?.item?.sessionType ??
      oldRecord?.entryItem?.sessionType ??
      oldRecord?.payload?.sessionType ??
      oldRecord?.data?.sessionType ??
      newRecord?.sessionType ??
      newRecord?.session ??
      newRecord?.item?.sessionType ??
      newRecord?.entryItem?.sessionType ??
      newRecord?.payload?.sessionType ??
      newRecord?.data?.sessionType;

    if (!value) return undefined;

    const normalizedValue = String(value).toUpperCase();
    if (normalizedValue === "OPEN" || normalizedValue === "CLOSE") {
      return normalizedValue;
    }

    return undefined;
  };

  const renderGameName = (row: any) => {
    const baseGameName = resolveGameName(row);
    const sessionType = resolveSessionType(row);

    if (!sessionType || baseGameName === "-") {
      return baseGameName;
    }

    const sessionLabel = sessionType === "CLOSE" ? "Close" : "Open";
    const sessionClassName =
      sessionType === "CLOSE"
        ? "text-rose-700 dark:text-rose-400"
        : "text-emerald-700 dark:text-emerald-400";

    return (
      <>
        {baseGameName}{" "}
        <span className={sessionClassName}>({sessionLabel})</span>
      </>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-500/15">
            <History className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              Edit History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Play history edit log
            </p>
          </div>
        </div>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400">
          {total} Records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-center dark:border-slate-700/80 dark:bg-transparent">
              {[
                "SI",
                "User Name",
                "Games Name",
                "Games Number",
                "Edit Games Number",
                "Amount",
                "Edit Amount",
                "Date",
              ].map((h) => (
                <th
                  key={h}
                  className="border-r border-slate-200 px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-slate-500 last:border-r-0 dark:border-slate-700/50 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-200 dark:border-slate-700/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-500 dark:text-slate-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p>No edit history found</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row: any, idx: number) => (
                <tr
                  key={row.id ?? idx}
                  className="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                >
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0 dark:border-slate-700/40 dark:text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40">
                    <p className="text-xs font-medium text-slate-900 dark:text-white">
                      {row.user?.name ?? row.userId ?? "-"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">
                      @{row.user?.username ?? "-"}
                    </p>
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-medium text-slate-900 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {renderGameName(row)}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono text-xs text-cyan-700 last:border-r-0 dark:border-slate-700/40 dark:text-cyan-300">
                    {getHistoryValue(row.oldValue, ["selectedNumber", "betNumber", "number"])}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono text-xs text-emerald-700 last:border-r-0 dark:border-slate-700/40 dark:text-emerald-300">
                    {getHistoryValue(row.newValue, ["selectedNumber", "betNumber", "number"])}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-900 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {getHistoryValue(row.oldValue, ["amount", "betAmount"])}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold text-amber-700 last:border-r-0 dark:border-slate-700/40 dark:text-amber-300">
                    {getHistoryValue(row.newValue, ["amount", "betAmount"])}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0 dark:border-slate-700/40 dark:text-slate-400">
                    {formatDate(row.createdAt)}
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}


