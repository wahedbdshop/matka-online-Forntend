"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Headphones, MessageCircle } from "lucide-react";
import { api } from "@/lib/axios";

export function FloatingAdminChatButton() {
  const { data } = useQuery({
    queryKey: ["admin-waiting-chat-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data?.data ?? [];
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const waitingSessions = data ?? [];
  const waitingCount = waitingSessions.length;

  if (waitingCount <= 0) return null;

  return (
    <Link
      href="/admin/chat"
      className="group fixed bottom-5 right-5 z-[140] flex items-center gap-2 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-[#1b1037] via-[#171b38] to-[#0d1327] px-4 py-3 text-white shadow-[0_18px_40px_rgba(8,10,25,0.55)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-purple-300/60 hover:shadow-[0_24px_54px_rgba(168,85,247,0.28)]"
      aria-label="Open waiting chat sessions"
    >
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-500/12">
        <MessageCircle className="h-5 w-5 text-purple-200 transition-transform duration-300 group-hover:scale-110" />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#0d1327] bg-rose-500 px-1 text-[10px] font-bold text-white">
          {waitingCount > 9 ? "9+" : waitingCount}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-purple-200">
          Live Chat
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-300">
          <Headphones className="h-3.5 w-3.5 text-emerald-400" />
          {waitingCount} waiting message{waitingCount > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
