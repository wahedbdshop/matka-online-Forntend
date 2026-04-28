"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Bell, MessageCircle, X } from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import {
  ADMIN_CHAT_SEEN_MESSAGES_KEY,
  buildAdminChatMessageKey,
  getLatestUserMessage,
} from "@/lib/admin-chat-unread";

const POPUP_DURATION_MS = 12000;

type ChatMessage = {
  id?: string;
  role?: string;
  message?: string;
  createdAt?: string;
};

type ChatSession = {
  id?: string;
  user?: {
    name?: string;
    username?: string;
  };
  messages?: ChatMessage[];
};

type PopupItem = {
  sessionId: string;
  userLabel: string;
  message: string;
  messageKey: string;
};

function readSeenMap() {
  if (typeof window === "undefined") return {} as Record<string, string>;

  try {
    const raw = window.localStorage.getItem(ADMIN_CHAT_SEEN_MESSAGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function AdminChatNotificationPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [popup, setPopup] = useState<PopupItem | null>(null);
  const initializedRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const seenMapRef = useRef<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["admin-global-chat-popup"],
    queryFn: async () => {
      const response = await api.get("/chat/agent/waiting");
      return (response.data?.data ?? []) as ChatSession[];
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const sessions = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  useEffect(() => {
    seenMapRef.current = readSeenMap();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || sessions.length === 0) return;

    const nextSeenMap = { ...seenMapRef.current };

    if (!initializedRef.current) {
      sessions.forEach((session) => {
        const sessionId = String(session?.id ?? "").trim();
        if (!sessionId) return;

        const latestUserMessage = getLatestUserMessage(session);
        nextSeenMap[sessionId] = buildAdminChatMessageKey(sessionId, latestUserMessage);
      });

      seenMapRef.current = nextSeenMap;
      initializedRef.current = true;
      return;
    }

    const nextPopup = sessions
      .map((session) => {
        const sessionId = String(session?.id ?? "").trim();
        if (!sessionId) return null;

        const latestUserMessage = getLatestUserMessage(session);
        if (!latestUserMessage) return null;

        const messageKey = buildAdminChatMessageKey(sessionId, latestUserMessage);
        const seenKey = nextSeenMap[sessionId];

        nextSeenMap[sessionId] = messageKey;

        if (messageKey === seenKey) return null;

        return {
          sessionId,
          userLabel:
            session?.user?.name?.trim() ||
            session?.user?.username?.trim() ||
            "User",
          message:
            latestUserMessage.message?.trim() || "Sent a new message",
          messageKey,
          createdAt: latestUserMessage.createdAt ?? "",
        };
      })
      .filter((item): item is PopupItem & { createdAt: string } => Boolean(item))
      .sort((left, right) => {
        const rightTime = new Date(right.createdAt ?? 0).getTime();
        const leftTime = new Date(left.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      })[0];

    seenMapRef.current = nextSeenMap;

    if (!nextPopup || pathname === "/admin/chat") return;

    setPopup({
      sessionId: nextPopup.sessionId,
      userLabel: nextPopup.userLabel,
      message: nextPopup.message,
      messageKey: nextPopup.messageKey,
    });
  }, [isAuthenticated, pathname, sessions]);

  useEffect(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!popup) return;

    dismissTimerRef.current = window.setTimeout(() => {
      setPopup(null);
      dismissTimerRef.current = null;
    }, POPUP_DURATION_MS);

    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [popup]);

  if (!popup || pathname === "/admin/chat") return null;

  return (
    <div className="fixed bottom-20 right-4 z-[160] w-[320px] rounded-2xl border border-cyan-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
          <Bell className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            New Live Chat Message
          </p>
          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
            {popup.userLabel}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {popup.message}
          </p>

          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem("admin_chat_session", popup.sessionId);
              setPopup(null);
              router.push("/admin/chat");
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Open Live Chat
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPopup(null)}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close chat notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
