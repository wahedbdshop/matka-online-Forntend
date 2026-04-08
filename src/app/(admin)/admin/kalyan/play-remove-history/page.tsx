/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const LIMIT = 20;

export default function KalyanPlayRemoveHistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-remove-history", page],
    queryFn: () => KalyanAdminService.getRemoveHistory({ page, limit: LIMIT }),
  });

  const allRows: any[] = data?.data?.logs ?? data?.data ?? [];
  const getRowStatus = (row: any) =>
    String(
      row?.status ??
      row?.gameStatus ??
      row?.newValue?.status ??
      row?.newValue?.gameStatus ??
      row?.oldValue?.status ??
      row?.oldValue?.gameStatus ??
      "",
    ).toUpperCase();
  const rows = allRows.filter((row: any) => {
    const actionType = String(row?.actionType ?? "").toUpperCase();
    const status = getRowStatus(row);
    return actionType.includes("REMOVE") || status === "REMOVED";
  });
  const total: number = rows.length;
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

  const resolveGameName = (row: any) =>
    row.gameName ??
    row.marketName ??
    row.market?.name ??
    row.baseGameName ??
    row.marketId ??
    "-";

  const resolveSessionType = (row: any): "OPEN" | "CLOSE" | undefined => {
    const value =
      row?.sessionType ??
      row?.session ??
      row?.market?.sessionType ??
      row?.oldValue?.sessionType ??
      row?.oldValue?.session ??
      row?.newValue?.sessionType ??
      row?.newValue?.session;

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
      sessionType === "CLOSE" ? "text-rose-400" : "text-emerald-400";

    return (
      <>
        {baseGameName}{" "}
        <span className={sessionClassName}>({sessionLabel})</span>
      </>
    );
  };

  const findNestedFieldValue = (
    source: Record<string, any> | null,
    keys: string[],
    seen = new Set<any>(),
  ): string | null => {
    if (!source || typeof source !== "object" || seen.has(source)) return null;
    seen.add(source);

    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          return value.map((item) => String(item)).join(", ");
        }
        if (typeof value !== "object") {
          return String(value);
        }
      }
    }

    for (const value of Object.values(source)) {
      if (!value || typeof value !== "object") continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            const nested = findNestedFieldValue(item, keys, seen);
            if (nested) return nested;
          }
        }
        continue;
      }

      const nested = findNestedFieldValue(value, keys, seen);
      if (nested) return nested;
    }

    return null;
  };

  const getHistoryValue = (value: any, keys: string[]) => {
    const record = normalizeHistoryRecord(value);
    if (!record) return "-";

    return findNestedFieldValue(record, keys) ?? "-";
  };

  const getRemovedGameLabel = (row: any) => {
    const value = getHistoryValue(row.oldValue, [
      "selectedNumber",
      "selectedNumbers",
      "betNumber",
      "betNumbers",
      "gameNumber",
      "number",
    ]);
    if (value !== "-") return value;

    const nextValue = getHistoryValue(row.newValue, [
      "selectedNumber",
      "selectedNumbers",
      "betNumber",
      "betNumbers",
      "gameNumber",
      "number",
    ]);
    if (nextValue !== "-") return nextValue;

    return "-";
  };

  const getRemovedAmountLabel = (row: any) => {
    const value = getHistoryValue(row.oldValue, [
      "amount",
      "betAmount",
      "totalAmount",
    ]);
    if (value !== "-") return value;

    return getHistoryValue(row.newValue, ["amount", "betAmount", "totalAmount"]);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15">
            <Trash2 className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Play Remove History
            </h1>
            <p className="text-xs text-slate-400">
              Log of removed entry slips
            </p>
          </div>
        </div>
        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
          {total} Records
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/55 overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {[
                "SI",
                "User Name",
                "Games Name",
                "Remove Games",
                "Amount",
                "Date",
              ].map((h) => (
                <th
                  key={h}
                  className="border-r border-slate-700/50 px-4 py-3 text-center text-xs font-medium text-slate-400 last:border-r-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Trash2 className="h-8 w-8 text-slate-600" />
                    <p>No remove history found</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row: any, idx: number) => (
                <tr
                  key={row.id ?? idx}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                >
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <p className="text-xs font-medium text-white">
                      {row.user?.name ?? row.userId ?? "-"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{row.user?.username ?? "-"}
                    </p>
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-medium text-white last:border-r-0">
                    {renderGameName(row)}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center font-mono text-xs text-rose-300 last:border-r-0">
                    {getRemovedGameLabel(row)}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-semibold text-white last:border-r-0">
                    Rs. {getRemovedAmountLabel(row)}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-400 last:border-r-0">
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


