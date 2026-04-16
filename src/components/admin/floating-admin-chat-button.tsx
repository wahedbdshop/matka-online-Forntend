"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { api } from "@/lib/axios";

export function FloatingAdminChatButton() {
  const router = useRouter();
  const { canRunAdminQuery } = useAdminAuth();
  const { data } = useQuery({
    queryKey: ["admin-waiting-chat-sessions"],
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

  // Drag state
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startBottom: number;
    startRight: number;
    moved: boolean;
  } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  // Init position
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
      const newBottom = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startBottom - dy));
      const newRight = Math.max(0, Math.min(window.innerWidth - 180, dragRef.current.startRight - dx));
      setPos({ bottom: newBottom, right: newRight });
    };

    const onMouseUp = (_ev: MouseEvent) => {
      if (dragRef.current && !dragRef.current.moved) {
        router.push("/admin/chat");
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
      const newBottom = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.startBottom - dy));
      const newRight = Math.max(0, Math.min(window.innerWidth - 180, dragRef.current.startRight - dx));
      setPos({ bottom: newBottom, right: newRight });
    };

    const onTouchEnd = () => {
      if (dragRef.current && !dragRef.current.moved) {
        router.push("/admin/chat");
      }
      if (dragRef.current) dragRef.current.dragging = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  };

  if (waitingCount <= 0) return null;
  if (!pos) return null;

  return (
    <div
      ref={btnRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ bottom: pos.bottom, right: pos.right, position: "fixed", zIndex: 140, cursor: "grab", userSelect: "none" }}
      className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/30 bg-gradient-to-br from-[#1b1037] via-[#171b38] to-[#0d1327] text-white shadow-[0_8px_24px_rgba(8,10,25,0.55)] transition-all duration-200 hover:border-purple-300/60 active:cursor-grabbing"
      aria-label="Open waiting chat sessions"
    >
      <MessageCircle className="h-5 w-5 text-purple-200 transition-transform duration-300 group-hover:scale-110" />
      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#0d1327] bg-rose-500 px-1 text-[10px] font-bold text-white">
        {waitingCount > 9 ? "9+" : waitingCount}
      </span>
    </div>
  );
}
