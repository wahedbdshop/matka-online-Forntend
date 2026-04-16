/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  User,
  Bot,
  Headphones,
  MessageCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
} from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { ChatService } from "@/services/chat.service";

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

export default function AdminChatPage() {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState<"live" | "closed">("live");
  const [closedSessions, setClosedSessions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false); // mobile: show chat panel
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { joinSession } = useSocket();

  const { data: sessionsData, refetch } = useQuery({
    queryKey: ["waiting-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const waitingSessions = sessionsData?.data || [];
  const liveSessions = selectedSession
    ? [selectedSession, ...waitingSessions.filter((s: any) => s.id !== selectedSession.id)].filter(
        (s: any) => s.status !== "CLOSED",
      )
    : waitingSessions;

  const syncClosedSession = (session: any) => {
    if (!session || session.status !== "CLOSED") return;
    setClosedSessions((prev) => {
      const withoutCurrent = prev.filter((s) => s.id !== session.id);
      return [session, ...withoutCurrent];
    });
  };

  const { mutate: takeSession } = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.patch(`/chat/agent/session/${sessionId}/take`);
      return res.data;
    },
    onSuccess: (_, sessionId) => {
      toast.success("Session taken!");
      setActiveTab("live");
      refetch();
      loadSession(sessionId);
    },
  });

  const { mutate: closeSession, isPending: isClosing } = useMutation({
    mutationFn: async (sessionId: string) => ChatService.closeSession(sessionId),
    onSuccess: (_, sessionId) => {
      toast.success("Session closed");
      setSelectedSession((prev: any) => {
        if (!prev || prev.id !== sessionId) return prev;
        const next = { ...prev, status: "CLOSED" };
        syncClosedSession(next);
        return next;
      });
      setActiveTab("closed");
      refetch();
    },
    onError: () => toast.error("Failed to close session"),
  });

  const loadSession = async (sessionId: string) => {
    const res = await api.get(`/chat/agent/session/${sessionId}`);
    const session = res.data.data;
    setSelectedSession(session);
    setMessages(session.messages || []);
    setActiveTab(session.status === "CLOSED" ? "closed" : "live");
    syncClosedSession(session);
    joinSession(sessionId);
    setShowChat(true);
  };

  useEffect(() => {
    if (!selectedSession) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/agent/session/${selectedSession.id}`);
        const session = res.data.data;
        setMessages(session.messages || []);
        setSelectedSession(session);
        syncClosedSession(session);
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSession?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedSession) return;
    try {
      await api.post(`/chat/agent/session/${selectedSession.id}/reply`, { message: replyText });
      setReplyText("");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to send reply");
    }
  };

  const sessionsToRender = (activeTab === "live" ? liveSessions : closedSessions).filter(
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
    const msgs = session.messages ?? [];
    return msgs[msgs.length - 1];
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-700/60 bg-[#0b0f1e]">

      {/* ── Left: Session list ── */}
      <div
        className={cn(
          "flex w-full flex-col border-r border-slate-700/60 bg-[#111827] md:w-80 md:flex-shrink-0",
          showChat ? "hidden md:flex" : "flex",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-white">Live Chat</span>
          </div>
          <MessageCircle className="h-5 w-5 text-slate-400" />
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 px-3 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={cn(
              "rounded-lg py-1.5 text-xs font-semibold transition-colors",
              activeTab === "live"
                ? "bg-purple-600/20 text-purple-300"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            Live ({liveSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("closed")}
            className={cn(
              "rounded-lg py-1.5 text-xs font-semibold transition-colors",
              activeTab === "closed"
                ? "bg-emerald-600/15 text-emerald-300"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            Closed ({closedSessions.length})
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {sessionsToRender.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p className="text-xs">No sessions</p>
            </div>
          ) : (
            sessionsToRender.map((session: any) => {
              const last = lastMsg(session);
              const isActive = selectedSession?.id === session.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-slate-800/60 px-4 py-3 text-left transition-colors",
                    isActive ? "bg-slate-700/60" : "hover:bg-slate-800/50",
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-600/20 text-sm font-bold text-purple-300">
                      {session.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={session.status} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-white">
                        {session.user?.name ?? "Unknown"}
                      </p>
                      {last?.createdAt && (
                        <span className="ml-2 flex-shrink-0 text-[10px] text-slate-500">
                          {formatListTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-400">
                      @{session.user?.username}
                    </p>
                    {last && (
                      <p className="truncate text-[11px] text-slate-500">
                        {last.role === "AGENT" ? "You: " : ""}
                        {last.message}
                      </p>
                    )}
                  </div>
                  {session.status === "WAITING_AGENT" && (
                    <span className="flex-shrink-0 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/60">
              <Headphones className="h-9 w-9 opacity-40" />
            </div>
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-slate-700/60 bg-[#111827] px-4 py-3">
              {/* Back button — mobile only */}
              <button
                type="button"
                className="mr-1 flex-shrink-0 text-slate-400 md:hidden"
                onClick={() => { setShowChat(false); }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/25 text-sm font-bold text-purple-300">
                  {selectedSession.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={selectedSession.status} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {selectedSession.user?.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  @{selectedSession.user?.username}
                  {selectedSession.user?.phone ? ` · ${selectedSession.user.phone}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedSession.status !== "CLOSED" && (
                  <button
                    type="button"
                    disabled={isClosing}
                    onClick={() => closeSession(selectedSession.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                )}
                {selectedSession.status === "CLOSED" && (
                  <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                    CLOSED
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, rgba(168,85,247,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.03) 0%, transparent 50%)",
              }}
            >
              <div className="space-y-1.5">
                {messages.map((msg: any, i: number) => {
                  const isUser = msg.role === "USER";
                  const isAgent = msg.role === "AGENT";
                  const isAI = msg.role === "AI";
                  const time = formatTime(msg.createdAt);

                  // Date separator
                  const prevMsg = messages[i - 1];
                  const showDate =
                    !prevMsg ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();

                  return (
                    <div key={i}>
                      {showDate && msg.createdAt && (
                        <div className="my-3 flex items-center justify-center">
                          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[10px] text-slate-400">
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
                        {/* Avatar left */}
                        {(isUser || isAI) && (
                          <div className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-700">
                            {isUser ? (
                              <User className="h-3.5 w-3.5 text-purple-300" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-blue-300" />
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn("max-w-[72%] sm:max-w-[60%]", {
                            "items-start": isUser || isAI,
                            "items-end": isAgent,
                          })}
                        >
                          <div
                            className={cn(
                              "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-md",
                              {
                                "rounded-bl-sm bg-[#1e2a3a] text-slate-100": isUser,
                                "rounded-bl-sm bg-[#1a2540] text-blue-100": isAI,
                                "rounded-br-sm bg-[#1a3a2a] text-emerald-50": isAgent,
                              },
                            )}
                          >
                            {msg.message}
                            <span
                              className={cn("ml-2 inline-block align-bottom text-[10px]", {
                                "text-slate-500": isUser || isAI,
                                "text-emerald-600/70": isAgent,
                              })}
                            >
                              {time}
                            </span>
                          </div>
                        </div>

                        {/* Avatar right */}
                        {isAgent && (
                          <div className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700/30">
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
            <div className="border-t border-slate-700/60 bg-[#111827] px-4 py-3">
              {selectedSession.status === "AGENT_HANDLING" ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
                    <input
                      ref={inputRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              ) : selectedSession.status === "WAITING_AGENT" ? (
                <button
                  type="button"
                  onClick={() => takeSession(selectedSession.id)}
                  className="w-full rounded-full bg-purple-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700"
                >
                  <Headphones className="mr-2 inline h-4 w-4" />
                  Take This Session
                </button>
              ) : (
                <div className="rounded-full bg-slate-800/60 px-4 py-2.5 text-center text-xs text-slate-500">
                  This session is closed
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
