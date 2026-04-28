/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  User,
  Bot,
  Headphones,
  MessageCircle,
  ArrowLeft,
  Search,
  ImageIcon,
  Mic,
  Loader2,
  Square,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
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
  if (msg.imageUrl) return "📷 Image";
  if (msg.voiceUrl) return "🎤 Voice";
  return msg.message ?? "";
}

function getResponderThread(role?: string): "AI" | "AGENT" | null {
  if (role === "AI") return "AI";
  if (role === "AGENT") return "AGENT";
  return null;
}

function getMessageThread(list: any[], index: number): "AI" | "AGENT" {
  const msg = list[index];
  const explicitThread = msg?.thread ?? msg?.mode;
  if (explicitThread === "AI" || explicitThread === "AGENT") return explicitThread;

  const ownResponderThread = getResponderThread(msg?.role);
  if (ownResponderThread) return ownResponderThread;

  for (let i = index + 1; i < list.length; i += 1) {
    const nextThread =
      list[i]?.thread ?? list[i]?.mode ?? getResponderThread(list[i]?.role);
    if (nextThread === "AI" || nextThread === "AGENT") return nextThread;
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    const prevThread =
      list[i]?.thread ?? list[i]?.mode ?? getResponderThread(list[i]?.role);
    if (prevThread === "AI" || prevThread === "AGENT") return prevThread;
  }

  return "AI";
}

function getAgentMessages(list: any[]) {
  return list
    .map((msg, index) => ({
      ...msg,
      originalIndex: index,
      thread: getMessageThread(list, index),
    }))
    .filter((msg) => msg.thread === "AGENT");
}

