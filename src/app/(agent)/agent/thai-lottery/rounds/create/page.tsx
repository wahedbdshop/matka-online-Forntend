/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { bangladeshDateTimeInputToIso } from "@/lib/bangladesh-time";

export default function AgentCreateThaiRoundPage() {
  const router = useRouter();
  const [form, setForm] = useState({ issueNumber: "", drawDate: "" });

  const { mutate, isPending } = useMutation({
    mutationFn: AdminService.createThaiRound,
    onSuccess: (res) => {
      toast.success("Round created successfully");
      router.push(`/agent/thai-lottery/rounds/${res.data?.id}`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to create round"),
  });

  const handleSubmit = () => {
    if (!form.issueNumber || !form.drawDate) {
      toast.error("All fields are required");
      return;
    }

    mutate({
      issueNumber: form.issueNumber,
      drawDate: bangladeshDateTimeInputToIso(form.drawDate),
    });
  };

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Create Round</h1>
          <p className="text-xs text-slate-400">Create a new Thai Lottery round</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/50 p-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Issue Number</label>
          <input
            type="text"
            placeholder="e.g. 2025-01 or JAN-1"
            value={form.issueNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, issueNumber: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Draw Date (Bangladesh Time)
          </label>
          <input
            type="datetime-local"
            value={form.drawDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, drawDate: e.target.value }))
            }
            placeholder="YYYY-MM-DD HH:mm (BD Time)"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
          <p className="text-[11px] text-slate-500">
            Enter the official draw schedule in Bangladesh Time (Asia/Dhaka).
          </p>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-xs text-blue-400">
            Once created, the round will immediately be marked as{" "}
            <strong>OPEN</strong>
            and users will be able to place bets right away. You can set the
            close time separately afterward. Displayed draw date and issue
            number should match the Bangladesh schedule.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Round"}
        </button>
      </div>
    </div>
  );
}
