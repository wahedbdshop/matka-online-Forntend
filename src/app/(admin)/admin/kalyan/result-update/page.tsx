/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { RESULT_STATUS_STYLE } from "@/types/kalyan";
import {
  getKalyanMarketSessionLabel,
  getKalyanMarketSessionOptionLabel,
} from "@/lib/kalyan-market-display";

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
  if (result?.market) {
    return getKalyanMarketSessionLabel(result.market, getSessionType(result));
  }

  return String(result?.gameName ?? result?.marketName ?? result?.marketId ?? "-").trim();
}

function getSessionType(result: any): "OPEN" | "CLOSE" | undefined {
  const val = result?.sessionType ?? result?.session ?? result?.type ?? result?.market?.sessionType;
  if (val) {
    const up = String(val).toUpperCase();
    if (up === "OPEN" || up === "CLOSE") return up;
  }

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

  // Cancelled-state toggles for open/close sessions
  const [openCancelled, setOpenCancelled] = useState(false);
  const [closeCancelled, setCloseCancelled] = useState(false);

  // Holds pending form data while warning modal is shown
  const [pendingUpdate, setPendingUpdate] = useState<FormData | null>(null);

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

  const markets: any[] = Array.from(
    new Map(
      (marketsData?.data?.markets ?? marketsData?.data ?? []).map((m: any) => [
        (m.name ?? m.marketName ?? m.title ?? "").trim().toLowerCase(),
        m,
      ])
    ).values()
  );
  const results: any[] = data?.data?.results ?? data?.data ?? [];
  const total: number = data?.data?.total ?? results.length;
  const totalPages = Math.ceil(total / LIMIT);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openEdit = (r: any) => {
    setEditTarget(r);
    const openPatti = r.openPatti ?? "";
    const closePatti = r.closePatti ?? "";
    const isCancelled = r.status === "CANCELLED";
    const isOpenCancelled = isCancelled || !openPatti || openPatti === "000";
    const isCloseCancelled = isCancelled || !closePatti || closePatti === "000";
    setOpenCancelled(isOpenCancelled);
    setCloseCancelled(isCloseCancelled);
    reset({
      resultDate: r.resultDate?.split("T")[0] ?? "",
      openPatti: openPatti || "000",
      closePatti: closePatti || "000",
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    setOpenCancelled(false);
    setCloseCancelled(false);
    setPendingUpdate(null);
  };

  const toggleOpenCancelled = () => {
    const next = !openCancelled;
    setOpenCancelled(next);
    if (next) {
      // Cancelling open also cancels close (open must be resolved first)
      setCloseCancelled(true);
      setValue("openPatti", "000", { shouldValidate: true });
      setValue("closePatti", "000", { shouldValidate: true });
    }
  };

  const toggleCloseCancelled = () => {
    if (openCancelled) return; // Can't toggle close while open is cancelled
    const next = !closeCancelled;
    setCloseCancelled(next);
    if (next) {
      setValue("closePatti", "000", { shouldValidate: true });
    }
  };

  const { mutate: update, isPending } = useMutation({
    mutationFn: (d: FormData) =>
      KalyanAdminService.updateResult(editTarget.id, d),
    onSuccess: () => {
      toast.success("Result updated");
      queryClient.invalidateQueries({ queryKey: ["kalyan-results-update"] });
      closeEdit();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Update failed"),
  });

  // Form submits into the warning gate, not directly to the API
  const onFormSubmit = (data: FormData) => {
    setPendingUpdate(data);
  };

  const confirmUpdate = () => {
    if (pendingUpdate) update(pendingUpdate);
  };

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
              {getKalyanMarketSessionOptionLabel(m)}
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

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5">
            {/* Modal header */}
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
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              {/* Result Date */}
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

              {/* ── Grouped Open / Close inputs ───────────────────── */}
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Game Sessions
                </p>

                {/* Open Patti */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      Open Patti
                    </label>
                    <button
                      type="button"
                      onClick={toggleOpenCancelled}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                        openCancelled
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {openCancelled ? "Cancelled" : "Active"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      {...register("openPatti")}
                      disabled={openCancelled}
                      className={`w-full rounded-lg border px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest outline-none transition-all ${
                        openCancelled
                          ? "cursor-not-allowed border-rose-500/20 bg-rose-500/5 text-rose-400/50"
                          : "border-slate-600 bg-slate-800 text-white focus:border-yellow-500"
                      }`}
                    />
                    {openCancelled && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-400">
                          Cancelled
                        </span>
                      </div>
                    )}
                  </div>
                  {errors.openPatti && !openCancelled && (
                    <p className="text-[10px] text-red-400">
                      {errors.openPatti.message}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-700/50" />

                {/* Close Patti */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">
                      Close Patti
                    </label>
                    <button
                      type="button"
                      onClick={toggleCloseCancelled}
                      disabled={openCancelled}
                      title={openCancelled ? "Open must be active before Close can be changed" : undefined}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        closeCancelled
                          ? "border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {closeCancelled ? "Cancelled" : "Active"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      {...register("closePatti")}
                      disabled={closeCancelled}
                      className={`w-full rounded-lg border px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest outline-none transition-all ${
                        closeCancelled
                          ? "cursor-not-allowed border-rose-500/20 bg-rose-500/5 text-rose-400/50"
                          : "border-slate-600 bg-slate-800 text-white focus:border-yellow-500"
                      }`}
                    />
                    {closeCancelled && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-400">
                          Cancelled
                        </span>
                      </div>
                    )}
                  </div>
                  {errors.closePatti && !closeCancelled && (
                    <p className="text-[10px] text-red-400">
                      {errors.closePatti.message}
                    </p>
                  )}
                </div>

                {openCancelled && (
                  <p className="text-[10px] text-amber-400/80">
                    Cancelling Open also cancels Close. Toggle Open back to Active to edit Close independently.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-yellow-600 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700"
                >
                  Update Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Warning / Confirmation Modal ───────────────────────────── */}
      {pendingUpdate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-6 space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm Update</h3>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Warning body */}
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-slate-300">
              Updating this result will automatically{" "}
              <span className="font-semibold text-amber-300">
                deduct previous winnings
              </span>{" "}
              from users for{" "}
              <span className="font-semibold text-white">Patti</span>,{" "}
              <span className="font-semibold text-white">Jori</span>, and{" "}
              <span className="font-semibold text-white">Total</span>. Do you
              want to proceed?
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingUpdate(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={confirmUpdate}
                disabled={isPending}
                className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? "Updating..." : "Yes, Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
