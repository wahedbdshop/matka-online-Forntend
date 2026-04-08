/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Search } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { RESULT_STATUS_STYLE } from "@/types/kalyan";

const schema = z.object({
  resultDate: z.string().min(1, "Date required"),
  openPatti: z
    .string()
    .min(1, "Open Patti required")
    .regex(/^\d+$/, "Must be numeric"),
  closePatti: z
    .string()
    .min(1, "Close Patti required")
    .regex(/^\d+$/, "Must be numeric"),
});
type FormData = z.infer<typeof schema>;

const LIMIT = 20;

function getGameName(result: any) {
  const rawName =
    result?.market?.name ??
    result?.market?.openName ??
    result?.market?.closeName ??
    result?.gameName ??
    result?.marketName ??
    result?.marketId ??
    "-";

  return String(rawName)
    .replace(/\bopen\b/gi, "")
    .replace(/\bclose\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSessionType(result: any): "OPEN" | "CLOSE" | undefined {
  // Direct field
  const val = result?.sessionType ?? result?.session ?? result?.type ?? result?.market?.sessionType;
  if (val) {
    const up = String(val).toUpperCase();
    if (up === "OPEN" || up === "CLOSE") return up;
  }

  // Infer from patti values: whichever is non-"000" tells us the session
  const open = String(result?.openPatti ?? "").trim();
  const close = String(result?.closePatti ?? "").trim();
  if (open && open !== "000" && (!close || close === "000")) return "OPEN";
  if (close && close !== "000" && (!open || open === "000")) return "CLOSE";

  return undefined;
}

function formatDateLabel(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

export default function KalyanResultUpdatePage() {
  const queryClient = useQueryClient();
  const [marketFilter, setMarketFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "kalyan-results-update",
      marketFilter,
      statusFilter,
      dateFilter,
      page,
    ],
    queryFn: () =>
      KalyanAdminService.getResults({
        marketId: marketFilter || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const markets: any[] = marketsData?.data?.markets ?? marketsData?.data ?? [];
  const results: any[] = data?.data?.results ?? data?.data ?? [];
  const total: number = data?.data?.total ?? results.length;
  const totalPages = Math.ceil(total / LIMIT);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openEdit = (r: any) => {
    setEditTarget(r);
    reset({
      resultDate: r.resultDate?.split("T")[0] ?? "",
      openPatti: r.openPatti ?? "",
      closePatti: r.closePatti ?? "",
    });
  };

  const { mutate: update, isPending } = useMutation({
    mutationFn: (d: FormData) =>
      KalyanAdminService.updateResult(editTarget.id, d),
    onSuccess: () => {
      toast.success("Result updated");
      queryClient.invalidateQueries({ queryKey: ["kalyan-results-update"] });
      setEditTarget(null);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Update failed"),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/15">
          <Pencil className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Result Update</h1>
          <p className="text-xs text-slate-400">
            Search and update existing results
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={marketFilter}
          onChange={(e) => {
            setMarketFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Markets</option>
          {markets.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.name}
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
          <option value="PENDING">Pending</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
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

      {/* Table */}
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/55 overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {[
                "SI",
                "Games Name",
                "Date",
                "Open Patti",
                "Close Patti",
                "Status",
                "Actions",
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No results found
                </td>
              </tr>
            ) : (
              results.map((r: any, idx: number) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                >
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center font-medium text-white last:border-r-0">
                    {getGameName(r)}
                    {getSessionType(r) && (
                      <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wide ${getSessionType(r) === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                        ({getSessionType(r)})
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-300 last:border-r-0">
                    {formatDateLabel(r.resultDate)}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center font-mono font-bold text-white last:border-r-0">
                    {r.openPatti ?? "-"}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center font-mono font-bold text-white last:border-r-0">
                    {r.closePatti ?? "-"}
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${RESULT_STATUS_STYLE[r.status] ?? ""}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                    <button
                      onClick={() => openEdit(r)}
                      disabled={r.status === "CANCELLED"}
                      className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-30"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
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

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Update Result</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {getGameName(editTarget)}
                  {getSessionType(editTarget) && (
                    <span className={`ml-1 font-semibold ${getSessionType(editTarget) === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                      ({getSessionType(editTarget)})
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setEditTarget(null)}>
                <Search className="h-4 w-4 text-slate-400 rotate-45" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((d) => update(d))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">
                  Result Date
                </label>
                <input
                  type="date"
                  {...register("resultDate")}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500"
                />
                {errors.resultDate && (
                  <p className="text-[10px] text-red-400">
                    {errors.resultDate.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Open Patti
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    {...register("openPatti")}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-white outline-none focus:border-yellow-500"
                  />
                  {errors.openPatti && (
                    <p className="text-[10px] text-red-400">
                      {errors.openPatti.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Close Patti
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    {...register("closePatti")}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-white outline-none focus:border-yellow-500"
                  />
                  {errors.closePatti && (
                    <p className="text-[10px] text-red-400">
                      {errors.closePatti.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-yellow-600 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


