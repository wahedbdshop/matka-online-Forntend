"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Headphones, Loader2, MessageCircle, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";
import { ChatService } from "@/services/chat.service";
import { DepositService } from "@/services/deposit.service";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import {
  CHAT_AGENT_COUNT_KEY,
  CHAT_SESSION_KEY,
  CHAT_UNREAD_EVENT,
  clearChatTracking,
  getAgentMessageCount,
  markChatAgentMessagesSeen,
  readChatUnreadCount,
  setChatUnreadFromAgentTotal,
} from "@/lib/chat-unread";

const BUTTON_SIZE = 58;
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 4;
const POSITION_STORAGE_KEY = "floating-chat-button-position";
const WHATSAPP_NUMBER_KEY = "live_chat_whatsapp_number";
const WHATSAPP_MESSAGE_KEY = "live_chat_whatsapp_message";
const DEFAULT_WHATSAPP_MESSAGE = "Hello, I need support.";

type ButtonPosition = {
  x: number;
  y: number;
};

type GlobalAgent = {
  whatsappNumber?: string | null;
};

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    (error.response.status === 401 || error.response.status === 403)
  );
}

function clampPosition(x: number, y: number): ButtonPosition {
  if (typeof window === "undefined") return { x, y };

  return {
    x: Math.min(
      Math.max(EDGE_GAP, x),
      Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP),
    ),
    y: Math.min(
      Math.max(EDGE_GAP, y),
      Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP),
    ),
  };
}

function readSavedPosition(): ButtonPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const savedPosition = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!savedPosition) return null;

    const parsed = JSON.parse(savedPosition) as Partial<ButtonPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }

    return clampPosition(parsed.x, parsed.y);
  } catch {
    window.localStorage.removeItem(POSITION_STORAGE_KEY);
    return null;
  }
}

