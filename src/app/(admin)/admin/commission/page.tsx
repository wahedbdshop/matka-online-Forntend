/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function AdminCommissionPage() {
  const [form, setForm] = useState({
    isActive: true,
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    minDeposit: "500",
    maxDeposit: "30000",
  });
  const [previewAmount, setPreviewAmount] = useState("1000");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["deposit-commission"],
    queryFn: () => AdminService.getDepositCommission(),
  });

  // Load existing commission into form
  useEffect(() => {
    const c = data?.data;
    if (c) {
      setForm({
        isActive: c.isActive,
        type: c.type,
        value: String(c.value),
        minDeposit: String(c.minDeposit),
        maxDeposit: String(c.maxDeposit),
      });
    }
  }, [data]);

  const { mutate: saveCommission, isPending: isSaving } = useMutation({
    mutationFn: (payload: any) => AdminService.setDepositCommission(payload),
    onSuccess: (res) => {
      toast.success("Commission settings saved");
      const p = res?.data?.preview;
      if (p) setPreview(p);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const fetchPreview = async () => {
    const amount = Number(previewAmount);
    if (!amount || amount <= 0) return;
    setPreviewLoading(true);
    try {
      const res = await AdminService.previewCommission(amount);
      setPreview(res.data);
    } catch {
      toast.error("Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.value || Number(form.value) <= 0)
      return toast.error("Commission value required");
    if (Number(form.minDeposit) >= Number(form.maxDeposit))
      return toast.error("Min must be less than Max");
    if (form.type === "PERCENTAGE" && Number(form.value) > 100)
      return toast.error("Percentage cannot exceed 100");

    saveCommission({
      isActive: form.isActive,
      type: form.type,
      value: Number(form.value),
      minDeposit: Number(form.minDeposit),
      maxDeposit: Number(form.maxDeposit),
    });
  };

  const commission = data?.data;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-white">
          Deposit Commission Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure how bonus is automatically applied to user deposits
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-5">
          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Commission Active
              </p>
              <p className="text-xs text-slate-400">
                If disabled, no bonus will be applied
              </p>
            </div>
            <button
              onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.isActive ? "bg-blue-600" : "bg-slate-600"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          <div className="border-t border-slate-700" />

          {/* Commission Type */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">
              Commission Type
            </label>
            <div className="flex gap-3">
              {(["PERCENTAGE", "FIXED"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                    form.type === t
                      ? "border-blue-500 bg-blue-500/20 text-blue-400"
                      : "border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {t === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (৳)"}
                </button>
              ))}
            </div>
          </div>

          {/* Commission Value */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Commission Value {form.type === "PERCENTAGE" ? "(%)" : "(৳)"}
            </label>
            <input
              type="number"
              value={form.value}
              onChange={(e) =>
                setForm((p) => ({ ...p, value: e.target.value }))
              }
              placeholder={
                form.type === "PERCENTAGE" ? "e.g. 5 = 5%" : "e.g. 50 = ৳50"
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
            {form.type === "PERCENTAGE" && (
              <p className="text-[10px] text-slate-500 mt-1">
                Must be between 1 and 100
              </p>
            )}
          </div>

          {/* Min / Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Minimum Deposit (৳)
              </label>
              <input
                type="number"
                value={form.minDeposit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, minDeposit: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Maximum Deposit (৳)
              </label>
              <input
                type="number"
                value={form.maxDeposit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, maxDeposit: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Example preview box */}
          {form.value && Number(form.value) > 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs space-y-1">
              <p className="text-slate-400 font-medium">Formula Preview</p>
              {form.type === "PERCENTAGE" ? (
                <>
                  <p className="text-white">
                    ৳{Number(form.minDeposit).toLocaleString()} deposit এ →{" "}
                    <span className="text-emerald-400 font-semibold">
                      +৳
                      {Math.floor(
                        (Number(form.minDeposit) * Number(form.value)) / 100,
                      ).toLocaleString()}{" "}
                      bonus
                    </span>
                  </p>
                  <p className="text-white">
                    ৳{Number(form.maxDeposit).toLocaleString()} deposit এ →{" "}
                    <span className="text-emerald-400 font-semibold">
                      +৳
                      {Math.floor(
                        (Number(form.maxDeposit) * Number(form.value)) / 100,
                      ).toLocaleString()}{" "}
                      bonus
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-white">
                  Any deposit amount {"->"}{" "}
                  <span className="text-emerald-400 font-semibold">
                    +৳{Number(form.value).toLocaleString()} fixed bonus
                  </span>
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Commission Settings"}
          </button>
        </div>
      )}

      {/* Preview tester */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Commission Preview Tester
          </p>
          <p className="text-xs text-slate-400">
            Test the bonus calculation with any amount
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={previewAmount}
            onChange={(e) => setPreviewAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={fetchPreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${previewLoading ? "animate-spin" : ""}`}
            />
            Calculate
          </button>
        </div>

        {preview && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Deposit Amount</span>
              <span className="text-white">
                ৳{Number(preview.amount).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bonus</span>
              <span className="text-emerald-400">
                +৳{Number(preview.bonus).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t border-slate-700 pt-1">
              <span className="text-slate-300">Total Credit</span>
              <span className="text-blue-300">
                ৳{Number(preview.totalCredit).toLocaleString()}
              </span>
            </div>
            {!preview.inRange && (
              <p className="text-yellow-500 text-[10px] pt-1">
                ⚠ Amount is outside the configured min/max range — no bonus will
                apply
              </p>
            )}
            {!preview.commissionActive && (
              <p className="text-red-400 text-[10px]">
                ⚠ Commission is currently inactive
              </p>
            )}
          </div>
        )}
      </div>

      {/* Current saved settings */}
      {commission && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4 text-xs space-y-2">
          <p className="text-slate-400 font-medium">Currently Saved Settings</p>
          {[
            ["Status", commission.isActive ? "Active" : "Inactive"],
            ["Type", commission.type],
            [
              "Value",
              commission.type === "PERCENTAGE"
                ? `${commission.value}%`
                : `৳${commission.value}`,
            ],
            [
              "Min Deposit",
              `৳${Number(commission.minDeposit).toLocaleString()}`,
            ],
            [
              "Max Deposit",
              `৳${Number(commission.maxDeposit).toLocaleString()}`,
            ],
            ["Last Updated", new Date(commission.updatedAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-500">{label}</span>
              <span
                className={`font-medium ${label === "Status" ? (commission.isActive ? "text-green-400" : "text-red-400") : "text-white"}`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
