/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronRight, Clock, Lock } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { formatBangladeshDateTime } from "@/lib/bangladesh-time";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-green-500/15 text-green-400 border-green-500/30",
  CLOSED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  RESULTED: "bg-blue-500/15  text-blue-400  border-blue-500/30",
  CANCELLED: "bg-red-500/15   text-red-400   border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  RESULTED: "Resulted",
  CANCELLED: "Cancelled",
};

export default function AdminThaiLotteryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-rounds", statusFilter, page],
    queryFn: () =>
      AdminService.getThaiRounds(statusFilter || undefined, page, LIMIT),
  });

  const { mutate: closeRound, isPending: closing } = useMutation({
    mutationFn: (id: string) => AdminService.closeThaiRound(id),
    onSuccess: () => {
      toast.success("Round closed");
      queryClient.invalidateQueries({ queryKey: ["admin-thai-rounds"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const rounds = data?.data?.rounds ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Thai Lottery</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage all lottery rounds
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/thai-lottery/rounds/create")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Round
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "OPEN", "CLOSED", "RESULTED"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Issue
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Draw Date (BD Time)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Close Time (BD Time)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Created At (BD Time)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Resulted At (BD Time)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Result
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rounds.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No rounds found
                </td>
              </tr>
            ) : (
              rounds.map((round: any) => (
                <tr
                  key={round.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-white">
                    {round.issueNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatBangladeshDateTime(
                      round.drawDate,
                      { timeZone: round.scheduleTimeZone },
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {round.closeTime ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-yellow-400" />
                        {formatBangladeshDateTime(
                          round.closeTime,
                          { timeZone: round.scheduleTimeZone },
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatBangladeshDateTime(
                      round.createdAt,
                      { timeZone: round.scheduleTimeZone },
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatBangladeshDateTime(
                      round.resultedAt,
                      { timeZone: round.scheduleTimeZone },
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[round.status] ?? ""}`}
                    >
                      {STATUS_LABEL[round.status] ?? round.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {round.resultThreeUpDirect ? (
                      <span className="font-mono text-[#d6b4ff]">
                        {round.resultThreeUpDirect} / {round.resultDownDirect}
                      </span>
                    ) : (
                      <span className="text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {round.status === "OPEN" && (
                        <button
                          onClick={() => closeRound(round.id)}
                          disabled={closing}
                          className="flex items-center gap-1 rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
                        >
                          <Lock className="h-3 w-3" />
                          Close
                        </button>
                      )}
                      <button
                        onClick={() =>
                          router.push(`/admin/thai-lottery/rounds/${round.id}`)
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600"
                      >
                        Manage
                        <ChevronRight className="h-3 w-3" />
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
