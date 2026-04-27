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

function hasOpenResult(result: any) {
  return !!result?.openPatti && result.openPatti !== "000";
}

function hasCloseResult(result: any) {
  return !!result?.closePatti && result.closePatti !== "000";
}

function getOpenDigit(result: any) {
  if (result?.openPatti && result.openPatti !== "000") {
    const sum = String(result.openPatti)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result?.openTotal !== undefined && result?.openTotal !== null) {
    return String(result.openTotal);
  }

  return result?.finalResult?.[0] ?? "";
}

function getCloseDigit(result: any) {
  if (result?.closePatti && result.closePatti !== "000") {
    const sum = String(result.closePatti)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result?.closeTotal !== undefined && result?.closeTotal !== null) {
    return String(result.closeTotal);
  }

  return result?.finalResult?.[1] ?? "";
}

function inferPattiType(value?: string | null) {
  const normalized = String(value ?? "").trim();

  if (!/^\d{3}$/.test(normalized) || normalized === "000") return "";

  const uniqueCount = new Set(normalized.split("")).size;
  if (uniqueCount === 3) return "Single Patti";
  if (uniqueCount === 2) return "Double Patti";
  if (uniqueCount === 1) return "Triple Patti";
  return "";
}

function getPattiLabel(result: any) {
  const labels = [
    inferPattiType(result?.openPatti),
    inferPattiType(result?.closePatti),
  ].filter(Boolean);

  return [...new Set(labels)].join(" / ") || "-";
}

function getJoriLabel(result: any) {
  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (hasOpenResult(result) && hasCloseResult(result)) {
    return `${openDigit}${closeDigit}`;
  }

  if (hasCloseResult(result)) {
    return `${openDigit || "X"}${closeDigit || "X"}`;
  }

  if (hasOpenResult(result)) {
    return `${openDigit || "X"}X`;
  }

  return "-";
}

function getTotalLabel(result: any) {
  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (hasOpenResult(result) && hasCloseResult(result)) {
    return `${openDigit}-${closeDigit}`;
  }

  if (hasCloseResult(result)) {
    return `${openDigit || "X"}-${closeDigit || "X"}`;
  }

  if (hasOpenResult(result)) {
    return `${openDigit || "X"}-X`;
  }

  return "-";
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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-500/15">
          <Pencil className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">Result Update</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-center dark:border-slate-700/80 dark:bg-transparent">
              {[
                "SI",
                "Games Name",
                "Date",
                "Open Patti",
                "Close Patti",
                "Patti",
                "Jori",
                "Total",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="border-r border-slate-200 px-4 py-3 text-center text-xs font-medium text-slate-500 last:border-r-0 dark:border-slate-700/50 dark:text-slate-400"
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
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No results found
                </td>
              </tr>
            ) : (
              results.map((r: any, idx: number) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                >
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0 dark:border-slate-700/40">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-medium text-slate-900 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {getGameName(r)}
                    {getSessionType(r) && (
                      <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-wide ${getSessionType(r) === "OPEN" ? "text-emerald-400" : "text-rose-400"}`}>
                        ({getSessionType(r)})
                      </span>
                    )}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs text-slate-600 last:border-r-0 dark:border-slate-700/40 dark:text-slate-300">
                    {formatDateLabel(r.resultDate)}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono font-bold text-slate-900 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {r.openPatti ?? "-"}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono font-bold text-slate-900 last:border-r-0 dark:border-slate-700/40 dark:text-white">
                    {r.closePatti ?? "-"}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-700 last:border-r-0 dark:border-slate-700/40 dark:text-slate-200">
                    {getPattiLabel(r)}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono font-semibold text-cyan-700 last:border-r-0 dark:border-slate-700/40 dark:text-cyan-300">
                    {getJoriLabel(r)}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center font-mono font-semibold text-amber-700 last:border-r-0 dark:border-slate-700/40 dark:text-amber-300">
                    {getTotalLabel(r)}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-3 text-center last:border-r-0 dark:border-slate-700/40">
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
                      className="flex items-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1 text-[10px] font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-30 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-700 dark:bg-slate-900">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">Update Result</h2>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
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
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              {/* Result Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Result Date
                </label>
                <input
                  type="date"
                  {...register("resultDate")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-yellow-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-yellow-500"
                />
                {errors.resultDate && (
                  <p className="text-[10px] text-red-400">
                    {errors.resultDate.message}
                  </p>
                )}
              </div>

              {/* ── Grouped Open / Close inputs ───────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3 dark:border-slate-700/60 dark:bg-slate-800/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Game Sessions
                </p>

                {/* Open Patti */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                          : "border-slate-200 bg-white text-slate-900 focus:border-yellow-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-yellow-500"
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
                <div className="h-px bg-slate-200 dark:bg-slate-700/50" />

                {/* Close Patti */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                          : "border-slate-200 bg-white text-slate-900 focus:border-yellow-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-yellow-500"
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
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-6 space-y-5 shadow-[0_20px_60px_rgba(15,23,42,0.16)] dark:border-amber-500/30 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Confirm Update</h3>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Warning body */}
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-slate-300">
              Updating this result will automatically{" "}
              <span className="font-semibold text-amber-300">
                deduct previous winnings
              </span>{" "}
              from users for{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Patti</span>,{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Jori</span>, and{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Total</span>. Do you
              want to proceed?
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingUpdate(null)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
