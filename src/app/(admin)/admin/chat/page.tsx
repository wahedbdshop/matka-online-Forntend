/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Headphones,
  MessageCircle,
  ArrowLeft,
  Search,
  ImageIcon,
  Mic,
  Loader2,
  Square,
  Camera,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import {
  getVoiceRecordingFilename,
  useVoiceRecorder,
} from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { ChatService } from "@/services/chat.service";
import {
  isAdminChatSessionUnread,
  markAdminChatSessionSeen,
  readAdminChatSeenMap,
  sortChatSessionsByLatestMessage,
} from "@/lib/admin-chat-unread";
import {
  AudioBubble,
  ImageBubble,
  ImagePreviewModal,
} from "@/components/chat/media-bubbles";

function StatusDot({ status }: { status: string }) {
  if (status === "AGENT_HANDLING")
    return <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />;
  if (status === "WAITING_AGENT")
    return <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />;
  return <span className="h-2 w-2 rounded-full bg-slate-500" />;
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatListTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function lastMsgPreview(msg: any): string {
  if (!msg) return "";
  if (msg.imageUrl) return "Image";
  if (msg.voiceUrl) return "Voice";
  return msg.message ?? "";
}

type ChatListFilter = "all" | "unread" | "groups";

function isGroupSession(session: any) {
  return Boolean(
    session?.isGroup ||
      session?.groupId ||
      session?.group?.id ||
      String(session?.type ?? "").toUpperCase().includes("GROUP") ||
      String(session?.chatType ?? "").toUpperCase().includes("GROUP") ||
      String(session?.sessionType ?? "").toUpperCase().includes("GROUP"),
  );
}

function AdminChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatListFilter>("all");
  const [showChat, setShowChat] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const chatShellRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [chatShellHeight, setChatShellHeight] = useState<number | null>(null);
  const { joinSession } = useSocket();
  const { isRecording, micPermission, startRecording, stopRecording } = useVoiceRecorder();

  const { data: sessionsData } = useQuery({
    queryKey: ["admin-chat-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const chatSessions = sessionsData?.data || [];
  const liveSessions = sortChatSessionsByLatestMessage(
    (selectedSession
      ? [selectedSession, ...chatSessions.filter((s: any) => s.id !== selectedSession.id)]
      : chatSessions
    ).filter((s: any) => s.status !== "CLOSED"),
  );

  const loadSession = async (sessionId: string, options?: { updateUrl?: boolean }) => {
    const res = await api.get(`/chat/agent/session/${sessionId}`);
    const session = res.data.data;
    shouldAutoScrollRef.current = true;
    scrollBehaviorRef.current = "auto";
    setSelectedSession(session);
    setMessages(session.messages || []);
    markAdminChatSessionSeen(session);
    joinSession(sessionId);
    setShowChat(true);
    if (options?.updateUrl !== false) {
      router.replace(`/admin/chat?session=${encodeURIComponent(sessionId)}`, {
        scroll: false,
      });
    }
  };

  // Restore only when the URL explicitly points at a session.
  useEffect(() => {
    if (sessionParam) {
      if (selectedSession?.id === sessionParam) return;
      loadSession(sessionParam, { updateUrl: false }).catch(() => {
        router.replace("/admin/chat", { scroll: false });
      });
      return;
    }

    setShowChat(false);
    setSelectedSession(null);
    setMessages([]);
  }, [sessionParam]);

  useEffect(() => {
    if (!selectedSession) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/agent/session/${selectedSession.id}`);
        const session = res.data.data;
        setMessages(session.messages || []);
        setSelectedSession(session);
        markAdminChatSessionSeen(session);
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSession?.id]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: scrollBehaviorRef.current,
      block: "end",
    });
    scrollBehaviorRef.current = "smooth";
  }, [messages]);

  useEffect(() => {
    const updateChatShellHeight = () => {
      const shell = chatShellRef.current;
      if (!shell) return;

      const visualViewport = window.visualViewport;
      const visibleHeight = visualViewport?.height ?? window.innerHeight;
      const visibleOffsetTop = visualViewport?.offsetTop ?? 0;
      const shellTop = shell.getBoundingClientRect().top;
      const nextHeight = Math.floor(
        visibleHeight + visibleOffsetTop - shellTop,
      );

      setChatShellHeight(Math.max(260, nextHeight));

      if (shouldAutoScrollRef.current) {
        window.requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: "auto",
            block: "end",
          });
        });
      }
    };

    updateChatShellHeight();
    window.addEventListener("resize", updateChatShellHeight);
    window.addEventListener("orientationchange", updateChatShellHeight);
    window.visualViewport?.addEventListener("resize", updateChatShellHeight);
    window.visualViewport?.addEventListener("scroll", updateChatShellHeight);

    return () => {
      window.removeEventListener("resize", updateChatShellHeight);
      window.removeEventListener("orientationchange", updateChatShellHeight);
      window.visualViewport?.removeEventListener("resize", updateChatShellHeight);
      window.visualViewport?.removeEventListener("scroll", updateChatShellHeight);
    };
  }, []);

  const handleMessagesScroll = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedSession) return;
    shouldAutoScrollRef.current = true;
    try {
      await api.post(`/chat/agent/session/${selectedSession.id}/reply`, { message: replyText });
      setReplyText("");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to send reply");
    }
  };

  const sendMedia = async (file: File | Blob, filename?: string) => {
    if (!selectedSession) return;
    shouldAutoScrollRef.current = true;
    setIsSendingMedia(true);
    try {
      const fd = new FormData();
      fd.append("file", file, filename);
      await ChatService.sendAgentMedia(selectedSession.id, fd);
    } catch {
      toast.error("Failed to send media");
    } finally {
      setIsSendingMedia(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendMedia(file, file.name);
    e.target.value = "";
  };

  const handleMicPointerDown = useCallback(
    async (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (micPermission === "unsupported") {
        toast.error("Voice recording needs HTTPS or a supported browser microphone.");
        return;
      }
      const ok = await startRecording();
      if (!ok) toast.error("Allow microphone permission from your browser settings.");
    },
    [micPermission, startRecording],
  );

  const handleMicPointerUp = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob) return;
    await sendMedia(blob, getVoiceRecordingFilename(blob));
  }, [stopRecording, selectedSession]);

  const seenMap = readAdminChatSeenMap();
  const unreadSessionsCount = liveSessions.filter((session: any) =>
    isAdminChatSessionUnread(session, seenMap),
  ).length;
  const groupSessionsCount = liveSessions.filter(isGroupSession).length;

  const sessionsToRender = liveSessions.filter((s: any) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && isAdminChatSessionUnread(s, seenMap)) ||
        (activeFilter === "groups" && isGroupSession(s));

      if (!matchesFilter) return false;
      if (!search) return true;

      const q = search.toLowerCase();
      return (
        s.user?.name?.toLowerCase().includes(q) ||
        s.user?.username?.toLowerCase().includes(q) ||
        s.user?.phone?.includes(q)
      );
    });

  const lastMsg = (session: any) => {
    const msgs = session.messages ?? [];
    return msgs[msgs.length - 1];
  };

  const isBusy = isSendingMedia || isRecording;

  return (
    <div
      ref={chatShellRef}
      className="flex h-full min-h-0 w-full overflow-hidden bg-[#f5f7fb] md:rounded-lg md:shadow-sm md:ring-1 md:ring-slate-200 dark:bg-[#020617] dark:md:ring-slate-700/70"
      style={chatShellHeight ? { height: chatShellHeight } : undefined}
    >

      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Image preview modal */}
      {previewUrl && (
        <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* ── Left: Session list ── */}
      <div
        className={cn(
          "flex min-h-0 w-full flex-col bg-white md:w-[360px] md:shrink-0 md:border-r md:border-slate-200 lg:w-[410px] dark:bg-[#0f172a] dark:md:border-slate-800",
          showChat ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between px-4 py-2 md:bg-[#f8fafc] dark:md:bg-[#111827]">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold leading-none text-[#7c3aed] md:text-xl md:text-white">
              Matka Online
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <Camera className="h-5 w-5 md:hidden" />
            <MessageCircle className="hidden h-5 w-5 md:block" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>

        <div className="shrink-0 px-3 pb-2 pt-1">
          <div className="flex h-10 items-center gap-3 rounded-full bg-slate-100 px-4 ring-1 ring-transparent focus-within:ring-violet-300 md:h-9 md:rounded-lg dark:bg-[#1e293b] dark:focus-within:ring-violet-500/50">
            <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search support chats"
              className="flex-1 bg-transparent text-[15px] text-slate-950 placeholder:text-slate-500 outline-none dark:text-white dark:placeholder:text-slate-400 md:text-sm"
            />
          </div>
        </div>

        <div className="hide-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-3 pb-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 font-semibold transition-colors md:px-4 md:py-2",
              activeFilter === "all"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 transition-colors md:px-4 md:py-2",
              activeFilter === "unread"
                ? "bg-violet-100 font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            Unread{unreadSessionsCount > 0 ? ` ${unreadSessionsCount}` : ""}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("groups")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 transition-colors md:px-4 md:py-2",
              activeFilter === "groups"
                ? "bg-violet-100 font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            Groups{groupSessionsCount > 0 ? ` ${groupSessionsCount}` : ""}
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <Plus className="h-4 w-4" />
          </span>
        </div>

        <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
          {sessionsToRender.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p className="text-xs">
                {activeFilter === "unread"
                  ? "No unread chats"
                  : activeFilter === "groups"
                    ? "No group chats"
                    : "No sessions"}
              </p>
            </div>
          ) : (
            sessionsToRender.map((session: any) => {
              const last = lastMsg(session);
              const isActive = selectedSession?.id === session.id;
              const isUnread = isAdminChatSessionUnread(session, seenMap);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors dark:border-slate-800/80 md:px-4",
                    isActive ? "bg-violet-50 dark:bg-violet-500/15" : "hover:bg-slate-50 dark:hover:bg-[#1e293b]/80",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-700 dark:bg-violet-500/25 dark:text-violet-100">
                      {session.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={session.status} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-[16px] font-semibold text-slate-950 dark:text-white">
                        {session.user?.name ?? "Unknown"}
                      </p>
                      {last?.createdAt && (
                        <span className="ml-2 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          {formatListTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      @{session.user?.username}
                    </p>
                    {last && (
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {last.role === "AGENT" ? "You: " : ""}
                        {lastMsgPreview(last)}
                      </p>
                    )}
                  </div>
                  {isUnread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                      1
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat window ── */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-[#f5f7fb] dark:bg-[#020617]",
          showChat ? "flex" : "hidden md:flex",
        )}
      >
        {!selectedSession ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f8fafc] text-slate-500 dark:bg-[#0f172a] dark:text-slate-400">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#111827]">
              <Headphones className="h-9 w-9 text-violet-500" />
            </div>
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex min-h-14 shrink-0 items-center gap-2 bg-[#f8fafc] px-2 py-2 shadow-sm dark:bg-[#111827] dark:shadow-none md:gap-3 md:px-3">
              <button
                type="button"
                className="mr-0.5 shrink-0 text-slate-500 dark:text-slate-400 md:hidden"
                onClick={() => {
                  setShowChat(false);
                  setSelectedSession(null);
                  setMessages([]);
                  router.replace("/admin/chat", { scroll: false });
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/25 dark:text-violet-100 md:h-10 md:w-10">
                  {selectedSession.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={selectedSession.status} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {selectedSession.user?.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  @{selectedSession.user?.username}
                  {selectedSession.user?.phone ? ` - ${selectedSession.user.phone}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400 md:gap-4">
                <Search className="hidden h-5 w-5 sm:block" />
                <MoreVertical className="h-5 w-5" />
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesViewportRef}
              onScroll={handleMessagesScroll}
              className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-3 sm:px-3 md:px-12 md:pb-8 lg:px-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 18px 18px, rgba(124,58,237,0.08) 1px, transparent 1.5px), radial-gradient(circle at 52px 45px, rgba(6,182,212,0.06) 1px, transparent 1.5px)",
                backgroundSize: "72px 72px",
              }}
            >
              <div className="space-y-1.5">
                {messages.length === 0 && (
                  <div className="flex min-h-[45vh] items-center justify-center text-center">
                    <div className="space-y-2 text-slate-500 dark:text-slate-400">
                      <Headphones className="mx-auto h-9 w-9 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  </div>
                )}

                {messages.map((msg: any, i: number) => {
                  const isUser = msg.role === "USER";
                  const isAgent = msg.role === "AGENT";
                  const isAI = msg.role === "AI";
                  const time = formatTime(msg.createdAt);

                  const prevMsg = messages[i - 1];
                  const showDate =
                    !prevMsg ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();

                  return (
                    <div key={msg.id ?? `${msg.originalIndex}-${msg.createdAt ?? ""}`}>
                      {showDate && msg.createdAt && (
                        <div className="my-3 flex items-center justify-center">
                          <span className="rounded-lg bg-white/90 px-3 py-1 text-xs text-slate-500 shadow-sm dark:bg-[#111827]/90 dark:text-slate-300">
                            {new Date(msg.createdAt).toLocaleDateString([], {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn("flex items-end gap-2", {
                          "justify-start": isUser || isAI,
                          "justify-end": isAgent,
                        })}
                      >
                        {(isUser || isAI) && <div className="hidden md:block md:w-7" />}

                        <div
                            className={cn("max-w-[88%] sm:max-w-[72%] lg:max-w-[60%]", {
                            "items-start": isUser || isAI,
                            "items-end": isAgent,
                          })}
                        >
                          <div
                            className={cn(
                              "relative rounded-lg px-3 py-2 text-[14px] leading-relaxed text-slate-950 shadow-sm md:text-[14.5px]",
                              {
                                "rounded-tl-sm bg-white dark:bg-[#1e293b] dark:text-slate-100": isUser,
                                "rounded-tl-sm bg-cyan-50 dark:bg-cyan-500/15 dark:text-cyan-50": isAI,
                                "rounded-tr-sm bg-violet-100 dark:bg-violet-600 dark:text-white": isAgent,
                              },
                            )}
                          >
                            {msg.imageUrl ? (
                              <ImageBubble url={msg.imageUrl} onPreview={setPreviewUrl} />
                            ) : msg.voiceUrl ? (
                              <AudioBubble url={msg.voiceUrl} />
                            ) : (
                              <>
                                {msg.message}
                                <span
                                  className={cn("ml-2 inline-block align-bottom text-[10px]", {
                                    "text-slate-500 dark:text-slate-400": isUser || isAI,
                                    "text-violet-700/70 dark:text-violet-100/70": isAgent,
                                  })}
                                >
                                  {time}
                                </span>
                              </>
                            )}
                            {(msg.imageUrl || msg.voiceUrl) && (
                              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300">{time}</p>
                            )}
                          </div>
                        </div>

                        {isAgent && <div className="hidden md:block md:w-7" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 bg-[#f8fafc] px-1.5 py-2 shadow-[0_-1px_0_rgba(148,163,184,0.18)] md:px-4 dark:bg-[#111827] dark:shadow-none">
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="mb-2 flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <span className="flex-1 text-xs font-medium text-red-400">
                        Recording... release to send
                      </span>
                      <Square className="h-3 w-3 text-red-400" />
                    </div>
                  )}
                    <div className="flex items-center gap-1.5 md:gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isBusy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 md:h-10 md:w-10 dark:text-slate-300 dark:hover:bg-violet-500/15 dark:hover:text-violet-200"
                      aria-label="Attach image"
                    >
                      {isSendingMedia ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>
                    <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/80 md:px-4 dark:bg-[#1e293b] dark:ring-slate-700/70">
                      <input
                        ref={inputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }}
                        onFocus={() => {
                          shouldAutoScrollRef.current = true;
                          const syncKeyboardViewport = () => {
                            const shell = chatShellRef.current;
                            if (shell) {
                              const visualViewport = window.visualViewport;
                              const visibleHeight = visualViewport?.height ?? window.innerHeight;
                              const visibleOffsetTop = visualViewport?.offsetTop ?? 0;
                              const shellTop = shell.getBoundingClientRect().top;
                              setChatShellHeight(
                                Math.max(260, Math.floor(visibleHeight + visibleOffsetTop - shellTop)),
                              );
                            }
                            messagesEndRef.current?.scrollIntoView({
                              behavior: "auto",
                              block: "end",
                            });
                          };
                          window.setTimeout(syncKeyboardViewport, 80);
                          window.setTimeout(syncKeyboardViewport, 320);
                        }}
                        placeholder={isRecording ? "Recording..." : "Type a message"}
                        disabled={isBusy}
                        className="flex-1 bg-transparent text-[15px] text-slate-950 placeholder:text-slate-500 outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-slate-400"
                      />
                    </div>

                    {/* Image button */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isBusy}
                      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-violet-500/15 dark:hover:text-violet-200 md:flex"
                      aria-label="Send image"
                    >
                      {isSendingMedia ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-5 w-5" />
                      )}
                    </button>

                    {/* Mic button */}
                    <button
                      type="button"
                      onPointerDown={handleMicPointerDown}
                      onPointerUp={handleMicPointerUp}
                      onPointerCancel={handleMicPointerUp}
                      disabled={isSendingMedia}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 md:h-10 md:w-10",
                        isRecording
                          ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                          : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-500/15 dark:hover:text-violet-200",
                      )}
                      aria-label="Record voice"
                    >
                      <Mic className="h-5 w-5" />
                    </button>

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={!replyText.trim() || isBusy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:opacity-40 md:h-10 md:w-10"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminChatPage() {
  return (
    <Suspense>
      <AdminChatPageInner />
    </Suspense>
  );
}
