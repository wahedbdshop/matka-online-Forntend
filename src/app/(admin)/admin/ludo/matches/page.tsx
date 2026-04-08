/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LudoAdminService } from "@/services/ludoAdmin.service";
import { cn } from "@/lib/utils";

const STATUSES = ["ALL", "PENDING", "ACTIVE", "FINISHED", "CANCELLED"];

const statusColor: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  ACTIVE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  FINISHED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function LudoMatchesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [userIdInput, setUserIdInput] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ludo-admin-matches", status, page, userIdFilter],
    queryFn: () =>
      LudoAdminService.getMatches({
        status: status === "ALL" ? undefined : status,
        page,
        limit: 20,
        userId: userIdFilter || undefined,
      }),
  });

  const { mutate: cancelMatch, isPending: cancelling } = useMutation({
    mutationFn: LudoAdminService.cancelMatch,
    onSuccess: () => {
      toast.success("Match cancelled & stake refunded");
      queryClient.invalidateQueries({ queryKey: ["ludo-admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["ludo-admin-stats"] });
    },
    onError: () => toast.error("Failed to cancel match"),
  });

  const matches: any[] = Array.isArray(data?.data?.matches)
    ? data.data.matches
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const total: number = data?.data?.total ?? matches.length;
  const totalPages = Math.ceil(total / 20);

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

  const handleCancelConfirm = (id: string) => {
    if (!confirm("Cancel this match and refund both players?")) return;
    cancelMatch(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Ludo Matches</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {total} total matches
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-800/60 p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                status === s
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* User filter */}
        <div className="flex gap-2">
          <input
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="Filter by User ID..."
            className="h-9 rounded-xl border border-slate-600 bg-slate-800 px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
          />
          <button
            onClick={() => { setUserIdFilter(userIdInput.trim()); setPage(1); }}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 text-xs font-bold text-white hover:bg-purple-700"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          {userIdFilter && (
            <button
              onClick={() => { setUserIdFilter(""); setUserIdInput(""); setPage(1); }}
              className="rounded-xl border border-slate-600 bg-slate-800 px-3 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50">
        <div className="grid grid-cols-[1fr_80px_90px_110px_110px_80px] border-b border-slate-700 bg-slate-900/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>Match / Players</span>
          <span className="text-center">Stake</span>
          <span className="text-center">Mode</span>
          <span className="text-center">Status</span>
          <span className="text-center">Date</span>
          <span className="text-center">Action</span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-700" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            No matches found
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {matches.map((m: any) => {
              const p1 = m.playerOne ?? m.playerOneId ?? "-";
              const p2 = m.playerTwo ?? m.playerTwoId ?? "-";
              const p1Name = typeof p1 === "object" ? (p1.username ?? p1.name ?? p1.id) : p1;
              const p2Name = typeof p2 === "object" ? (p2.username ?? p2.name ?? p2.id) : p2;
              const canCancel = m.status === "PENDING" || m.status === "ACTIVE";

              return (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_80px_90px_110px_110px_80px] items-center gap-2 px-4 py-3 hover:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {p1Name} vs {p2Name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">#{m.id.slice(-8)}</p>
                  </div>

                  <p className="text-center text-xs font-bold text-white">
                    ৳{Number(m.stakeAmount).toLocaleString()}
                  </p>

                  <p className="text-center text-[10px] text-slate-400">
                    {m.pieceMode ?? "-"}
                  </p>

                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        statusColor[m.status] ?? "border-slate-600 text-slate-400",
                      )}
                    >
                      {m.status}
                    </span>
                  </div>

                  <p className="text-center text-[10px] text-slate-400">
                    {formatDate(m.createdAt)}
                  </p>

                  <div className="flex justify-center">
                    {canCancel ? (
                      <button
                        onClick={() => handleCancelConfirm(m.id)}
                        disabled={cancelling}
                        className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-40"
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
