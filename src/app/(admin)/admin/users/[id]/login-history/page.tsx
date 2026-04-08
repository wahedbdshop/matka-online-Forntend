/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, Monitor, Globe, MapPin, Calendar } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function UserLoginHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-login-history", id, page],
    queryFn: () => AdminService.getUserLoginHistory(id, page, limit),
  });

  const userQuery = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => AdminService.getUserById(id),
  });

  const user = userQuery.data?.data;
  const logs: any[] = data?.data?.logs ?? [];
  const total: number = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/users/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Login History</h1>
          {user && (
            <p className="text-xs text-slate-400">
              @{user.username} · {user.email}
            </p>
          )}
        </div>
        <span className="ml-auto rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400">
          {total} records
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  SI
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Login At
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Location
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Browser
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    OS
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500 text-sm"
                  >
                    No login history found
                  </td>
                </tr>
              ) : (
                logs.map((log: any, idx: number) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-white text-xs font-medium">
                      @{log.user?.username ?? user?.username ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {log.user?.email ?? user?.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("en-BD", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="rounded bg-slate-700 px-2 py-0.5 font-mono text-cyan-400">
                        {log.ip ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {[log.city, log.region, log.country]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {log.browser ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {log.os ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-500">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              >
                Prev
              </button>
              <span className="text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
