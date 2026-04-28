"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageCircle, X, GripVertical } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { ChatService } from "@/services/chat.service";
import {
  CHAT_AGENT_COUNT_KEY,
  CHAT_SESSION_KEY,
  getAgentMessageCount,
  markChatAgentMessagesSeen,
  readChatUnreadCount,
  setChatUnreadFromAgentTotal,
  writeChatUnreadCount,
} from "@/lib/chat-unread";

export function ChatReplyPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const posRef = useRef({ x: 16, y: 200 });
  const [renderPos, setRenderPos] = useState({ x: 16, y: 200 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { joinSession, onNewMessage, isConnected } = useSocket();

  const rejoinSession = useCallback(() => {
    if (!isConnected) return;
    const sessionId = localStorage.getItem(CHAT_SESSION_KEY);
    if (sessionId) joinSession(sessionId);
  }, [isConnected, joinSession]);

  useEffect(() => {
    rejoinSession();
  }, [rejoinSession]);

  // Re-join when tab becomes visible again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") rejoinSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [rejoinSession]);

  useEffect(() => {
    const unsub = onNewMessage((data: { role?: string; message?: string }) => {
      if (data.role === "AGENT" && pathname !== "/chat") {
        setLastMessage(data.message ?? "Admin replied to your message");
        const nextUnreadCount = readChatUnreadCount() + 1;
        writeChatUnreadCount(nextUnreadCount);
        setUnreadCount(nextUnreadCount);
        setShow(true);
      }
    });
    return unsub;
  }, [onNewMessage, pathname]);

  // HTTP polling fallback catches messages when socket is unreliable on mobile.
  useEffect(() => {
    if (pathname === "/chat") return;
    const sessionId = localStorage.getItem(CHAT_SESSION_KEY);
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await ChatService.getSession(sessionId);
        const msgs: { role: string; message?: string }[] =
          res.data?.messages ?? [];
        const agentMsgs = msgs.filter((message) => message.role === "AGENT");
        const count = getAgentMessageCount(msgs);
        const stored = localStorage.getItem(CHAT_AGENT_COUNT_KEY);

        if (stored === null) {
          markChatAgentMessagesSeen(count);
          return;
        }

        const nextUnreadCount = setChatUnreadFromAgentTotal(count);
        setUnreadCount(nextUnreadCount);

        if (nextUnreadCount > 0) {
          const newest = agentMsgs[agentMsgs.length - 1];
          setLastMessage(newest?.message ?? "Admin replied to your message");
          setShow(true);
        }
      } catch {
        // silent
      }
    };

    const interval = setInterval(poll, 5000);
    poll();
    return () => clearInterval(interval);
  }, [pathname]);

  const openChat = () => {
    setShow(false);
    markChatAgentMessagesSeen();
    router.push("/chat?mode=agent");
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    posRef.current = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    };
    setRenderPos({ ...posRef.current });
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!show || pathname === "/chat") return null;

  return (
    <div
      style={{
        position: "fixed",
        left: renderPos.x,
        top: renderPos.y,
        zIndex: 9999,
        touchAction: "none",
      }}
      className="w-64 select-none rounded-2xl border border-cyan-500/30 bg-[#0f1d3d] shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-2 rounded-t-2xl border-b border-cyan-500/20 bg-cyan-600/20 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-cyan-400/50" />
        <MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" />
        <span className="flex-1 text-xs font-semibold text-cyan-300">
          New Message
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

      <button
        onClick={openChat}
        className="w-full rounded-b-2xl px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <p className="mb-1 text-[11px] text-slate-400">Support replied:</p>
        <p className="line-clamp-2 text-sm text-white">{lastMessage}</p>
        <p className="mt-2 text-[10px] font-semibold text-cyan-400">
          Tap to open chat - {unreadCount > 9 ? "9+" : unreadCount} new
        </p>
      </button>
    </div>
  );
}
