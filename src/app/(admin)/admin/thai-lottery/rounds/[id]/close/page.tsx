/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Clock } from "lucide-react";
import {
  formatAbsoluteUtcDateTimeForBangladeshDisplay,
  toUtcIsoFromBangladeshDateTimeInput,
} from "@/lib/timezone";
import { AdminService } from "@/services/admin.service";

const formatDate = (d?: string) => {
  if (!d) return "-";
  return formatAbsoluteUtcDateTimeForBangladeshDisplay(d, { includeTimezone: true });
};

export default function ThaiRoundClosePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [closeTime, setCloseTime] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-round", id],
    queryFn: () => AdminService.getThaiRoundById(id),
  });

  const round = data?.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-thai-round", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-thai-rounds"] });
  };

  const { mutate: setClose, isPending } = useMutation({
    mutationFn: () =>
      AdminService.setThaiCloseTime(id, {
        closeTime: toUtcIsoFromBangladeshDateTimeInput(closeTime),
      }),
    onSuccess: () => {
      toast.success("Close time set successfully");
      invalidate();
      setCloseTime("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  if (isLoading)
    return (
      <div className="space-y-4 max-w-lg animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="h-40 rounded-xl bg-slate-800" />
      </div>
    );

  if (!round) return <p className="text-slate-400">Round not found</p>;

  const isOpen = round.status === "OPEN";

  return (
    <div className="space-y-5 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/thai-lottery/rounds/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Set Close Time</h1>
          <p className="text-xs text-slate-400">Round #{round.issueNumber}</p>
        </div>
      </div>

      {/* Current close time display */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Current Close Time
          </span>
        </div>
        <p
          className={`text-lg font-semibold ${round.closeTime ? "text-yellow-400" : "text-slate-500"}`}
        >
          {round.closeTime ? formatDate(round.closeTime) : "Not set"}
        </p>
      </div>

      {/* Set form — only if OPEN */}
      {isOpen ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-4">
          <p className="text-sm text-slate-300">
            Betting will automatically stop at this time and the round will become CLOSED.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">
              New Close Time (Bangladesh)
            </label>
            <input
              type="datetime-local"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500"
            />
            <p className="text-[10px] text-slate-500">
              Enter Bangladesh time. It will be converted to UTC before saving.
              {closeTime
                ? ` Saves as ${formatAbsoluteUtcDateTimeForBangladeshDisplay(
                    toUtcIsoFromBangladeshDateTimeInput(closeTime),
                    { includeTimezone: true },
                  )}.`
                : ""}
            </p>
          </div>
          <button
            onClick={() => setClose()}
            disabled={!closeTime || isPending}
            className="w-full rounded-lg bg-yellow-600 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {isPending ? "Setting..." : "Confirm Close Time"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <p className="text-sm text-slate-400 text-center">
            ⚠️ Round <strong className="text-white">{round.status}</strong> —
            The close time can no longer be changed.
            <br />
            <span className="text-xs text-slate-500 mt-1 block">
              Go to the <strong>Round Control</strong> page if you need to extend it.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
