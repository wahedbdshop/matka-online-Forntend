"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, X, GripVertical } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth.store";

interface NotificationPayload {
  title?: string;
  message?: string;
  body?: string;
}

export function NotificationPopup() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [show, setShow] = useState(false);
  const [notif, setNotif] = useState<{ title: string; message: string }>({
    title: "",
    message: "",
  });

  const posRef = useRef({ x: 16, y: 100 });
  const [renderPos, setRenderPos] = useState({ x: 16, y: 100 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { isConnected, onEvent, emitEvent } = useSocket();

  useEffect(() => {
    if (!isConnected || !user?.id) return;
    emitEvent("join_notification_room", { userId: user.id });
  }, [isConnected, user?.id, emitEvent]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = onEvent("new_notification", (data: NotificationPayload) => {
      const title = data.title ?? "নতুন বার্তা";
      const message = data.message ?? data.body ?? "";
      setNotif({ title, message });
      setShow(true);
    });

    return unsub;
  }, [onEvent, isAuthenticated]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragOffset.current = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      };
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      posRef.current = {
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      };
      setRenderPos({ ...posRef.current });
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: renderPos.x,
        top: renderPos.y,
        zIndex: 9998,
        touchAction: "none",
      }}
      className="w-72 select-none rounded-2xl border border-purple-500/30 bg-[#0f1d3d] shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-2 rounded-t-2xl border-b border-purple-500/20 bg-purple-600/20 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-purple-400/50" />
        <Bell className="h-4 w-4 shrink-0 text-purple-400" />
        <span className="flex-1 text-xs font-semibold text-purple-300">
          {notif.title}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShow(false)}
          aria-label="Close"
          className="rounded p-0.5 text-slate-400 transition-colors hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm text-white leading-relaxed">{notif.message}</p>
        <button
          onClick={() => setShow(false)}
          className="mt-2 text-[10px] font-semibold text-purple-400 hover:text-purple-300"
        >
          বন্ধ করুন ×
        </button>
      </div>
    </div>
  );
}
