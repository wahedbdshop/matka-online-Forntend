/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Pencil, Search, Trash2 } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { PLAY_TYPE_LABEL, ENTRY_STATUS_STYLE, type PlayType } from "@/types/kalyan";
import {
  getKalyanMarketOptionLabel,
  getKalyanMarketSessionLabel,
} from "@/lib/kalyan-market-display";

const LIMIT = 20;
const PLAY_TYPES = Object.keys(PLAY_TYPE_LABEL) as PlayType[];

function isPlayType(value: unknown): value is PlayType {
  return typeof value === "string" && PLAY_TYPES.includes(value as PlayType);
}

function getPlayTypeLabel(value: unknown) {
  return isPlayType(value) ? PLAY_TYPE_LABEL[value] : String(value ?? "-");
}

function resolveGameName(entry: any) {
  if (entry?.market) {
    return getKalyanMarketSessionLabel(entry.market, resolveSessionType(entry));
  }

  const gameName = entry?.gameName?.trim?.() || entry?.items?.[0]?.gameName || entry?.marketId || "-";
  const sessionType = resolveSessionType(entry);
  if (sessionType) {
    const sessionLabel = sessionType === "CLOSE" ? "Close" : "Open";
    return `${gameName} (${sessionLabel})`;
  }
  return gameName;
}

function resolveSessionType(entry: any): "OPEN" | "CLOSE" | undefined {
  const value =
    entry?.sessionType ??
    entry?.session ??
    entry?.market?.sessionType ??
    entry?.items?.[0]?.sessionType ??
    entry?.items?.[0]?.session;
  if (!value) return undefined;

  const normalizedValue = String(value).toUpperCase();
  if (normalizedValue === "OPEN" || normalizedValue === "CLOSE") {
    return normalizedValue;
  }

  return undefined;
}

function formatGameName(entry: any) {
  return resolveGameName(entry);
}

function renderGameName(entry: any) {
  return resolveGameName(entry);
}

function resolvePlayType(entry: any) {
  return entry?.playType || "-";
}

function resolveBetNumber(entry: any) {
  return entry?.betNumbers || entry?.selectedNumber || "-";
}

function isRemovedStatus(value: unknown) {
  return String(value ?? "").toUpperCase() === "REMOVED";
}

function isCancelledStatus(value: unknown) {
  return String(value ?? "").toUpperCase() === "CANCELLED";
}

function getDisplayStatus(entry: any, item?: any) {
  return String(
    item?.gameStatus ??
      item?.status ??
      entry?.gameStatus ??
      entry?.status ??
      "ACTIVE",
  ).toUpperCase();
}

