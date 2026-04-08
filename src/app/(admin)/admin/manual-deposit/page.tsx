/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AdminService } from "@/services/admin.service";

const LIMIT = 20;

const METHODS = ["bkash", "nagad", "rocket", "bank", "cash", "other"];

export default function AdminManualDepositPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    amount: "",
    bonus: "",
    paymentMethod: "",
    note: "",
  });
  const [bonusPreview, setBonusPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-manual-deposits", page, search],
    queryFn: () =>
      AdminService.getManualDeposits({
        page,
        limit: LIMIT,
        search: search || undefined,
      }),
  });

  const { mutate: createManualDeposit, isPending: isCreating } = useMutation({
    mutationFn: (payload: any) => AdminService.createManualDeposit(payload),
    onSuccess: () => {
      toast.success("Manual deposit created — balance credited");
      setFormOpen(false);
      setForm({
        userId: "",
        amount: "",
        bonus: "",
        paymentMethod: "",
        note: "",
      });
      setBonusPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-manual-deposits"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const deposits = data?.data?.deposits ?? [];
  const total = data?.data?.total ?? 0;
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

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // Commission preview fetch
  const fetchPreview = async (amount: string) => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setBonusPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await AdminService.previewCommission(num);
      setBonusPreview(res.data);
    } catch {
      setBonusPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.userId.trim()) return toast.error("User ID is required");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("Valid amount is required");

    createManualDeposit({
      userId: form.userId.trim(),
      amount,
      bonus: Number(form.bonus) || 0,
      paymentMethod: form.paymentMethod || undefined,
      note: form.note || undefined,
    });
  };

  const totalCredit = (Number(form.amount) || 0) + (Number(form.bonus) || 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Manual Deposits</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Manual Deposit
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Name, email, phone..."
            className="w-56 rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {[
                "#",
                "User",
                "Email",
                "Amount",
                "Bonus",
                "Total Credit",
                "Method",
                "Added By",
                "Note",
                "Date",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : deposits.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No manual deposits found
                </td>
              </tr>
            ) : (
              deposits.map((d: any, idx: number) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {d.user?.name ?? "-"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {d.user?.phone ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {d.user?.email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">
                    ৳{Number(d.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-emerald-400">
                    +৳{Number(d.bonus).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-blue-300">
                    ৳{Number(d.totalCredit).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 capitalize">
                    {d.paymentMethod ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {d.addedBy ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[120px] truncate">
                    {d.note ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailTarget(d)}
                      className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailTarget(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Manual Deposit Detail
              </h2>
              <button onClick={() => setDetailTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["User", detailTarget.user?.name],
                ["Email", detailTarget.user?.email],
                ["Phone", detailTarget.user?.phone],
                ["Amount", `৳${Number(detailTarget.amount).toLocaleString()}`],
                ["Bonus", `+৳${Number(detailTarget.bonus).toLocaleString()}`],
                [
                  "Total Credit",
                  `৳${Number(detailTarget.totalCredit).toLocaleString()}`,
                ],
                ["Method", detailTarget.paymentMethod],
                ["Note", detailTarget.note],
                ["Added By (Admin ID)", detailTarget.addedBy],
                ["Date", formatDate(detailTarget.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white text-right">{value ?? "-"}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 italic">
              Manual deposits cannot be edited or deleted.
            </p>
            <button
              onClick={() => setDetailTarget(null)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setFormOpen(false);
              setBonusPreview(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Add Manual Deposit
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setBonusPreview(null);
                }}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* User ID */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  User ID *
                </label>
                <input
                  value={form.userId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, userId: e.target.value }))
                  }
                  placeholder="User ID"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  Amount (BDT) *
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, amount: e.target.value }));
                    fetchPreview(e.target.value);
                  }}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
                {/* Commission preview */}
                {previewLoading && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Calculating...
                  </p>
                )}
                {bonusPreview && !previewLoading && (
                  <div className="mt-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-[11px] space-y-0.5">
                    <p className="text-slate-400">Commission preview:</p>
                    <p className="text-emerald-400">
                      Bonus: +৳{bonusPreview.bonus?.toLocaleString()}
                    </p>
                    <p className="text-blue-300 font-semibold">
                      Total Credit: ৳
                      {bonusPreview.totalCredit?.toLocaleString()}
                    </p>
                    {!bonusPreview.inRange && (
                      <p className="text-yellow-500">
                        Amount outside commission range
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bonus override */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  Bonus (BDT){" "}
                  <span className="text-slate-600">— override if needed</span>
                </label>
                <input
                  type="number"
                  value={form.bonus}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bonus: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Total credit preview */}
              {Number(form.amount) > 0 && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount</span>
                    <span className="text-white">
                      ৳{Number(form.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bonus</span>
                    <span className="text-emerald-400">
                      +৳{Number(form.bonus || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-slate-700">
                    <span className="text-slate-300">Total Credit</span>
                    <span className="text-blue-300">
                      ৳{totalCredit.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Method */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  Payment Method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paymentMethod: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select method</option>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  Note / Remark
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, note: e.target.value }))
                  }
                  placeholder="Optional note..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormOpen(false);
                  setBonusPreview(null);
                }}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isCreating}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? "Processing..." : "Confirm & Credit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
