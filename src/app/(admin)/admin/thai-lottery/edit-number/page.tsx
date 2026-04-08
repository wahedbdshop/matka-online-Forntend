/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Pencil, X, Check } from "lucide-react";
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

const DIGIT_LENGTH: Record<string, number> = {
  THREE_UP_DIRECT: 3,
  THREE_UP_RUMBLE: 3,
  THREE_UP_SINGLE: 1,
  THREE_UP_TOTAL: 1,
  TWO_UP_DIRECT: 2,
  DOWN_DIRECT: 2,
  DOWN_SINGLE: 1,
  DOWN_TOTAL: 1,
};

const LIMIT = 20;

// Always use USD with the $ symbol
const fmtUsd = (usd: number) =>
  `$${Number(usd).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ThaiEditNumberPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [playTypeFilter, setPlayTypeFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [editBet, setEditBet] = useState<any>(null);
  const [newBetNumber, setNewBetNumber] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const { data: roundsData } = useQuery({
    queryKey: ["admin-thai-rounds-all"],
    queryFn: () => AdminService.getThaiRounds(undefined, 1, 100),
  });

  const rounds = roundsData?.data?.rounds ?? [];
  const activeRoundId = roundFilter || rounds[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-thai-edit-number",
      activeRoundId,
      page,
      search,
      playTypeFilter,
    ],
    queryFn: () =>
      AdminService.getThaiRoundBets(activeRoundId, {
        page,
        limit: LIMIT,
        status: "PENDING",
        search: search || undefined,
        playType: playTypeFilter || undefined,
      }),
    enabled: !!activeRoundId,
  });

  const bets = data?.data?.bets ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const { mutate: editNumber, isPending: editing } = useMutation({
    mutationFn: () =>
      AdminService.editThaiBetNumber(
        editBet.id,
        newBetNumber,
        newAmount ? Number(newAmount) : undefined, // send the USD value as-is
      ),
    onSuccess: () => {
      toast.success("Bet updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-thai-edit-number"] });
      setEditBet(null);
      setNewBetNumber("");
      setNewAmount("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const openEdit = (bet: any) => {
    setEditBet(bet);
    setNewBetNumber(bet.betNumber);
    setNewAmount(Number(bet.actualAmount ?? bet.amount).toFixed(2)); // USD as-is
  };

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const expectedLen = editBet ? (DIGIT_LENGTH[editBet.playType] ?? 3) : 3;
  const originalUsd = editBet
    ? Number(editBet.actualAmount ?? editBet.amount)
    : 0;
  const numberChanged =
    editBet &&
    newBetNumber.length === expectedLen &&
    newBetNumber !== editBet.betNumber;
  const amountChanged =
    editBet && newAmount && Number(newAmount) !== originalUsd;
  const canSave =
    editBet &&
    newBetNumber.length === expectedLen &&
    (numberChanged || amountChanged);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
            <Pencil className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Edit Number</h1>
            <p className="text-xs text-slate-400">
              Update the number and amount for pending bets
            </p>
          </div>
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          {total} Pending
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={roundFilter}
          onChange={(e) => {
            setRoundFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">Latest Round</option>
          {rounds.map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.issueNumber}
            </option>
          ))}
        </select>

        <select
          value={playTypeFilter}
          onChange={(e) => {
            setPlayTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(PLAY_TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Username / number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="w-44 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 hover:bg-slate-600"
          >
            <Search className="h-3.5 w-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {[
                "#",
                "Username",
                "Bet Code",
                "Category",
                "Bet Number",
                "Amount",
                "Date Time",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium text-slate-400"
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
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bets.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No pending bets found
                </td>
              </tr>
            ) : (
              bets.map((bet: any, idx: number) => (
                <tr
                  key={bet.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {bet.user?.name ?? "-"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{bet.user?.username ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {bet.confirmCode ? (
                      <span className="rounded-md border border-[#2a3f7a] bg-[#0d183a] px-2 py-0.5 font-mono text-[10px] font-bold text-[#71a6ff]">
                        #{bet.confirmCode}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {PLAY_TYPE_LABEL[bet.playType] ?? bet.playType}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold tracking-widest text-white">
                    {bet.betNumber}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {fmtUsd(Number(bet.actualAmount ?? bet.amount ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(bet.placedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(bet)}
                      className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/20"
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

      {/* Pagination */}
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

      {/* Edit Modal */}
      {editBet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditBet(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Edit Bet</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {PLAY_TYPE_LABEL[editBet.playType]} — {expectedLen} digit
                </p>
              </div>
              <button onClick={() => setEditBet(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* User info */}
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
              <p className="text-[10px] text-slate-500 uppercase mb-1">User</p>
              <p className="text-sm text-white font-medium">
                {editBet.user?.name}
              </p>
              <p className="text-[10px] text-slate-500">
                @{editBet.user?.username}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-500">Number: </span>
                  <span className="font-mono font-bold text-white">
                    {editBet.betNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Amount: </span>
                  <span className="font-bold text-white">
                    {fmtUsd(originalUsd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Number input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                New Number{" "}
                <span className="text-slate-600">({expectedLen} digit)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={expectedLen}
                value={newBetNumber}
                onChange={(e) =>
                  setNewBetNumber(
                    e.target.value.replace(/\D/g, "").slice(0, expectedLen),
                  )
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-center text-2xl font-bold tracking-[0.25em] text-white outline-none focus:border-blue-500"
                placeholder={"0".repeat(expectedLen)}
              />
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                New Amount (USD){" "}
                <span className="text-slate-600">
                  current: {fmtUsd(originalUsd)}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 pl-7 pr-3 py-2.5 text-center text-xl font-bold text-white outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Change preview */}
            {(numberChanged || amountChanged) && (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5 space-y-1.5">
                {numberChanged && (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-slate-500">Number</span>
                    <span className="font-mono font-bold text-slate-400 line-through">
                      {editBet.betNumber}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono font-bold text-green-400">
                      {newBetNumber}
                    </span>
                  </div>
                )}
                {amountChanged && (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-slate-500">Amount</span>
                    <span className="font-bold text-slate-400 line-through">
                      {fmtUsd(originalUsd)}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-bold text-green-400">
                      {fmtUsd(Number(newAmount))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditBet(null);
                  setNewBetNumber("");
                  setNewAmount("");
                }}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => editNumber()}
                disabled={!canSave || editing}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editing ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
