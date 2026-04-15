/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  Wallet,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Ban,
  MailCheck,
} from "lucide-react";
import Link from "next/link";
import { AdminService } from "@/services/admin.service";
import { toast } from "sonner";

const LIMIT = 20;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-500/15  text-green-400  border-green-500/30",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  BANNED: "bg-red-500/15    text-red-400    border-red-500/30",
};

interface UsersTableProps {
  extraParams?: Record<string, any>;
  queryKey: string;
  title: string;
  subtitle?: string;
  showWallet?: boolean;
  showBan?: boolean;
  showEmailVerify?: boolean;
}

export function UsersTable({
  extraParams = {},
  queryKey,
  title,
  subtitle,
  showWallet = false,
  showBan = false,
  showEmailVerify = false,
}: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { mutate: banUser } = useMutation({
    mutationFn: (id: string) => AdminService.banUser(id),
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: unbanUser } = useMutation({
    mutationFn: (id: string) => AdminService.unbanUser(id),
    onSuccess: () => {
      toast.success("User unbanned");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: verifyEmail } = useMutation({
    mutationFn: (id: string) => AdminService.verifyUserEmail(id),
    onSuccess: () => {
      toast.success("Email verified");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [queryKey, search, page, extraParams],
    queryFn: () =>
      AdminService.getUsers({
        search: search || undefined,
        page,
        limit: LIMIT,
        orderBy: "balance",
        order: "desc",
        ...extraParams,
      }),
  });

  const users = data?.data?.users ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as Error | undefined)?.message ||
    "Failed to load users";

  // ✅ dynamic column count
  const colCount = 9 + (showEmailVerify ? 1 : 0);

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const headers = [
    "#",
    "User",
    "Email",
    "Phone",
    "Country",
    "Joined",
    "Balance",
    "Status",
    ...(showEmailVerify ? ["Email Status"] : []),
    "Action",
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle ?? `${total} users`}
          </p>
        </div>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          {total}
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Name, email, username..."
          className="w-full rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {headers.map((h) => (
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
                  {Array.from({ length: colCount }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-red-400"
                >
                  {errorMessage}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: any, idx: number) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  {/* SL */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-white">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      @{user.username}
                    </p>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {user.email}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {user.phone ?? "-"}
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {user.country ?? "-"}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-purple-400">
                      ৳{Number(user.balance).toLocaleString()}
                    </p>
                    {Number(user.bonusBalance) > 0 && (
                      <p className="text-[10px] text-green-400">
                        +৳{Number(user.bonusBalance).toLocaleString()}
                      </p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[user.status] ?? ""}`}
                    >
                      {user.status}
                    </span>
                  </td>

                  {/* ✅ Email Status column */}
                  {showEmailVerify && (
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          user.emailVerified
                            ? "border-green-500/30 bg-green-500/15 text-green-400"
                            : "border-red-500/30   bg-red-500/15   text-red-400"
                        }`}
                      >
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                  )}

                  {/* Action */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* View */}
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>

                      {/* Wallet */}
                      {showWallet && (
                        <Link
                          href={`/admin/users/${user.id}/wallets`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-purple-400"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </Link>
                      )}

                      {/* Ban / Unban */}
                      {showBan &&
                        (user.status === "BANNED" ? (
                          <button
                            onClick={() => unbanUser(user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-green-500/50 hover:text-green-400"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => banUser(user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-red-500/50 hover:text-red-400"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        ))}

                      {/* ✅ Verify Email button */}
                      {showEmailVerify && !user.emailVerified && (
                        <button
                          onClick={() => verifyEmail(user.id)}
                          title="Verify Email"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-300 hover:border-green-500/50 hover:text-green-400"
                        >
                          <MailCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