export function FloatingChatButton({
  bottomClassName = "bottom-20",
}: {
  bottomClassName?: string;
}) {
  const router = useRouter();
  const [position, setPosition] = useState<ButtonPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const startPointerRef = useRef<ButtonPosition | null>(null);
  const startPositionRef = useRef<ButtonPosition | null>(null);
  const currentPositionRef = useRef<ButtonPosition | null>(position);
  const hasDraggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: globalAgentsData, isFetching: isLoadingAgents } = useQuery({
    queryKey: ["floating-chat-global-agents"],
    queryFn: DepositService.getGlobalAgents,
    enabled: isMenuOpen,
    staleTime: 60000,
  });

  const { data: publicSettingsData, isFetching: isLoadingSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: AdminService.getPublicSettings,
    enabled: isMenuOpen,
    staleTime: 60000,
  });

  const globalAgents: GlobalAgent[] = globalAgentsData?.data ?? [];
  const publicSettings = publicSettingsData?.data ?? [];
  const liveChatWhatsappNumber =
    publicSettings.find((setting: any) => setting.key === WHATSAPP_NUMBER_KEY)?.value ??
    "";
  const liveChatWhatsappMessage =
    publicSettings.find((setting: any) => setting.key === WHATSAPP_MESSAGE_KEY)?.value ||
    DEFAULT_WHATSAPP_MESSAGE;

  useEffect(() => {
    const savedPosition = readSavedPosition();
    const restorePositionTimeout = savedPosition
      ? window.setTimeout(() => {
          currentPositionRef.current = savedPosition;
          setPosition(savedPosition);
        }, 0)
      : null;

    const handleResize = () => {
      const currentPosition = currentPositionRef.current;
      if (!currentPosition) return;

      const nextPosition = clampPosition(currentPosition.x, currentPosition.y);
      currentPositionRef.current = nextPosition;
      setPosition(nextPosition);
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(nextPosition),
      );
    };

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      if (restorePositionTimeout !== null) {
        window.clearTimeout(restorePositionTimeout);
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, []);

  useEffect(() => {
    setUnreadCount(readChatUnreadCount());

    const handleUnreadChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      setUnreadCount(customEvent.detail?.count ?? readChatUnreadCount());
    };

    window.addEventListener(CHAT_UNREAD_EVENT, handleUnreadChange);
    window.addEventListener("storage", handleUnreadChange);
    return () => {
      window.removeEventListener(CHAT_UNREAD_EVENT, handleUnreadChange);
      window.removeEventListener("storage", handleUnreadChange);
    };
  }, []);

  useEffect(() => {
    const sessionId = window.localStorage.getItem(CHAT_SESSION_KEY);
    if (!sessionId) return;

    if (!hasClientAuthCookie()) {
      clearChatTracking();
      setUnreadCount(0);
      return;
    }

    let interval: number | null = null;
    let stopped = false;

    const stopPolling = () => {
      stopped = true;
      if (interval) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const pollUnreadCount = async () => {
      if (stopped) return;

      try {
        const res = await ChatService.getSession(sessionId, { silent: true });
        const count = getAgentMessageCount(res.data?.messages ?? []);

        if (window.localStorage.getItem(CHAT_AGENT_COUNT_KEY) === null) {
          markChatAgentMessagesSeen(count);
          setUnreadCount(0);
          return;
        }

        setUnreadCount(setChatUnreadFromAgentTotal(count));
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearChatTracking();
          setUnreadCount(0);
          stopPolling();
        }
      }
    };

    void pollUnreadCount();
    interval = window.setInterval(pollUnreadCount, 5000);
    return stopPolling;
  }, []);

  const savePosition = useCallback((nextPosition: ButtonPosition) => {
    window.localStorage.setItem(
      POSITION_STORAGE_KEY,
      JSON.stringify(nextPosition),
    );
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    startPointerRef.current = { x: event.clientX, y: event.clientY };
    startPositionRef.current = position ?? { x: rect.left, y: rect.top };
    hasDraggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const startPointer = startPointerRef.current;
    const startPosition = startPositionRef.current;
    if (!startPointer || !startPosition) return;

    const distanceX = event.clientX - startPointer.x;
    const distanceY = event.clientY - startPointer.y;

    if (
      !hasDraggedRef.current &&
      Math.hypot(distanceX, distanceY) < DRAG_THRESHOLD
    ) {
      return;
    }

    hasDraggedRef.current = true;
    const nextPosition = clampPosition(
      startPosition.x + distanceX,
      startPosition.y + distanceY,
    );
    currentPositionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const finalPosition = currentPositionRef.current;

    if (hasDraggedRef.current && finalPosition) {
      suppressClickRef.current = true;
      savePosition(finalPosition);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    startPointerRef.current = null;
    startPositionRef.current = null;
    setIsDragging(false);
  };

  const handleMainClick = () => {
    if (suppressClickRef.current) return;
    setIsMenuOpen((open) => !open);
  };

  const goToChat = (mode: "ai" | "agent") => {
    setIsMenuOpen(false);
    if (mode === "agent") {
      if (!hasClientAuthCookie()) {
        router.push("/login");
        return;
      }

      markChatAgentMessagesSeen();
      setUnreadCount(0);
    }
    router.push(`/chat?mode=${mode}`);
  };

  const handleWhatsApp = () => {
    const agent = globalAgents.find((item) => item.whatsappNumber);
    const phoneNumber = (liveChatWhatsappNumber || agent?.whatsappNumber || "").replace(
      /[^0-9]/g,
      "",
    );

    if (!phoneNumber) {
      toast.error("No WhatsApp agent is available right now.");
      return;
    }

    setIsMenuOpen(false);
    const message = encodeURIComponent(liveChatWhatsappMessage);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const style = position
    ? ({
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
        bottom: "auto",
      } satisfies CSSProperties)
    : undefined;

  return (
    <>
      <style>{`
        .light .floating-chat-link {
          border-color: rgba(186, 230, 253, 0.95);
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 55%, #eef2ff 100%);
          color: #0f172a;
          box-shadow: 0 16px 34px rgba(148, 163, 184, 0.24);
        }
        .light .floating-chat-aura {
          background: rgba(56, 189, 248, 0.18);
          opacity: 0.9;
        }
        .light .floating-chat-core {
          border-color: rgba(14, 165, 233, 0.24);
          background: rgba(255, 255, 255, 0.82);
        }
        .light .floating-chat-icon {
          color: #0369a1;
        }
        .light .floating-chat-label {
          color: #0f172a;
        }
        .light .floating-chat-dot {
          border-color: #e0f2fe;
        }
      `}</style>
      <div
        ref={containerRef}
        style={style}
        className={`fixed ${position ? "" : `${bottomClassName} right-4`} z-[120] h-[58px] w-[58px] touch-none select-none`}
      >
        {isMenuOpen && (
          <div className="absolute bottom-[68px] right-0 w-40 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-[0_18px_42px_rgba(2,8,20,0.55)] backdrop-blur">
            <button
              type="button"
              onClick={() => goToChat("ai")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-100 transition-colors hover:bg-blue-500/15 hover:text-blue-200"
            >
              <Bot className="h-4 w-4 text-blue-300" />
              AI
            </button>
            <button
              type="button"
              onClick={() => goToChat("agent")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-100 transition-colors hover:bg-emerald-500/15 hover:text-emerald-200"
            >
              <Headphones className="h-4 w-4 text-emerald-300" />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>Agent</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
                  Live
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={isLoadingAgents || isLoadingSettings}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-100 transition-colors hover:bg-green-500/15 hover:text-green-200 disabled:cursor-wait disabled:opacity-70"
            >
              {isLoadingAgents || isLoadingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-300" />
              ) : (
                <PhoneCall className="h-4 w-4 text-green-300" />
              )}
              WhatsApp
            </button>
          </div>
        )}

        <button
          type="button"
          className={`floating-chat-link group flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-[#0b1328] via-[#0f1d3d] to-[#050b18] text-white shadow-[0_14px_32px_rgba(2,8,20,0.55)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.05] hover:shadow-[0_18px_38px_rgba(34,211,238,0.22)] active:scale-[0.97] ${isDragging ? "cursor-grabbing transition-none hover:translate-y-0 hover:scale-100" : "cursor-grab"}`}
          aria-label="Open support options"
          onClick={handleMainClick}
          onPointerCancel={finishDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
        >
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,_rgba(125,211,252,0.24),_transparent_38%),radial-gradient(circle_at_70%_75%,_rgba(34,197,94,0.18),_transparent_32%)]" />
          <div className="floating-chat-aura pointer-events-none absolute -inset-1 -z-10 rounded-full bg-cyan-400/20 blur-xl opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
          <span className="floating-chat-core relative flex h-[42px] w-[42px] items-center justify-center rounded-full border border-cyan-300/20 bg-white/[0.04]">
            <MessageCircle className="floating-chat-icon absolute h-4.5 w-4.5 -translate-y-[7px] text-cyan-100 transition-transform duration-300 group-hover:scale-110" />
            <span className="floating-chat-label translate-y-[7px] text-[8px] font-black tracking-[0.1em] text-white">
              24/7
            </span>
          </span>
          <span className="floating-chat-dot absolute right-[5px] top-[5px] h-2.5 w-2.5 rounded-full border border-[#081428] bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#081428] bg-rose-500 px-1 text-[10px] font-black leading-none text-white shadow-[0_0_14px_rgba(244,63,94,0.65)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