function AdminChatPageInner() {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { joinSession } = useSocket();
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();

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

  const loadSession = async (sessionId: string) => {
    const res = await api.get(`/chat/agent/session/${sessionId}`);
    const session = res.data.data;
    shouldAutoScrollRef.current = true;
    scrollBehaviorRef.current = "auto";
    setSelectedSession(session);
    setMessages(session.messages || []);
    markAdminChatSessionSeen(session);
    joinSession(sessionId);
    setShowChat(true);
    localStorage.setItem("admin_chat_session", sessionId);
  };

  // Auto-restore selected session from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem("admin_chat_session");
    if (savedId) {
      loadSession(savedId).catch(() => {
        localStorage.removeItem("admin_chat_session");
      });
    }
  }, []);

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
      const ok = await startRecording();
      if (!ok) toast.error("Microphone access denied");
    },
    [startRecording],
  );

  const handleMicPointerUp = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob) return;
    await sendMedia(blob, "voice.webm");
  }, [stopRecording, selectedSession]);

  const sessionsToRender = liveSessions.filter(
    (s: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.user?.name?.toLowerCase().includes(q) ||
        s.user?.username?.toLowerCase().includes(q) ||
        s.user?.phone?.includes(q)
      );
    },
  );

  const lastMsg = (session: any) => {
    const msgs = getAgentMessages(session.messages ?? []);
    return msgs[msgs.length - 1];
  };

  const isBusy = isSendingMedia || isRecording;
  const agentMessages = getAgentMessages(messages);

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white md:rounded-xl dark:border-slate-700/60 dark:bg-[#0b0f1e] lg:h-[calc(100dvh-5rem)]">

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
          "flex w-full flex-col border-r border-slate-200 bg-slate-50 md:w-72 lg:w-80 md:shrink-0 dark:border-slate-700/60 dark:bg-[#111827]",
          showChat ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 md:px-4 md:py-3 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-slate-950 dark:text-white">Live Chat</span>
          </div>
          <MessageCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800/80 dark:shadow-none dark:ring-0">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="rounded-lg bg-purple-600/20 py-1.5 text-center text-xs font-semibold text-purple-300">
            Chats ({liveSessions.length})
          </div>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto">
          {sessionsToRender.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p className="text-xs">No sessions</p>
            </div>
          ) : (
            sessionsToRender.map((session: any) => {
              const last = lastMsg(session);
              const isActive = selectedSession?.id === session.id;
              const isUnread = isAdminChatSessionUnread(
                session,
                readAdminChatSeenMap(),
              );
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => loadSession(session.id)}
                  className={cn(
                  "flex w-full items-center gap-2.5 border-b border-slate-200 px-3 py-2.5 text-left transition-colors md:gap-3 md:px-4 md:py-3 dark:border-slate-800/60",
                    isActive ? "bg-purple-50 dark:bg-slate-700/60" : "hover:bg-slate-100 dark:hover:bg-slate-800/50",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/20 text-sm font-bold text-purple-300 md:h-11 md:w-11">
                      {session.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={session.status} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {session.user?.name ?? "Unknown"}
                      </p>
                      {last?.createdAt && (
                        <span className="ml-2 shrink-0 text-[10px] text-slate-500">
                          {formatListTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{session.user?.username}
                    </p>
                    {last && (
                      <p className="truncate text-[11px] text-slate-500">
                        {last.role === "AGENT" ? "You: " : ""}
                        {lastMsgPreview(last)}
                      </p>
                    )}
                  </div>
                  {isUnread && (
                    <span className="shrink-0 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                      NEW
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
          "flex flex-1 flex-col",
          showChat ? "flex" : "hidden md:flex",
        )}
      >
        {!selectedSession ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60">
              <Headphones className="h-9 w-9 opacity-40" />
            </div>
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-3 py-2.5 md:gap-3 md:px-4 md:py-3 dark:border-slate-700/60 dark:bg-[#111827]">
              <button
                type="button"
                className="mr-1 shrink-0 text-slate-500 dark:text-slate-400 md:hidden"
                onClick={() => { setShowChat(false); }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/25 text-sm font-bold text-purple-300 md:h-10 md:w-10">
                  {selectedSession.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={selectedSession.status} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                  {selectedSession.user?.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  @{selectedSession.user?.username}
                  {selectedSession.user?.phone ? ` · ${selectedSession.user.phone}` : ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesViewportRef}
              onScroll={handleMessagesScroll}
              className="hide-scrollbar flex-1 overflow-y-auto px-3 py-2.5 md:px-4 md:py-3"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, rgba(168,85,247,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.03) 0%, transparent 50%)",
              }}
            >
              <div className="space-y-1.5">
                {agentMessages.length === 0 && (
                  <div className="flex min-h-[45vh] items-center justify-center text-center">
                    <div className="space-y-2 text-slate-500">
                      <Headphones className="mx-auto h-9 w-9 opacity-40" />
                      <p className="text-sm text-slate-600 dark:text-slate-300">No agent messages yet</p>
                    </div>
                  </div>
                )}

                {agentMessages.map((msg: any, i: number) => {
                  const isUser = msg.role === "USER";
                  const isAgent = msg.role === "AGENT";
                  const isAI = msg.role === "AI";
                  const time = formatTime(msg.createdAt);

                  const prevMsg = agentMessages[i - 1];
                  const showDate =
                    !prevMsg ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();

                  return (
                    <div key={msg.id ?? `${msg.originalIndex}-${msg.createdAt ?? ""}`}>
                      {showDate && msg.createdAt && (
                        <div className="my-3 flex items-center justify-center">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
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
                        {(isUser || isAI) && (
                          <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                            {isUser ? (
                              <User className="h-3.5 w-3.5 text-purple-300" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-blue-300" />
                            )}
                          </div>
                        )}

                        <div
                          className={cn("max-w-[78%] sm:max-w-[66%] lg:max-w-[60%]", {
                            "items-start": isUser || isAI,
                            "items-end": isAgent,
                          })}
                        >
                          <div
                            className={cn(
                              "relative rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-md md:px-3.5 md:py-2.5 md:text-sm",
                              {
                                "rounded-bl-sm bg-slate-200 !text-black shadow-slate-300/70 dark:bg-[#1e2a3a] dark:!text-slate-100 dark:shadow-black/20": isUser,
                                "rounded-bl-sm bg-blue-100 !text-black shadow-blue-200/70 dark:bg-[#1a2540] dark:!text-blue-100 dark:shadow-black/20": isAI,
                                "rounded-br-sm bg-emerald-200 !text-black shadow-emerald-200/70 dark:bg-[#1a3a2a] dark:!text-emerald-50 dark:shadow-black/20": isAgent,
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
                                    "!text-black/80 dark:!text-slate-500": isUser || isAI,
                                    "!text-black/80 dark:!text-emerald-600/70": isAgent,
                                  })}
                                >
                                  {time}
                                </span>
                              </>
                            )}
                            {(msg.imageUrl || msg.voiceUrl) && (
                              <p className="mt-1 text-[10px] !text-black/80 dark:!text-white/40">{time}</p>
                            )}
                          </div>
                        </div>

                        {isAgent && (
                          <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700/30">
                            <Headphones className="h-3.5 w-3.5 text-emerald-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 md:px-4 md:py-3 dark:border-slate-700/60 dark:bg-[#111827]">
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="mb-2 flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1.5">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <span className="flex-1 text-xs font-medium text-red-400">
                        Recording… release to send
                      </span>
                      <Square className="h-3 w-3 text-red-400" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200 md:px-4 md:py-2 dark:bg-slate-800 dark:shadow-none dark:ring-0">
                      <input
                        ref={inputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }}
                        placeholder={isRecording ? "Recording…" : "Type a message..."}
                        disabled={isBusy}
                        className="flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-50 dark:text-white dark:placeholder:text-slate-500 md:text-sm"
                      />
                    </div>

                    {/* Image button */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isBusy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:shadow-none dark:ring-0 dark:hover:bg-slate-600 dark:hover:text-white md:h-10 md:w-10"
                      aria-label="Send image"
                    >
                      {isSendingMedia ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
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
                          : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-700 dark:text-slate-300 dark:shadow-none dark:ring-0 dark:hover:bg-slate-600 dark:hover:text-white",
                      )}
                      aria-label="Record voice"
                    >
                      <Mic className="h-4 w-4" />
                    </button>

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={!replyText.trim() || isBusy}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-40 md:h-10 md:w-10"
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
