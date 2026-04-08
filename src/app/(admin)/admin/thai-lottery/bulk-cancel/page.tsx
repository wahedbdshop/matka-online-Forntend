/* eslint-disable @typescript-eslint/no-explicit-any */
// thai-lottery/bulk-cancel/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle, AlertTriangle, Ban } from "lucide-react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";

const PLAY_TYPE_LABEL: Record<string, string> = {
  THREE_UP_DIRECT: "3Up Direct",
  THREE_UP_RUMBLE: "3Up Rumble",
  THREE_UP_SINGLE: "3Up Single",
  THREE_UP_TOTAL: "3Up Total",
  TWO_UP_DIRECT: "2Up Direct",
  DOWN_DIRECT: "Down Direct",
  DOWN_SINGLE: "Down Single",
  DOWN_TOTAL: "Down Total",
};

const ALL_PLAY_TYPES = Object.keys(PLAY_TYPE_LABEL);

type ConfirmType = "round" | "category" | null;

export default function ThaiBulkCancelPage() {
  const queryClient = useQueryClient();

  const [selectedRound, setSelectedRound] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [result, setResult] = useState<{
    refundedCount: number;
    message: string;
  } | null>(null);

  const { data: roundsData } = useQuery({
    queryKey: ["admin-thai-rounds-cancel"],
    queryFn: () => AdminService.getThaiRounds(undefined, 1, 100),
  });

  const rounds = (roundsData?.data?.rounds ?? []).filter(
    (r: any) => r.status !== "CANCELLED" && r.status !== "RESULTED",
  );

  // Round cancel
  const { mutate: cancelRound, isPending: cancellingRound } = useMutation({
    mutationFn: () => AdminService.cancelThaiRound(selectedRound),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success(res.data?.message);
      setConfirmType(null);
      queryClient.invalidateQueries({ queryKey: ["admin-thai-rounds-cancel"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  // Category cancel
  const { mutate: cancelCategory, isPending: cancellingCategory } = useMutation(
    {
      mutationFn: () =>
        AdminService.cancelThaiByCategory(selectedRound, selectedTypes),
      onSuccess: (res) => {
        setResult(res.data);
        toast.success(res.data?.message);
        setConfirmType(null);
        setSelectedTypes([]);
      },
      onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
    },
  );

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const selectedRoundData = rounds.find((r: any) => r.id === selectedRound);

  return (
    <div className="space-y-5 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15">
          <Ban className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Cancel Bets</h1>
          <p className="text-xs text-slate-400">
            Cancel bets by round or by category
          </p>
        </div>
      </div>

      {/* Round Select */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Select Round
          </label>
          <select
            value={selectedRound}
            onChange={(e) => {
              setSelectedRound(e.target.value);
              setResult(null);
            }}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
          >
            <option value="">-- Choose a round --</option>
            {rounds.map((r: any) => (
              <option key={r.id} value={r.id}>
                #{r.issueNumber} — {r.status}
              </option>
            ))}
          </select>
        </div>

        {selectedRoundData && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Issue</span>
              <span className="text-white font-medium">
                #{selectedRoundData.issueNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span
                className={`font-medium ${
                  selectedRoundData.status === "OPEN"
                    ? "text-green-400"
                    : "text-yellow-400"
                }`}
              >
                {selectedRoundData.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedRound && (
        <>
          {/* ── Section 1: Full Round Cancel ── */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">
                Full Round Cancel
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              All pending bets in this round will be canceled and refunded.
              The round status will become{" "}
              <span className="text-red-400 font-semibold">CANCELLED</span>.
            </p>
            <button
              onClick={() => setConfirmType("round")}
              className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Cancel Entire Round
            </button>
          </div>

          {/* ── Section 2: Category Cancel ── */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white">
                Category Cancel
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Cancel bets from selected categories only. All other categories
              will continue as normal.
            </p>

            {/* Play Type Checkboxes */}
            <div className="grid grid-cols-2 gap-2">
              {ALL_PLAY_TYPES.map((type) => (
                <label
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${
                    selectedTypes.includes(type)
                      ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
                      : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <div
                    className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedTypes.includes(type)
                        ? "border-orange-500 bg-orange-500"
                        : "border-slate-600"
                    }`}
                  >
                    {selectedTypes.includes(type) && (
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {PLAY_TYPE_LABEL[type]}
                  </span>
                </label>
              ))}
            </div>

            {/* Select All / Clear */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTypes(ALL_PLAY_TYPES)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Select all
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setSelectedTypes([])}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                clear
              </button>
              {selectedTypes.length > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-xs text-orange-400 font-medium">
                    {selectedTypes.length} selected
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setConfirmType("category")}
              disabled={selectedTypes.length === 0}
              className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              Cancel Selected Categories
            </button>
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center space-y-1">
          <p className="text-2xl font-bold text-green-400">
            {result.refundedCount}
          </p>
          <p className="text-xs text-slate-400">bets cancelled & refunded</p>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmType(null);
          }}
        >
          <div
            className={`w-full max-w-sm rounded-[20px] border bg-slate-900 p-5 space-y-4 ${
              confirmType === "round"
                ? "border-red-500/30"
                : "border-orange-500/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  confirmType === "round" ? "bg-red-500/15" : "bg-orange-500/15"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    confirmType === "round" ? "text-red-400" : "text-orange-400"
                  }`}
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {confirmType === "round"
                    ? "Round Cancel Confirm"
                    : "Category Cancel Confirm"}
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Round</span>
                <span className="text-white font-medium">
                  #{selectedRoundData?.issueNumber}
                </span>
              </div>
              {confirmType === "category" && (
                <div>
                  <p className="text-slate-500 mb-1.5">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400"
                      >
                        {PLAY_TYPE_LABEL[t]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              {confirmType === "round"
                ? "All pending bets will be canceled and refunded. The round will be marked as CANCELLED."
                : "All pending bets in the selected categories will be canceled and refunded."}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmType(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                No, Go Back
              </button>
              <button
                onClick={() =>
                  confirmType === "round" ? cancelRound() : cancelCategory()
                }
                disabled={cancellingRound || cancellingCategory}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmType === "round"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {cancellingRound || cancellingCategory
                  ? "Processing..."
                  : "Yes, Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
