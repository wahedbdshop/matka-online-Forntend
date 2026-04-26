"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Clock,
  Gamepad2,
  Headphones,
  MessageSquare,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { AdminService } from "@/services/admin.service";
import { api } from "@/lib/axios";

const quickLinks = [
  { href: "/agent/thai-lottery", label: "Thai Lottery", icon: Gamepad2, accent: "text-blue-400" },
  { href: "/agent/kalyan", label: "Kalyan", icon: Sparkles, accent: "text-violet-400" },
  { href: "/agent/deposits", label: "Deposits", icon: ArrowDownToLine, accent: "text-emerald-400" },
  { href: "/agent/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, accent: "text-rose-400" },
  { href: "/agent/transfers", label: "Transfers", icon: ArrowLeftRight, accent: "text-cyan-400" },
  { href: "/agent/transactions", label: "Transactions", icon: ReceiptText, accent: "text-amber-400" },
  { href: "/agent/tickets", label: "Tickets", icon: ShieldCheck, accent: "text-yellow-400" },
  { href: "/agent/chat", label: "Live Chat", icon: Headphones, accent: "text-fuchsia-400" },
];

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.sessions)) return payload.data.sessions;
  if (Array.isArray(payload?.data?.tickets)) return payload.data.tickets;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[11px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 transition-all hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-slate-800/60"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
      {content}
    </div>
  );
}

export default function SupportAgentDashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: dashboardData } = useQuery({
    queryKey: ["support-agent-dashboard-overview"],
    queryFn: () => AdminService.getDashboardStats(),
    refetchInterval: 15000,
  });

  const { data: waitingData } = useQuery({
    queryKey: ["support-agent-dashboard-chat"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: ticketsData } = useQuery({
    queryKey: ["support-agent-dashboard-tickets"],
    queryFn: () => AdminService.getTickets({ status: "PENDING" }),
    refetchInterval: 15000,
  });

  const pendingDeposits =
    dashboardData?.data?.deposits?.pending ??
    dashboardData?.data?.pendingDeposits ??
    0;
  const pendingWithdrawals =
    dashboardData?.data?.withdrawals?.pending ??
    dashboardData?.data?.pendingWithdrawals ??
    0;
  const waitingChats = extractList(waitingData).filter(
    (session: { status?: string }) => session.status === "WAITING_AGENT",
  ).length;
  const pendingTickets = extractList(ticketsData).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
              Support Agent Workspace
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">
              Welcome back, {user?.name ?? "Agent"}
            </h2>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Shift Snapshot</p>
            <p className="mt-1 text-lg font-bold text-white">
              {new Date().toLocaleString("en-BD", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Deposits" value={pendingDeposits} hint="Waiting for review" href="/agent/deposits" />
        <StatCard label="Pending Withdrawals" value={pendingWithdrawals} hint="Need approval or rejection" href="/agent/withdrawals" />
        <StatCard label="Waiting Chats" value={waitingChats} hint="Customers are waiting" href="/agent/chat" />
        <StatCard label="Open Tickets" value={pendingTickets} hint="Reply or close from tickets" href="/agent/tickets" />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Quick Access</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-700/50 bg-slate-800/35 p-4 transition-all hover:-translate-y-0.5 hover:border-cyan-500/30 hover:bg-slate-800/60"
            >
              <item.icon className={`h-5 w-5 ${item.accent}`} />
              <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/35 p-5">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-white">Live Chat Focus</h3>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {waitingChats > 0
              ? `${waitingChats} customer conversation${waitingChats === 1 ? "" : "s"} waiting for pickup right now.`
              : "No waiting conversation right now."}
          </p>
          <Link
            href="/agent/chat"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-fuchsia-500/15 px-4 py-2 text-sm font-medium text-fuchsia-300"
          >
            <MessageSquare className="h-4 w-4" />
            Open live chat
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/35 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">Support Notes</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Thai Lottery and Kalyan allowed tools are exposed in the sidebar.</li>
            <li>Restricted actions like result update, play edit, and delete flows are intentionally hidden.</li>
            <li>First login password reset continues to use the existing forced-password flow.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
