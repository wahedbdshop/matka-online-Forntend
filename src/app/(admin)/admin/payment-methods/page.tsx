/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Loader2,
  CreditCard,
  Smartphone,
  Building,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

const METHOD_TYPES = [
  {
    value: "MOBILE",
    label: "Mobile Banking",
    icon: Smartphone,
    color: "text-pink-400",
  },
  {
    value: "BANK",
    label: "Local Bank",
    icon: Building,
    color: "text-blue-400",
  },
];

const CHARGE_TYPES = ["NONE", "FIXED", "PERCENTAGE"];

const DEFAULT_FORM = {
  name: "",
  type: "MOBILE",
  logo: "",
  minWithdraw: "",
  maxWithdraw: "",
  chargeType: "NONE",
  chargeValue: "0",
  instructions: "",
  isActiveForWithdraw: true,
  sortOrder: "0",
};

function getMethodTheme(name?: string, type?: string) {
  const key = String(name ?? "").toLowerCase();

  if (key.includes("rocket")) {
    return {
      card: "border-purple-500/30 bg-purple-500/5",
      iconWrap: "bg-purple-500/10 border-purple-500/30",
      icon: "text-purple-400",
      badge:
        "bg-purple-500/10 border-purple-500/30 text-purple-300",
    };
  }

  if (key.includes("surecash") || key.includes("sure cash")) {
    return {
      card: "border-emerald-500/30 bg-emerald-500/5",
      iconWrap: "bg-emerald-500/10 border-emerald-500/30",
      icon: "text-emerald-400",
      badge:
        "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    };
  }

  if (type === "BANK") {
    return {
      card: "border-blue-500/20 bg-slate-800/50",
      iconWrap: "bg-blue-500/10 border-blue-500/30",
      icon: "text-blue-400",
      badge: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    };
  }

  return {
    card: "border-pink-500/20 bg-slate-800/50",
    iconWrap: "bg-pink-500/10 border-pink-500/30",
    icon: "text-pink-400",
    badge: "bg-pink-500/10 border-pink-500/30 text-pink-300",
  };
}

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => AdminService.getPaymentMethods(),
  });
  const methods: any[] = data?.data ?? [];

  const { mutate: createMethod, isPending: isCreating } = useMutation({
    mutationFn: (payload: any) => AdminService.createPaymentMethod(payload),
    onSuccess: () => {
      toast.success("Method created");
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: updateMethod, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      AdminService.updatePaymentMethod(id, payload),
    onSuccess: () => {
      toast.success("Method updated");
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      setEditItem(null);
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: deleteMethod, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => AdminService.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success("Method deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const handleEdit = (m: any) => {
    setEditItem(m);
    setForm({
      name: m.name,
      type: m.type,
      logo: m.logo ?? "",
      minWithdraw: String(m.minWithdraw),
      maxWithdraw: String(m.maxWithdraw),
      chargeType: m.chargeType ?? "NONE",
      chargeValue: String(m.chargeValue ?? 0),
      instructions: m.instructions ?? "",
      isActiveForWithdraw: m.isActiveForWithdraw,
      sortOrder: String(m.sortOrder ?? 0),
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Method name is required");
      return;
    }
    const payload = {
      ...form,
      minWithdraw: Number(form.minWithdraw) || 500,
      maxWithdraw: Number(form.maxWithdraw) || 25000,
      chargeValue: Number(form.chargeValue) || 0,
      sortOrder: Number(form.sortOrder) || 0,
    };
    if (editItem) {
      updateMethod({ id: editItem.id, payload });
    } else {
      createMethod(payload);
    }
  };

  const isMobileForm = form.type === "MOBILE";
  const isPending = isCreating || isUpdating;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Payment Methods</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage withdrawal methods
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm(DEFAULT_FORM);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Method
        </button>
      </div>

      {/* Methods Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-slate-700/40 animate-pulse"
            />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/50 border border-slate-700 flex items-center justify-center">
            <CreditCard className="h-7 w-7 text-slate-500" />
          </div>
          <p className="text-slate-500 text-sm">No payment methods yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((m: any) => {
            const TypeIcon = m.type === "BANK" ? Building : Smartphone;
            const theme = getMethodTheme(m.name, m.type);
            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-2xl border p-4 space-y-3 transition-colors",
                  theme.card,
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        theme.iconWrap,
                      )}
                    >
                      <TypeIcon className={cn("h-5 w-5", theme.icon)} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm capitalize">
                        {m.name}
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        {m.type === "BANK" ? "Local Bank" : "Mobile Banking"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      m.isActiveForWithdraw
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : theme.badge,
                    )}
                  >
                    {m.isActiveForWithdraw ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Min / Max</span>
                    <span className="text-slate-300">
                      ৳{Number(m.minWithdraw).toLocaleString()} - ৳
                      {Number(m.maxWithdraw).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Charge</span>
                    <span className="text-slate-300">
                      {m.chargeType === "NONE"
                        ? "No charge"
                        : m.chargeType === "FIXED"
                          ? `৳${m.chargeValue} fixed`
                          : `${m.chargeValue}%`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleEdit(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 py-1.5 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(m.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditItem(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                {editItem ? "Edit Method" : "Add Payment Method"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] text-slate-400 mb-2 block uppercase tracking-wider">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {METHOD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      setForm((p: any) => ({ ...p, type: t.value }))
                    }
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border transition-all",
                      form.type === t.value
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600",
                    )}
                  >
                    <t.icon className={cn("h-4 w-4", t.color)} />
                    <span className="text-xs font-medium text-slate-300">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">
                Method Name *{" "}
                {isMobileForm
                  ? "(e.g. bkash, nagad, rocket)"
                  : "(e.g. Dutch Bangla Bank)"}
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, name: e.target.value }))
                }
                placeholder={isMobileForm ? "bkash" : "Dutch Bangla Bank"}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            {/* Logo URL */}
            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">
                Logo URL (Optional)
              </label>
              <input
                value={form.logo}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, logo: e.target.value }))
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            {/* Min / Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">
                  Min Withdraw (৳)
                </label>
                <input
                  type="number"
                  value={form.minWithdraw}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, minWithdraw: e.target.value }))
                  }
                  placeholder={isMobileForm ? "500" : "5000"}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">
                  Max Withdraw (৳)
                </label>
                <input
                  type="number"
                  value={form.maxWithdraw}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, maxWithdraw: e.target.value }))
                  }
                  placeholder={isMobileForm ? "25000" : "100000"}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Charge */}
            <div>
              <label className="text-[11px] text-slate-400 mb-2 block uppercase tracking-wider">
                Charge Type
              </label>
              <div className="flex gap-2 mb-2">
                {CHARGE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setForm((p: any) => ({ ...p, chargeType: t }))
                    }
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      form.chargeType === t
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-slate-600 bg-slate-800 text-slate-400",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {form.chargeType !== "NONE" && (
                <input
                  type="number"
                  value={form.chargeValue}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, chargeValue: e.target.value }))
                  }
                  placeholder={
                    form.chargeType === "PERCENTAGE"
                      ? "e.g. 1.5 (for 1.5%)"
                      : "e.g. 20 (fixed ৳20)"
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
            </div>

            {/* Instructions */}
            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">
                Instructions (Optional)
              </label>
              <textarea
                value={form.instructions}
                onChange={(e) =>
                  setForm((p: any) => ({ ...p, instructions: e.target.value }))
                }
                placeholder="Any notes for users..."
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Sort + Active */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 mb-1.5 block">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, sortOrder: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() =>
                    setForm((p: any) => ({
                      ...p,
                      isActiveForWithdraw: !p.isActiveForWithdraw,
                    }))
                  }
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    form.isActiveForWithdraw ? "bg-green-600" : "bg-slate-600",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                      form.isActiveForWithdraw
                        ? "translate-x-5"
                        : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-xs text-slate-400">Active</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />{" "}
                    {editItem ? "Update" : "Create"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div className="w-full max-w-xs rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                Delete this method?
              </p>
              <p className="text-slate-500 text-xs mt-1">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMethod(deleteId)}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



