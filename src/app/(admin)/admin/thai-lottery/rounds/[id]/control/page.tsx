/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, PauseCircle, PlayCircle, Clock } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import {
  bangladeshDateTimeInputToIso,
  formatBangladeshDateTime,
  toBangladeshDateTimeInputValue,
} from "@/lib/bangladesh-time";

export default function ThaiRoundControlPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [extendTime, setExtendTime] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-round", id],
    queryFn: () => AdminService.getThaiRoundById(id),
  });

  const round = data?.data;

  useEffect(() => {
    if (round?.closeTime) {
      setExtendTime(
        toBangladeshDateTimeInputValue(
          round.closeTime,
          round.scheduleTimeZone,
        ),
      );
    }
  }, [round?.closeTime, round?.scheduleTimeZone]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-thai-round", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-thai-rounds"] });
  };

  const { mutate: holdRound, isPending: holding } = useMutation({
    mutationFn: () => AdminService.holdThaiRound(id),
    onSuccess: () => {
      toast.success("Round held — betting paused");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: resumeRound, isPending: resuming } = useMutation({
    mutationFn: () => AdminService.resumeThaiRound(id),
    onSuccess: () => {
      toast.success("Round resumed — betting open");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: extendClose, isPending: extending } = useMutation({
    mutationFn: () =>
      AdminService.extendThaiCloseTime(
        id,
        bangladeshDateTimeInputToIso(extendTime, round?.scheduleTimeZone),
      ),
    onSuccess: () => {
      toast.success("Close time updated");
      invalidate();
      setExtendTime("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  if (isLoading)
    return (
      <div className="space-y-4 max-w-lg animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="h-48 rounded-xl bg-slate-800" />
      </div>
    );

  if (!round) return <p className="text-slate-400">Round not found</p>;

  const isOpen = round.status === "OPEN";
  const isClosed = round.status === "CLOSED";
  const isResulted = round.status === "RESULTED";

  if (isResulted) {
    return (
      <div className="space-y-5 max-w-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin/thai-lottery/rounds/${id}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Round Control</h1>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 text-center">
          <p className="text-slate-400">
            Round already <strong className="text-blue-400">RESULTED</strong> —
            no controls available.
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-white">Round Control</h1>
          <p className="text-xs text-slate-400">
            Round #{round.issueNumber} · Status:{" "}
            <span className="text-white">{round.status}</span>
          </p>
        </div>
      </div>

      {/* Hold / Resume */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Betting Control</h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Hold — only when OPEN */}
          <button
            onClick={() => holdRound()}
            disabled={!isOpen || holding}
            className="flex flex-col items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 py-4 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <PauseCircle className="h-6 w-6" />
            <span className="text-xs font-semibold">
              {holding ? "Holding..." : "Hold Round"}
            </span>
            <span className="text-[10px] text-slate-500 text-center leading-tight">
              Pause betting (OPEN→CLOSED)
            </span>
          </button>

          {/* Resume — only when CLOSED */}
          <button
            onClick={() => resumeRound()}
            disabled={!isClosed || resuming}
            className="flex flex-col items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 py-4 text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <PlayCircle className="h-6 w-6" />
            <span className="text-xs font-semibold">
              {resuming ? "Resuming..." : "Resume Round"}
            </span>
            <span className="text-[10px] text-slate-500 text-center leading-tight">
              Reopen betting (CLOSED→OPEN)
            </span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          Current: <strong className="text-white">{round.status}</strong>
          {isOpen
            ? " - Holding will stop betting"
            : " - Resuming will reopen betting"}
        </p>
      </div>

      {/* Extend Close Time */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">
            Extend / Change Close Time
          </h2>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
          <p className="text-[10px] text-slate-500 uppercase">
            Current Close Time
          </p>
          <p className="text-sm font-medium text-yellow-400 mt-0.5">
            {round.closeTime
              ? formatBangladeshDateTime(round.closeTime, {
                  timeZone: round.scheduleTimeZone,
                })
              : "Not set"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">
            New Close Time (Bangladesh Time)
          </label>
          <input
            type="datetime-local"
            value={extendTime}
            onChange={(e) => setExtendTime(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
          <p className="text-[11px] text-slate-500">
            Round schedule updates always use Bangladesh Time (Asia/Dhaka).
          </p>
        </div>

        {isClosed && (
          <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Warning: setting a new close time on a CLOSED round will reopen it automatically.
          </p>
        )}

        <button
          onClick={() => extendClose()}
          disabled={!extendTime || extending}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {extending ? "Updating..." : "Update Close Time"}
        </button>
      </div>
    </div>
  );
}
