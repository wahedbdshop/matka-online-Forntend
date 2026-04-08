/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, Info } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

const CHARGE_TYPES = ["NONE", "FIXED", "PERCENTAGE"];

interface FormState {
  freeUpTo: string;
  chargeType: string;
  chargeValue: string;
  isActive: boolean;
}

function ChargeForm({ initial }: { initial: FormState }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (_: void) =>
      AdminService.upsertTransferChargeSetting({
        freeUpTo: Number(form.freeUpTo),
        chargeType: form.chargeType as any,
        chargeValue: Number(form.chargeValue),
        isActive: form.isActive,
      }),
    onSuccess: () => {
      toast.success("Charge settings saved");
      queryClient.invalidateQueries({ queryKey: ["transfer-charge-setting"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const set = (key: keyof FormState, value: any) =>
    setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-5">
      {/* Active toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Charge System</p>
          <p className="text-xs text-slate-500">
            Enable or disable transfer fees
          </p>
        </div>
        <button
          onClick={() => set("isActive", !form.isActive)}
          className={cn(
            "relative w-12 h-6 rounded-full transition-colors",
            form.isActive ? "bg-blue-600" : "bg-slate-600",
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
              form.isActive ? "translate-x-7" : "translate-x-1",
            )}
          />
        </button>
      </div>

      {/* Free up to */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">
          Free Transfer Up To (৳)
        </label>
        <input
          type="number"
          value={form.freeUpTo}
          onChange={(e) => set("freeUpTo", e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="flex items-start gap-1.5 mt-2">
          <Info className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500">
            Transfers up to this amount are free. Charge applies above this
            threshold.
          </p>
        </div>
      </div>

      {/* Charge type */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">
          Charge Type
        </label>
        <div className="flex gap-2">
          {CHARGE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set("chargeType", t)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                form.chargeType === t
                  ? "border-blue-500 bg-blue-500/20 text-blue-400"
                  : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Charge value */}
      {form.chargeType !== "NONE" && (
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Charge Value{" "}
            {form.chargeType === "PERCENTAGE" ? "(%)" : "(Fixed ৳)"}
          </label>
          <input
            type="number"
            value={form.chargeValue}
            onChange={(e) => set("chargeValue", e.target.value)}
            placeholder={
              form.chargeType === "PERCENTAGE" ? "e.g. 1.5" : "e.g. 20"
            }
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      )}

      {/* Preview */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-3 space-y-1.5 text-xs">
        <p className="text-slate-400 font-medium mb-2">Preview</p>
        <div className="flex justify-between">
          <span className="text-slate-500">
            Transfer ৳{Number(form.freeUpTo).toLocaleString()} or less
          </span>
          <span className="text-emerald-400">Free</span>
        </div>
        {form.chargeType !== "NONE" && (
          <div className="flex justify-between">
            <span className="text-slate-500">
              Transfer above ৳{Number(form.freeUpTo).toLocaleString()}
            </span>
            <span className="text-red-400">
              {form.chargeType === "PERCENTAGE"
                ? `${form.chargeValue}% fee`
                : `৳${form.chargeValue} fixed fee`}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={() => save()}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> Save Settings
          </>
        )}
      </button>
    </div>
  );
}

export default function TransferChargeSettingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["transfer-charge-setting"],
    queryFn: () => AdminService.getTransferChargeSetting(),
  });

  const s = data?.data;
  const initial: FormState = {
    freeUpTo: String(s?.freeUpTo ?? "50"),
    chargeType: s?.chargeType ?? "PERCENTAGE",
    chargeValue: String(s?.chargeValue ?? "2"),
    isActive: s?.isActive ?? true,
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">
          Transfer Charge Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure fees for balance transfers
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-2xl bg-slate-700/40 animate-pulse" />
      ) : (
        // ✅ key দিলে data load হলে ChargeForm remount হবে — useEffect লাগবে না
        <ChargeForm key={s?.id ?? "default"} initial={initial} />
      )}
    </div>
  );
}
