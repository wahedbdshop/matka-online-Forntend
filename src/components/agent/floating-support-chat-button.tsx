"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { api } from "@/lib/axios";

export function FloatingSupportChatButton() {
  const router = useRouter();
  const { canRunAdminQuery } = useAdminAuth();
  const { data } = useQuery({
    queryKey: ["support-agent-waiting-chat-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data?.data ?? [];
    },
    enabled: canRunAdminQuery,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const waitingSessions = data ?? [];
  const waitingCount = waitingSessions.length;

  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startBottom: number;
    startRight: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setPos({ bottom: 20, right: 20 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const current = pos ?? { bottom: 20, right: 20 };
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startBottom: current.bottom,
      startRight: current.right,
      moved: false,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current?.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      const newBottom = Math.max(
        0,
        Math.min(window.innerHeight - 80, dragRef.current.startBottom - dy),
      );
      const newRight = Math.max(
        0,
        Math.min(window.innerWidth - 180, dragRef.current.startRight - dx),
      );
      setPos({ bottom: newBottom, right: newRight });
    };

    const onMouseUp = () => {
      if (dragRef.current && !dragRef.current.moved) {
        router.push("/agent/chat");
      }
      if (dragRef.current) dragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const current = pos ?? { bottom: 20, right: 20 };
    dragRef.current = {
      dragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startBottom: current.bottom,
      startRight: current.right,
      moved: false,
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (!dragRef.current?.dragging) return;
      const t = ev.touches[0];
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      const newBottom = Math.max(
        0,
        Math.min(window.innerHeight - 80, dragRef.current.startBottom - dy),
      );
      const newRight = Math.max(
        0,
        Math.min(window.innerWidth - 180, dragRef.current.startRight - dx),
      );
      setPos({ bottom: newBottom, right: newRight });
    };

    const onTouchEnd = () => {
      if (dragRef.current && !dragRef.current.moved) {
        router.push("/agent/chat");
      }
      if (dragRef.current) dragRef.current.dragging = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  if (waitingCount <= 0 || !pos) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        bottom: pos.bottom,
        right: pos.right,
        position: "fixed",
        zIndex: 140,
        cursor: "grab",
        userSelect: "none",
      }}
      className="group relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.24),_transparent_45%),linear-gradient(135deg,_rgba(8,23,45,0.98),_rgba(11,18,36,0.98))] text-white shadow-[0_10px_28px_rgba(3,8,20,0.62)] ring-1 ring-cyan-400/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/55 hover:shadow-[0_14px_32px_rgba(6,24,45,0.72)] active:cursor-grabbing"
      aria-label="Open waiting chat sessions"
    >
      <div className="absolute inset-[6px] rounded-[18px] border border-white/5 bg-white/[0.03]" />
      <MessageSquareText className="relative h-6 w-6 text-cyan-100 transition-transform duration-300 group-hover:scale-110" />
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-950 bg-linear-to-r from-rose-500 to-orange-400 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-900/40">
        {waitingCount > 9 ? "9+" : waitingCount}
      </span>
      <span className="absolute -bottom-7 rounded-full border border-cyan-400/20 bg-slate-900/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-cyan-200 opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        SMS Chat
      </span>
    </div>
  );
}