export default function KalyanPlayHistoryPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"" | "OPEN" | "CLOSE">("");
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [removeTarget, setRemoveTarget] = useState<any>(null);
  const [removedEntryIds, setRemovedEntryIds] = useState<string[]>([]);
  const [editNumber, setEditNumber] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "kalyan-entries",
      search,
      marketFilter,
      sessionFilter,
      playTypeFilter,
      statusFilter,
      dateFilter,
      page,
    ],
    queryFn: () =>
      KalyanAdminService.getAdminEntries({
        search: search || undefined,
        marketId: marketFilter || undefined,
        playType: playTypeFilter || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const markets: any[] = Array.from(
    new Map(
      (marketsData?.data?.markets ?? marketsData?.data ?? []).map((m: any) => [
        (m.name ?? m.marketName ?? m.title ?? "").trim().toLowerCase(),
        m,
      ])
    ).values()
  );
  const rawEntries: any[] = Array.isArray(data?.data?.entries)
    ? data.data.entries
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const isRemovedEntity = (value: any) =>
    isRemovedStatus(value?.gameStatus) ||
    isRemovedStatus(value?.status) ||
    isCancelledStatus(value?.gameStatus) ||
    isCancelledStatus(value?.status) ||
    value?.isRemoved === true ||
    Boolean(value?.removedAt);
  const entries = rawEntries.filter((entry) => {
    if (removedEntryIds.includes(String(entry?.id)) || isRemovedEntity(entry)) return false;
    if (sessionFilter) {
      const st = resolveSessionType(entry);
      if (st !== sessionFilter) return false;
    }
    return true;
  });
  const total: number = entries.length;
  const totalPages = Math.ceil(total / LIMIT);
  const rows = entries.flatMap((entry: any) => {
    const items = (Array.isArray(entry?.items) ? entry.items : []).filter(
      (item: any) => !isRemovedEntity(item),
    );

    if (items.length === 0) {
      return [
        {
          key: `${entry.id}-empty`,
          entry,
          itemId: null,
          entryId: entry.id,
          userName: entry.user?.name ?? entry.user?.username ?? "-",
          gameName: formatGameName(entry),
          sessionType: resolveSessionType(entry),
          category: resolvePlayType(entry),
          betNumber: resolveBetNumber(entry),
          betAmount: Number(entry.totalAmount ?? 0),
          status: getDisplayStatus(entry),
          dateTime: entry.createdAt,
        },
      ];
    }

    return items.map((item: any, index: number) => ({
      key: `${entry.id}-${item.id ?? index}`,
      entry,
      itemId: item.id ?? null,
      entryId: entry.id,
      userName: entry.user?.name ?? entry.user?.username ?? "-",
      gameName: formatGameName(entry),
      sessionType: resolveSessionType(entry),
      category: item.playType || entry.playType || "-",
      betNumber: item.selectedNumber || "-",
      betAmount: Number(item.amount ?? entry.totalAmount ?? 0),
      status: getDisplayStatus(entry, item),
      dateTime: item.createdAt ?? entry.createdAt,
    }));
  });

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const { mutate: updateEntryItem, isPending: updatingEntry } = useMutation({
    mutationFn: (payload: {
      id: string;
      data: {
        selectedNumber?: string;
        amount?: number;
        balanceAdjustment?: number;
        note?: string;
      };
    }) => KalyanAdminService.updateEntryItem(payload.id, payload.data),
    onSuccess: () => {
      toast.success("Entry updated");
      queryClient.invalidateQueries({ queryKey: ["kalyan-entries"] });
      setEditTarget(null);
      setEditNumber("");
      setEditAmount("");
      setBalanceAdjustment("");
      setEditNote("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update entry");
    },
  });

  const { mutate: removeEntry, isPending: removingEntry } = useMutation({
    mutationFn: (id: string) => KalyanAdminService.removeEntrySlip(id),
    onSuccess: (_response, id) => {
      toast.success("Entry removed");
      setRemovedEntryIds((currentIds) =>
        currentIds.includes(id) ? currentIds : [...currentIds, id],
      );
      queryClient.invalidateQueries({ queryKey: ["kalyan-entries"] });
      setRemoveTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to remove entry");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
            <History className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Play History</h1>
            <p className="text-xs text-slate-400">All Kalyan game entries</p>
          </div>
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          {total} Records
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Search user..."
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

        <select
          value={marketFilter ? `${marketFilter}${sessionFilter ? `:${sessionFilter}` : ""}` : ""}
          onChange={(e) => {
            const [mid, session] = e.target.value.split(":");
            setMarketFilter(mid);
            setSessionFilter((session as "" | "OPEN" | "CLOSE") || "");
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Markets</option>
          {markets.map((market: any) => {
            const baseName = getKalyanMarketOptionLabel(market);
            return [
              <option key={`${market.id}:OPEN`} value={`${market.id}:OPEN`}>
                {baseName} — Open
              </option>,
              <option key={`${market.id}:CLOSE`} value={`${market.id}:CLOSE`}>
                {baseName} — Close
              </option>,
            ];
          })}
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

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Status</option>
          {["PENDING", "WON", "LOST", "CANCELLED", "REMOVED"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        />
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-800/55 overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {[
                "SI.No",
                "User Name",
                "Games Name",
                "Category",
                "Bet Number",
                "Bet Amount",
                "Status",
                "Date Time",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-r border-slate-700/50 px-4 py-3 text-center text-xs font-medium text-slate-400 last:border-r-0"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-700/50">
                  {Array.from({ length: 9 }).map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0"
                    >
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No entries found
                </td>
              </tr>
            ) : (
              rows.map((row: any, index: number) => (
                <tr
                  key={row.key}
                  onClick={() => setDetailEntry(row.entry)}
                  className="cursor-pointer border-b border-slate-700/50 transition-colors hover:bg-slate-700/20"
                >
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">
                    {(page - 1) * LIMIT + index + 1}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-medium text-white last:border-r-0">
                    {row.userName}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-300 last:border-r-0">
                    {renderGameName(row.entry)}
                    {row.sessionType && (
                      <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wide ${row.sessionType === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.sessionType === "OPEN" ? "Open" : "Close"}
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-300 last:border-r-0">
                    {row.category}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-medium text-cyan-300 last:border-r-0">
                    {row.betNumber}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs font-semibold text-white last:border-r-0">
                    Rs. {Number(row.betAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ENTRY_STATUS_STYLE[row.status] ?? ""}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400 last:border-r-0">
                    {formatDate(row.dateTime)}
                  </td>
                  <td className="px-4 py-3 text-center last:border-r-0">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={!row.itemId}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!row.itemId) return;
                          setEditTarget(row);
                          setEditNumber(String(row.betNumber ?? ""));
                          setEditAmount(String(row.betAmount ?? ""));
                          setBalanceAdjustment("");
                          setEditNote("");
                        }}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Pencil className="h-3 w-3" />
                          Edit
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRemoveTarget(row);
                        }}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-500/20"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </span>
                      </button>
                    </div>
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
            onClick={() => setPage((currentPage) => currentPage - 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEditTarget(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Edit Play Entry</h2>
              <button
                onClick={() => setEditTarget(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                x
              </button>
            </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
                  <p><span className="text-slate-500">User:</span> {editTarget.userName}</p>
                  <p><span className="text-slate-500">Game:</span> {editTarget.gameName}</p>
                  <p><span className="text-slate-500">Number:</span> {editTarget.betNumber}</p>
                </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Bet Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editNumber}
                  onChange={(event) => setEditNumber(event.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Bet Amount</label>
                <input
                  type="number"
                  min="0"
                  value={editAmount}
                  onChange={(event) => setEditAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Balance Adjustment</label>
                <input
                  type="number"
                  value={balanceAdjustment}
                  onChange={(event) => setBalanceAdjustment(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Note</label>
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  rows={3}
                  placeholder="Optional admin note"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={updatingEntry || !editTarget.itemId}
                onClick={() => {
                  updateEntryItem({
                    id: editTarget.itemId,
                    data: {
                      selectedNumber: editNumber.trim() || undefined,
                      amount: editAmount === "" ? undefined : Number(editAmount),
                      balanceAdjustment:
                        balanceAdjustment === "" ? undefined : Number(balanceAdjustment),
                      note: editNote.trim() || undefined,
                    },
                  });
                }}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 disabled:opacity-40"
              >
                {updatingEntry ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setRemoveTarget(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Remove Entry</h2>
              <button
                onClick={() => setRemoveTarget(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                x
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              This entry will be removed from user history, but admin will still be able to see it in remove history.
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-300">
              <p><span className="text-slate-500">User:</span> {removeTarget.userName}</p>
              <p><span className="text-slate-500">Game:</span> {removeTarget.gameName}</p>
              <p><span className="text-slate-500">Number:</span> {removeTarget.betNumber}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={removingEntry}
                onClick={() => removeEntry(removeTarget.entryId)}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 disabled:opacity-40"
              >
                {removingEntry ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailEntry(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Entry Details</h2>
              <button
                onClick={() => setDetailEntry(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                x
              </button>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-2">
              {[
                ["User", `${detailEntry.user?.name ?? "-"} (@${detailEntry.user?.username ?? "-"})`],
                ["Games Name", formatGameName(detailEntry)],
                ["Category", resolvePlayType(detailEntry)],
                ["Bet Number", resolveBetNumber(detailEntry)],
                ["Bet Amount", `Rs. ${Number(detailEntry.totalAmount ?? 0).toLocaleString()}`],
                ["Status", getDisplayStatus(detailEntry)],
                ["Bet Result", detailEntry.betStatus ?? detailEntry.status ?? "-"],
                ["Date Time", formatDate(detailEntry.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-medium text-white">
                    {label === "Games Name" ? renderGameName(detailEntry) : value}
                  </span>
                </div>
              ))}
            </div>
            {detailEntry.items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">Items</p>
                <div className="space-y-1.5">
                  {detailEntry.items.map((item: any, index: number) => (
                    <div
                      key={item.id ?? index}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs text-slate-300">
                          {getPlayTypeLabel(item.playType)}
                        </p>
                        <p className="font-mono text-sm font-bold text-white">
                          {item.selectedNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-white">
                          Rs. {Number(item.amount ?? 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-400">{item.betStatus ?? item.status ?? "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
