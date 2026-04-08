/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AdminService } from "@/services/admin.service";

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", page],
    queryFn: () => AdminService.getAuditLogs({ page, limit: 20 }),
  });

  const logs = data?.data?.logs || [];
  const total = data?.data?.total || 0;

  const getActionColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("VERIFIED"))
      return "bg-green-500/20 text-green-400";
    if (action.includes("REJECTED") || action.includes("BANNED"))
      return "bg-red-500/20 text-red-400";
    if (action.includes("EDITED") || action.includes("UPDATED"))
      return "bg-yellow-500/20 text-yellow-400";
    return "bg-blue-500/20 text-blue-400";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Audit Logs</h1>
        <Badge className="bg-slate-700 text-slate-300">{total} total</Badge>
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 bg-slate-700" />
        ))
      ) : logs.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No audit logs yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700">
              {logs.map((log: any) => (
                <div key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[10px] ${getActionColor(log.action)}`}
                        >
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                        {log.targetType && (
                          <Badge className="text-[10px] bg-slate-700 text-slate-300">
                            {log.targetType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs mt-1">
                        By: {log.admin?.name} ({log.admin?.role})
                      </p>
                      {log.note && (
                        <p className="text-slate-500 text-xs">
                          Note: {log.note}
                        </p>
                      )}
                      {log.ipAddress && (
                        <p className="text-slate-600 text-xs">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs flex-shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-slate-400"
          >
            Previous
          </Button>
          <span className="text-slate-400 text-sm">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="text-slate-400"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
