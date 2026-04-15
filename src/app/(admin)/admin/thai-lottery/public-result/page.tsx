/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/public-result/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, X, Check } from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";
import {
  formatBangladeshDate,
  formatBangladeshDateTime,
} from "@/lib/bangladesh-time";

const LIMIT = 20;

export default function ThaiPublicResultPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editRound, setEditRound] = useState<any>(null);
  const [threeUp, setThreeUp] = useState("");
  const [downDirect, setDownDirect] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-public-results", page],
    queryFn: () => AdminService.getThaiRounds("RESULTED", page, LIMIT),
  });

  const rounds = data?.data?.rounds ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const { mutate: updatePublic, isPending: updating } = useMutation({
    mutationFn: () =>
      AdminService.editThaiResult(editRound.id, {
        resultThreeUpDirect: threeUp,
        resultTwoUpDirect: threeUp.slice(1),
        resultDownDirect: downDirect,
        publishPublicResult: true,
        note: "Public result updated",
      }),
    onSuccess: () => {
      toast.success("Public result updated");
      queryClient.invalidateQueries({
        queryKey: ["admin-thai-public-results"],
      });
      setEditRound(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Public Result</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            3Up Direct and Down Direct results visible to all users
          </p>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-400">
          {total} Rounds
        </span>
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
                Issue
              </th>
              <th className="px-4 py-3 text-xs font-medium text-[#d6b4ff]">
                3Up Direct
              </th>
              <th className="px-4 py-3 text-xs font-medium text-[#ffb020]">
                Down Direct
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Draw Date (BD)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Resulted At (BD Time)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Published
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rounds.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No resulted rounds found
                </td>
              </tr>
            ) : (
              rounds.map((round: any, idx: number) => (
                <tr
                  key={round.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {round.issueNumber}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-[#d6b4ff]">
                    {round.publicResultThreeUpDirect ?? (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-[#ffb020]">
                    {round.publicResultDownDirect ?? (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatBangladeshDate(
                      round.drawDate,
                      { timeZone: round.scheduleTimeZone },
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatBangladeshDateTime(
                      round.resultedAt,
                      { timeZone: round.scheduleTimeZone },
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {round.isPublicResultPublished ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Eye className="h-3.5 w-3.5" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <EyeOff className="h-3.5 w-3.5" />
                        Hidden
                      </span>
                    )}
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

      {/* Edit Modal */}
      {editRound && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRound(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Edit Public Result
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Round #{editRound.issueNumber}
                </p>
              </div>
              <button onClick={() => setEditRound(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* 3Up */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                3Up Direct <span className="text-slate-600">(3 digit)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={threeUp}
                onChange={(e) =>
                  setThreeUp(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                className="w-full rounded-lg border border-[#5232a8]/50 bg-[#151136] px-3 py-2.5 text-center text-xl font-bold tracking-[0.2em] text-[#d6b4ff] outline-none focus:border-[#5232a8]"
                placeholder="---"
              />
            </div>

            {/* Down */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Down Direct <span className="text-slate-600">(2 digit)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={downDirect}
                onChange={(e) =>
                  setDownDirect(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                className="w-full rounded-lg border border-[#8d4d00]/50 bg-[#2a1908] px-3 py-2.5 text-center text-xl font-bold tracking-[0.2em] text-[#ffb020] outline-none focus:border-[#8d4d00]"
                placeholder="--"
              />
            </div>

            {/* publish info */}
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <Check className="h-4 w-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-400">
                Saving will publish the result automatically for all users
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditRound(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => updatePublic()}
                disabled={
                  threeUp.length !== 3 || downDirect.length !== 2 || updating
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
