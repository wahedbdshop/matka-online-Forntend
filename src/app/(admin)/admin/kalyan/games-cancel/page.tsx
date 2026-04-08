/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const LIMIT = 20;

function formatDateLabel(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function normalizeGameName(value?: string) {
  const normalized = String(value ?? "")
    .replace(/\bopen\b/gi, "")
    .replace(/\bclose\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "Unknown Game";
}

function getSessionLabel(round: any) {
  const rawValue =
    round?.sessionType ??
    round?.roundType ??
    round?.gameSession ??
    round?.session;

  const normalized = String(rawValue ?? "").trim().toUpperCase();

  if (normalized === "OPEN") return "Open";
  if (normalized === "CLOSE") return "Close";

  return "-";
}

function getDisplayGameName(round: any) {
  const rawGameName = String(round.gameName ?? "").trim();
  if (/\b(open|close)\b/i.test(rawGameName)) {
    return rawGameName.replace(/\s+/g, " ").trim();
  }

  const baseName = normalizeGameName(round.baseGameName ?? round.gameName);
  const session = getSessionLabel(round);

  if (session === "Open" || session === "Close") {
    return `${baseName} ${session}`;
  }

  return normalizeGameName(round.gameName ?? round.baseGameName);
}

export default function KalyanGamesCancelPage() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-cancelable-rounds", dateFilter, page],
    queryFn: () =>
      KalyanAdminService.getCancelableRounds({
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const rounds = useMemo<any[]>(
    () =>
      Array.isArray(data?.data?.rounds)
        ? data.data.rounds
        : Array.isArray(data?.data)
          ? data.data
          : [],
    [data],
  );

  const total = data?.data?.total ?? rounds.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: (payload: { marketId: string; resultDate: string }) =>
      KalyanAdminService.cancelResultByMarket(payload),
    onSuccess: () => {
      toast.success("Game cancelled and refund processed");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-cancelable-rounds"] });
      setConfirmTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cancel failed");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15">
          <XCircle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Games Cancel</h1>
          <p className="text-xs text-slate-400">Cancelable played rounds with auto refund support.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/45 shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-800/95 text-left">
                {["SI", "Games Name", "Date", "Actions"].map((heading) => (
                  <th
                    key={heading}
                    className="border-r border-slate-700/70 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-200 last:border-r-0"
                  >
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
                      <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rounds.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    No cancelable played games found.
                  </td>
                </tr>
              ) : (
                rounds.map((round: any, index: number) => (
                  <tr
                    key={`${round.marketId}-${round.resultDate}`}
                    className="border-b border-slate-700/50 bg-slate-900/20 transition-colors hover:bg-slate-800/45"
                  >
                    <td className="border-r border-slate-700/40 px-4 py-4 text-xs font-semibold text-slate-400 last:border-r-0">
                      {(page - 1) * LIMIT + index + 1}
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 font-semibold text-white last:border-r-0">
                      <div className="space-y-1">
                        <p>{getDisplayGameName(round)}</p>
                        <p className="text-[11px] text-slate-400">Played slips: {round.entryCount ?? 0}</p>
                      </div>
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 text-sm text-slate-300 last:border-r-0">
                      {formatDateLabel(round.resultDate)}
                    </td>
                    <td className="border-r border-slate-700/40 px-4 py-4 last:border-r-0">
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(round)}
                        disabled={!round.canCancel}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {confirmTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 mx-auto">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-bold text-white">Confirm Cancel</h2>
              <p className="mt-1 text-xs text-slate-400">
                Cancel game <span className="font-semibold text-white">{normalizeGameName(confirmTarget.baseGameName ?? confirmTarget.gameName)}</span> on {formatDateLabel(confirmTarget.resultDate)}?
              </p>
              <p className="mt-1 text-[10px] text-red-400">
                This will cancel the game and refund all active played amounts.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={() =>
                  cancel({
                    marketId: confirmTarget.marketId,
                    resultDate: confirmTarget.resultDate,
                  })
                }
                disabled={isPending || !confirmTarget.canCancel}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
