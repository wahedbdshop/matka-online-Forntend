/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Search, Gamepad2, AlertCircle } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { MARKET_STATUS_STYLE } from "@/types/kalyan";

const MARKET_LIST_LIMIT = 1000;

function sortMarketsByOldest<T extends { createdAt?: string; id?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function getTimingList(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  if (data?.data) return [data.data];
  return [];
}

export default function KalyanLotteryGamesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-markets"],
    queryFn: () =>
      KalyanAdminService.getMarkets({
        limit: MARKET_LIST_LIMIT,
      }),
  });

  const markets = useMemo<any[]>(() => {
    const allMarkets = sortMarketsByOldest(data?.data?.markets ?? data?.data ?? []);

    return allMarkets.filter((market: any) => {
      const matchesSearch = search
        ? String(market?.name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesStatus = statusFilter
        ? String(market?.status ?? "").toUpperCase() === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);
  const timingQueries = useQueries({
    queries: markets.map((market: any) => ({
      queryKey: ["kalyan-timing", market.id],
      queryFn: () => KalyanAdminService.getMarketTiming(market.id),
      enabled: !!market.id,
    })),
  });
  const timingByMarketId = useMemo(
    () =>
      new Map(
        markets.map((market: any, index: number) => [
          market.id,
          getTimingList(timingQueries[index]?.data)[0] ?? null,
        ]),
      ),
    [markets, timingQueries],
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { mutate: toggleStatus } = useMutation({
    mutationFn: async ({ market, timing }: { market: any; timing: any | null }) => {
      const currentStatus = timing?.status ?? market.status ?? "ACTIVE";
      const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      if (timing) {
        await KalyanAdminService.setMarketTiming(market.id, {
          sessionType: timing.sessionType ?? market.sessionType ?? "OPEN",
          openTime: timing.openTime ?? market.openTime ?? "00:00",
          closeTime: timing.closeTime ?? market.closeTime ?? "00:00",
          status: nextStatus,
        });
      }

      const baseName = market.name?.trim().toLowerCase();
      if (!baseName) {
        return;
      }

      const pairedMarkets = markets.filter(
        (item: any) => item.id !== market.id && item.name?.trim().toLowerCase() === baseName,
      );

      await Promise.all(
        pairedMarkets.map(async (paired: any) => {
          const pairedTimingResponse = await KalyanAdminService.getMarketTiming(paired.id).catch(() => null);
          const pairedTiming = getTimingList(pairedTimingResponse)[0];

          if (!pairedTiming) {
            return;
          }

          await KalyanAdminService.setMarketTiming(paired.id, {
            sessionType: pairedTiming.sessionType ?? paired.sessionType ?? "OPEN",
            openTime: pairedTiming.openTime ?? paired.openTime ?? "00:00",
            closeTime: pairedTiming.closeTime ?? paired.closeTime ?? "00:00",
            status: nextStatus,
          });
        }),
      );
    },
    onSuccess: () => {
      setTogglingId(null);
      toast.success("Game status updated");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets-all"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-timing"] });
    },
    onError: (error: any) => {
      setTogglingId(null);
      toast.error(error?.response?.data?.message || "Failed to update status");
    },
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => KalyanAdminService.deleteMarket(id),
    onSuccess: () => {
      toast.success("Lottery game deleted");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets-all"] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Failed to delete lottery game";
      setDeleteError(msg);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
          <Gamepad2 className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Lottery Games</h1>
          <p className="text-xs text-slate-400">Manage market names, sessions, and status</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Search by game name..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchInput);
              }
            }}
            className="w-52 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => {
              setSearch(searchInput);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 transition-colors hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-300" />
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-800/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {["SI.No", "Name", "Status", "Action"].map((heading) => (
                <th key={heading} className="border-r border-slate-700/50 px-4 py-3 text-center text-xs font-medium text-slate-400 last:border-r-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-700/50">
                  {Array.from({ length: 4 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : markets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No lottery games found</td>
              </tr>
            ) : (
              markets.map((market: any, index: number) => {
                const timing = timingByMarketId.get(market.id);
                const effectiveStatus = timing?.status ?? market.status ?? "ACTIVE";

                return (
                <tr key={market.id} className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/20">
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">{index + 1}</td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium text-white">{market.name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${(timing?.sessionType ?? market.sessionType) === "CLOSE" ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-green-500/30 bg-green-500/10 text-green-400"}`}>
                        {timing?.sessionType ?? market.sessionType ?? "OPEN"}
                      </span>
                    </div>
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${MARKET_STATUS_STYLE[effectiveStatus] ?? ""}`}>
                      {effectiveStatus}
                    </span>
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={togglingId === market.id}
                        onClick={() => {
                          setTogglingId(market.id);
                          toggleStatus({ market, timing });
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                          effectiveStatus === "ACTIVE"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        }`}
                      >
                        {togglingId === market.id
                          ? "..."
                          : effectiveStatus === "ACTIVE"
                            ? "Inactive"
                            : "Active"}
                      </button>
                      <button type="button" onClick={() => { setDeleteTarget(market); setDeleteError(null); }} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/20">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(event) => {
          if (event.target === event.currentTarget) { setDeleteTarget(null); setDeleteError(null); }
        }}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <h2 className="text-sm font-bold text-white">Delete Lottery Game</h2>
            <p className="text-xs text-slate-400">Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget.name}</span>? This action cannot be undone.</p>
            {deleteError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{deleteError}</p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700">Cancel</button>
              <button type="button" onClick={() => remove(deleteTarget.id)} disabled={removing} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                {removing ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
