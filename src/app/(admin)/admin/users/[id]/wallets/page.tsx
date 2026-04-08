/* eslint-disable @typescript-eslint/no-explicit-any */
// admin/users/[id]/wallets/page.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Wallet, Pencil, Trash2, X, Check } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function UserWalletsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  const [editWallet, setEditWallet] = useState<any>(null);
  const [editAccount, setEditAccount] = useState("");

  const { data: userData } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => AdminService.getUserById(userId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-wallets", userId],
    queryFn: () => AdminService.getUserWallets(userId),
  });

  const user = userData?.data;
  const wallets = data?.data ?? [];

  const { mutate: deleteWallet, isPending: deleting } = useMutation({
    mutationFn: (walletId: string) => AdminService.deleteUserWallet(walletId),
    onSuccess: () => {
      toast.success("Wallet deleted");
      queryClient.invalidateQueries({
        queryKey: ["admin-user-wallets", userId],
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: updateWallet, isPending: updating } = useMutation({
    mutationFn: () =>
      AdminService.updateUserWallet(editWallet.id, {
        accountNumber: editAccount,
      }),
    onSuccess: () => {
      toast.success("Wallet updated");
      queryClient.invalidateQueries({
        queryKey: ["admin-user-wallets", userId],
      });
      setEditWallet(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/users")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
            <Wallet className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Saved Wallets</h1>
            {user && (
              <p className="text-xs text-slate-400">
                {user.name} — @{user.username}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                #
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Method
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Account Number
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Account Name
              </th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : wallets.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No saved wallets found
                </td>
              </tr>
            ) : (
              wallets.map((wallet: any, idx: number) => (
                <tr
                  key={wallet.id}
                  className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {idx + 1}
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-white">
                      {wallet.methodName ?? wallet.gateway?.name ?? "-"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {editWallet?.id === wallet.id ? (
                      <input
                        value={editAccount}
                        onChange={(e) => setEditAccount(e.target.value)}
                        className="w-full rounded-lg border border-blue-500/50 bg-slate-700 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        placeholder="Account number"
                      />
                    ) : (
                      <p className="font-mono text-xs text-slate-300">
                        {wallet.accountNumber}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-400">
                    {wallet.accountName ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {editWallet?.id === wallet.id ? (
                        <>
                          <button
                            onClick={() => updateWallet()}
                            disabled={updating || !editAccount}
                            className="flex items-center gap-1 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            {updating ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditWallet(null)}
                            className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] text-slate-400 hover:bg-slate-700"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditWallet(wallet);
                              setEditAccount(wallet.accountNumber);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteWallet(wallet.id)}
                            disabled={deleting}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
