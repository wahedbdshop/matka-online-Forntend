/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Layers,
  CheckCircle,
  Trophy,
  ClipboardList,
  XCircle,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";
import { cn } from "@/lib/utils";
import { getKalyanMarketOptionLabel } from "@/lib/kalyan-market-display";

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as T[];
    }

    if (Array.isArray(record.items)) {
      return record.items as T[];
    }

    if (Array.isArray(record.rows)) {
      return record.rows as T[];
    }
  }

  return [];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-500/20 [--accent:theme(colors.blue.500)]",
    green: "border-emerald-500/20 [--accent:theme(colors.emerald.500)]",
    purple: "border-purple-500/20 [--accent:theme(colors.purple.500)]",
    yellow: "border-yellow-500/20 [--accent:theme(colors.yellow.500)]",
    red: "border-red-500/20 [--accent:theme(colors.red.500)]",
    rose: "border-rose-500/20 [--accent:theme(colors.rose.500)]",
  };
  const iconBg: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-400",
    green: "bg-emerald-500/15 text-emerald-400",
    purple: "bg-purple-500/15 text-purple-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    red: "bg-red-500/15 text-red-400",
    rose: "bg-rose-500/15 text-rose-400",
  };

  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-slate-800/50 p-4 transition-all duration-200",
        href ? "hover:border-slate-500 hover:bg-slate-800 cursor-pointer" : "",
        colorMap[color],
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", iconBg[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
          <span>View all</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function KalyanDashboardPage() {
  const { data: marketsData, isLoading: loadingMarkets } = useQuery({
    queryKey: ["kalyan-markets-summary"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data: resultsData, isLoading: loadingResults } = useQuery({
    queryKey: ["kalyan-results-summary"],
    queryFn: () => KalyanAdminService.getResults({ limit: 100 }),
  });

  const { data: entriesData, isLoading: loadingEntries } = useQuery({
    queryKey: ["kalyan-entries-summary"],
    queryFn: () => KalyanAdminService.getAdminEntries({ limit: 100 }),
  });

  const markets: any[] = toArray<any>(marketsData?.data?.markets ?? marketsData?.data);
  const results: any[] = toArray<any>(resultsData?.data?.results ?? resultsData?.data);
  const entries: any[] = toArray<any>(entriesData?.data?.entries ?? entriesData?.data);

  const totalMarkets = marketsData?.data?.total ?? markets.length;
  const activeMarkets = markets.filter((m: any) => m.status === "ACTIVE").length;
  const totalResults = resultsData?.data?.total ?? results.length;
  const totalEntries = entriesData?.data?.total ?? entries.length;
  const cancelledEntries = entries.filter(
    (e: any) => e.status === "CANCELLED",
  ).length;
  const removedEntries = entries.filter(
    (e: any) => e.status === "REMOVED",
  ).length;

  const isLoading = loadingMarkets || loadingResults || loadingEntries;

  const recentResults = results.slice(0, 5);
  const recentEntries = entries.slice(0, 5);

  const formatDate = (d?: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Kalyan Lottery</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Admin overview & quick stats
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-800"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Total Markets"
              value={totalMarkets}
              icon={Layers}
              color="blue"
              href="/admin/kalyan/lottery-games"
            />
            <StatCard
              label="Active Markets"
              value={activeMarkets}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              label="Total Results"
              value={totalResults}
              icon={Trophy}
              color="purple"
              href="/admin/kalyan/view-results"
            />
            <StatCard
              label="Total Entries"
              value={totalEntries}
              icon={ClipboardList}
              color="yellow"
              href="/admin/kalyan/play-history"
            />
            <StatCard
              label="Cancelled"
              value={cancelledEntries}
              icon={XCircle}
              color="red"
              href="/admin/kalyan/play-cancel-history"
            />
            <StatCard
              label="Removed"
              value={removedEntries}
              icon={Trash2}
              color="rose"
              href="/admin/kalyan/play-remove-history"
            />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Results */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <p className="text-sm font-semibold text-white">Recent Results</p>
            <Link
              href="/admin/kalyan/view-results"
              className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {loadingResults ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-700" />
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-700" />
                </div>
              ))
            ) : recentResults.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                No results yet
              </p>
            ) : (
              recentResults.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div>
                    <p className="text-xs font-medium text-white">
                      {r.market ? getKalyanMarketOptionLabel(r.market) : r.marketId}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatDate(r.resultDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-purple-300">
                      {r.openPatti ?? "-"} — {r.closePatti ?? "-"}
                    </p>
                    <span
                      className={`text-[10px] ${
                        r.status === "PUBLISHED"
                          ? "text-green-400"
                          : r.status === "CANCELLED"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Entries */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <p className="text-sm font-semibold text-white">Recent Entries</p>
            <Link
              href="/admin/kalyan/play-history"
              className="flex items-center gap-1 text-[11px] text-yellow-400 hover:text-yellow-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {loadingEntries ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-700" />
                </div>
              ))
            ) : recentEntries.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">
                No entries yet
              </p>
            ) : (
              recentEntries.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div>
                    <p className="text-xs font-medium text-white">
                      {e.user?.name ?? e.userId}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {e.market?.name ?? e.marketId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">
                      ৳{Number(e.totalAmount ?? 0).toLocaleString()}
                    </p>
                    <span
                      className={`text-[10px] ${
                        e.status === "WON"
                          ? "text-green-400"
                          : e.status === "LOST"
                            ? "text-red-400"
                            : e.status === "PENDING"
                              ? "text-yellow-400"
                              : "text-slate-400"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
