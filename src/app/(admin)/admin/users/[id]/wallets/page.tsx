/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Wallet,
  Pencil,
  Trash2,
  X,
  Check,
  Phone,
  Plus,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function UserWalletsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  // edit state
  const [editAcc, setEditAcc] = useState<any>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editNickname, setEditNickname] = useState("");

  // add state
  const [addOpen, setAddOpen] = useState(false);
  const [newMethod, setNewMethod] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newNickname, setNewNickname] = useState("");

  const { data: userData } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => AdminService.getUserById(userId),
  });

  const { data: accData, isLoading } = useQuery({
    queryKey: ["admin-user-withdrawal-accounts", userId],
    queryFn: () => AdminService.getUserWithdrawalAccounts(userId),
  });

  const user = userData?.data;
  const rawAccounts: any[] = accData?.data ?? [];

  // Dedupe by accountNumber — group all methods under one entry
  const accounts = rawAccounts.reduce(
    (acc: any[], cur: any) => {
      const existing = acc.find((a) => a.accountNumber === cur.accountNumber);
      if (existing) {
        const method = cur.paymentMethod ?? cur.methodName;
        if (method && !existing.methods.includes(method)) {
          existing.methods.push(method);
        }
      } else {
        acc.push({
          ...cur,
          methods: [cur.paymentMethod ?? cur.methodName].filter(Boolean),
        });
      }
      return acc;
    },
    [],
  );

  // ── Mutations ──
  const { mutate: deleteAcc, isPending: deleting } = useMutation({
    mutationFn: (accId: string) =>
      AdminService.deleteUserWithdrawalAccount(accId),
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({
        queryKey: ["admin-user-withdrawal-accounts", userId],
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: updateAcc, isPending: updating } = useMutation({
    mutationFn: () =>
      AdminService.updateUserWithdrawalAccount(editAcc.id, {
        accountNumber: editNumber,
        nickname: editNickname || undefined,
      }),
    onSuccess: () => {
      toast.success("Account updated");
      queryClient.invalidateQueries({
        queryKey: ["admin-user-withdrawal-accounts", userId],
      });
      setEditAcc(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: addAcc, isPending: adding } = useMutation({
    mutationFn: () =>
      AdminService.addUserWithdrawalAccount(userId, {
        paymentMethod: newMethod,
        accountNumber: newNumber,
        nickname: newNickname || undefined,
      }),
    onSuccess: () => {
      toast.success("Account added");
      queryClient.invalidateQueries({
        queryKey: ["admin-user-withdrawal-accounts", userId],
      });
      setAddOpen(false);
      setNewMethod("");
      setNewNumber("");
      setNewNickname("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const METHOD_COLOR: Record<string, string> = {
    bkash: "border-pink-500/40 bg-pink-500/10 text-pink-400",
    nagad: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    rocket: "border-purple-500/40 bg-purple-500/10 text-purple-400",
    bank: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/users/${userId}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
            <Wallet className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wallets</h1>
            {user && (
              <p className="text-xs text-slate-400">
                {user.name} — @{user.username}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Phone Number */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
          <Phone className="h-4 w-4 text-green-400" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
            Registered Phone
          </p>
          <p className="font-mono text-sm font-semibold text-white mt-0.5">
            {user?.phone ?? "-"}
          </p>
        </div>
      </div>

      {/* Withdrawal Accounts */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Withdrawal Accounts
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {accounts.length} saved
            </p>
          </div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {/* Add Form */}
        {addOpen && (
          <div className="rounded-xl border border-slate-600 bg-slate-800 p-4 space-y-3">
            <p className="text-xs font-semibold text-white">New Account</p>
            <input
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              placeholder="Method  e.g. bkash / nagad / rocket"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="Account Number"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="Nickname (optional)"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAddOpen(false);
                  setNewMethod("");
                  setNewNumber("");
                  setNewNickname("");
                }}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => addAcc()}
                disabled={adding || !newMethod || !newNumber}
                className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Account"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-700"
              />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 py-8 text-center text-sm text-slate-500">
            No saved withdrawal accounts
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc: any, idx: number) => (
              <div
                key={acc.id}
                className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3"
              >
                {editAcc?.id === acc.id ? (
                  /* ── Edit Mode ── */
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-white">
                      Edit Account
                    </p>
                    <input
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full rounded-lg border border-blue-500/50 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                    <input
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="Nickname (optional)"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditAcc(null)}
                        className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
                      >
                        <X className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => updateAcc()}
                        disabled={updating || !editNumber}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" />
                        {updating ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View Mode ── */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-bold text-purple-400">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-base font-semibold text-white">
                          {acc.accountNumber}
                        </p>
                        {(acc.nickname ?? acc.accountHolderName) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {acc.nickname ?? acc.accountHolderName}
                          </p>
                        )}
                        {/* Method badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {acc.methods.map((m: string) => (
                            <span
                              key={m}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                METHOD_COLOR[m.toLowerCase()] ??
                                "border-slate-600 bg-slate-700 text-slate-300"
                              }`}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditAcc(acc);
                          setEditNumber(acc.accountNumber);
                          setEditNickname(acc.nickname ?? "");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAcc(acc.id)}
                        disabled={deleting}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
