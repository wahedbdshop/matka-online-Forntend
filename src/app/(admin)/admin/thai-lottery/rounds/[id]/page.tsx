"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Trophy,
  Gamepad2,
  RotateCcw,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { formatAbsoluteUtcDateTimeForBangladeshDisplay } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-green-500/15 text-green-400 border-green-500/30",
  CLOSED: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  RESULTED: "bg-blue-500/15  text-blue-400  border-blue-500/30",
  CANCELLED: "bg-red-500/15   text-red-400   border-red-500/30",
};

const formatDate = (d?: string) => {
  if (!d) return "-";
  return formatAbsoluteUtcDateTimeForBangladeshDisplay(d, { includeTimezone: true });
};

export default function ThaiRoundOverviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-thai-round", id],
    queryFn: () => AdminService.getThaiRoundById(id),
  });

  const round = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="h-32 rounded-xl bg-slate-800" />
        <div className="h-40 rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!round) return <p className="text-slate-400">Round not found</p>;

  const isOpen = round.status === "OPEN";
  const isClosed = round.status === "CLOSED";
  const isResulted = round.status === "RESULTED";

  // Nav cards config
  const navCards = [
    {
      href: `/admin/thai-lottery/rounds/${id}/close`,
      icon: Clock,
      label: "Close Time",
      desc: round.closeTime
        ? `Set: ${formatDate(round.closeTime)}`
        : "Not set yet",
      color: "border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10",
      iconColor: "text-yellow-400",
      disabled: false,
    },
    {
      href: `/admin/thai-lottery/rounds/${id}/control`,
      icon: Lock,
      label: "Round Control",
      desc: "Hold / Resume / Extend close time",
      color: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
      iconColor: "text-blue-400",
      disabled: isResulted,
    },
    {
      href: `/admin/thai-lottery/rounds/${id}/result`,
      icon: isResulted ? RotateCcw : Trophy,
      label: isResulted ? "Edit Result" : "Set Result",
      desc: isResulted
        ? `${round.resultThreeUpDirect} / ${round.resultDownDirect} · ${round.editCount ?? 0}/4 edits`
        : isClosed
          ? "Round closed — ready to set result"
          : "Close round first",
      color: isResulted
        ? "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
        : "border-green-500/30 bg-green-500/5 hover:bg-green-500/10",
      iconColor: isResulted ? "text-orange-400" : "text-green-400",
      disabled: isOpen,
    },
    {
      href: `/admin/thai-lottery/rounds/${id}/bets`,
      icon: Gamepad2,
      label: "View Bets",
      desc: "All bets placed in this round",
      color: "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10",
      iconColor: "text-purple-400",
      disabled: false,
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/thai-lottery")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            Round #{round.issueNumber}
          </h1>
          <p className="text-xs text-slate-400">
            Draw: {formatDate(round.drawDate)}
          </p>
        </div>
        <span
          className={cn(
            "ml-auto rounded-full border px-3 py-1 text-xs font-medium",
            STATUS_STYLE[round.status] ?? "",
          )}
        >
          {round.status}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Status", value: round.status },
          { label: "Close Time", value: formatDate(round.closeTime) },
          { label: "Resulted At", value: formatDate(round.resultedAt) },
          { label: "Edit Count", value: `${round.editCount ?? 0} / 4` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Result display if resulted */}
      {isResulted && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "3Up Direct",
              value: round.resultThreeUpDirect,
              color: "text-[#d6b4ff]",
            },
            {
              label: "2Up Direct",
              value: round.resultTwoUpDirect,
              color: "text-[#71a6ff]",
            },
            {
              label: "Down",
              value: round.resultDownDirect,
              color: "text-[#ffb020]",
            },
          ].map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center"
            >
              <p className="text-[10px] uppercase text-slate-500">{r.label}</p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-widest mt-1",
                  r.color,
                )}
              >
                {r.value ?? "-"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Cards */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          Actions
        </p>
        {navCards.map((card) => (
          <button
            key={card.href}
            onClick={() => !card.disabled && router.push(card.href)}
            disabled={card.disabled}
            className={cn(
              "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
              card.color,
              card.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg bg-slate-900/60 flex items-center justify-center flex-shrink-0",
                card.iconColor,
              )}
            >
              <card.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{card.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {card.desc}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
