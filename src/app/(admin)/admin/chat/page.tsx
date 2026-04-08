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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { ChatService } from "@/services/chat.service";

export default function AdminChatPage() {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState<"live" | "closed">("live");
  const [closedSessions, setClosedSessions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { joinSession } = useSocket();

  // Waiting sessions
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
    ? [
        selectedSession,
        ...waitingSessions.filter((s: any) => s.id !== selectedSession.id),
      ].filter((s: any) => s.status !== "CLOSED")
    : waitingSessions;

  const syncClosedSession = (session: any) => {
    if (!session || session.status !== "CLOSED") return;
    setClosedSessions((prev) => {
      const withoutCurrent = prev.filter((s) => s.id !== session.id);
      return [session, ...withoutCurrent];
    });
  };

  // Take session
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
    onError: () => {
      toast.error("Failed to close session");
    },
  });

  // Load session messages
  const loadSession = async (sessionId: string) => {
    const res = await api.get(`/chat/agent/session/${sessionId}`);
    const session = res.data.data;
    setSelectedSession(session);
    setMessages(session.messages || []);
    setActiveTab(session.status === "CLOSED" ? "closed" : "live");
    syncClosedSession(session);
    joinSession(sessionId);
  };

  // Socket listener
  // selectedSession 3 messages refresh
  useEffect(() => {
    if (!selectedSession) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/agent/session/${selectedSession.id}`);
        const session = res.data.data;
        setMessages(session.messages || []);

        // session status ও update করো
        setSelectedSession(session);
        syncClosedSession(session);
      } catch {
        // silent fail
      }
    }, 3000); //

    return () => clearInterval(interval);
  }, [selectedSession?.id]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send reply
  const handleReply = async () => {
    if (!replyText.trim() || !selectedSession) return;
    try {
      await api.post(`/chat/agent/session/${selectedSession.id}/reply`, {
        message: replyText,
      });
      setReplyText("");
    } catch {
      toast.error("Failed to send reply");
    }
  };

  const sessionsToRender = activeTab === "live" ? liveSessions : closedSessions;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Sessions List */}
      <div className="w-80 flex-shrink-0">
        <Card className="h-full overflow-hidden border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Headphones className="h-4 w-4 text-purple-400" />
              Admin Chat
              <Badge
                className={cn("ml-auto", {
                  "bg-red-500/20 text-red-400": activeTab === "live",
                  "bg-slate-500/20 text-slate-300": activeTab === "closed",
                })}
              >
                {sessionsToRender.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  activeTab === "live"
                    ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                    : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white",
                )}
              >
                Live Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("closed")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  activeTab === "closed"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white",
                )}
              >
                Closed
              </button>
            </div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {sessionsToRender.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  {activeTab === "live"
                    ? "No live sessions"
                    : "No closed sessions"}
                </p>
              ) : (
                <div className="space-y-2">
                  {sessionsToRender.map((session: any) => (
                    <div
                      key={session.id}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 transition-all",
                        selectedSession?.id === session.id
                          ? "border-purple-500 bg-purple-500/10 shadow-[0_10px_24px_rgba(168,85,247,0.12)]"
                          : "border-slate-600 bg-slate-700/50 hover:border-slate-500 hover:bg-slate-700/70",
                      )}
                      onClick={() => loadSession(session.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-medium">
                          {session.user?.name}
                        </p>
                        <Badge
                          className={cn("text-[10px]", {
                            "bg-yellow-500/20 text-yellow-400":
                              session.status === "WAITING_AGENT",
                            "bg-green-500/20 text-green-400":
                              session.status === "AGENT_HANDLING",
                            "bg-slate-500/20 text-slate-300":
                              session.status === "CLOSED",
                          })}
                        >
                          {session.status === "WAITING_AGENT"
                            ? "Waiting"
                            : session.status === "CLOSED"
                              ? "Closed"
                              : "Live"}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs">
                        @{session.user?.username}
                      </p>
                      {session.messages?.[0] && (
                        <p className="text-slate-500 text-xs mt-1 truncate">
                          {session.messages[0].message}
                        </p>
                      )}
                      {activeTab === "live" &&
                        session.status === "WAITING_AGENT" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            takeSession(session.id);
                          }}
                          className="w-full mt-2 h-7 text-xs bg-purple-600 hover:bg-purple-700"
                        >
                          Take Session
                        </Button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {!selectedSession ? (
          <Card className="flex-1 bg-slate-800/50 border-slate-700 flex items-center justify-center">
            <div className="text-center">
              <Headphones className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select a session to start</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Header */}
            <Card className="rounded-b-none border-slate-700 bg-slate-800/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-600/20 text-purple-400 text-xs">
                      {selectedSession.user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {selectedSession.user?.name}
                    </p>
                    <p className="text-slate-400 text-xs">
                      @{selectedSession.user?.username} •{" "}
                      {selectedSession.user?.phone}
                    </p>
                  </div>
                  <Badge
                    className={cn("ml-auto text-xs", {
                      "bg-yellow-500/20 text-yellow-400":
                        selectedSession.status === "WAITING_AGENT",
                      "bg-green-500/20 text-green-400":
                        selectedSession.status === "AGENT_HANDLING",
                      "bg-slate-500/20 text-slate-300":
                        selectedSession.status === "CLOSED",
                    })}
                  >
                    {selectedSession.status}
                  </Badge>
                  {selectedSession.status !== "CLOSED" && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isClosing}
                      onClick={() => closeSession(selectedSession.id)}
                      className="border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Close Session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <div className="flex-1 border-x border-slate-700 bg-slate-900/50">
              <ScrollArea className="h-full px-4 py-4">
                <div className="space-y-3">
                  {messages.map((msg: any, i: number) => {
                    const isUser = msg.role === "USER";
                    const isAgent = msg.role === "AGENT";
                    const timeLabel = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    return (
                      <div
                        key={i}
                        className={cn("flex gap-2", {
                          "justify-start": isUser || msg.role === "AI",
                          "justify-end": isAgent,
                        })}
                      >
                        {(isUser || msg.role === "AI") && (
                          <Avatar className="mt-1 h-7 w-7 flex-shrink-0">
                            <AvatarFallback
                              className={cn("text-[10px]", {
                                "bg-purple-600/20 text-purple-300": isUser,
                                "bg-slate-700 text-blue-400":
                                  msg.role === "AI",
                              })}
                            >
                              {isUser ? (
                                <User className="h-3.5 w-3.5" />
                              ) : (
                                <Bot className="h-3.5 w-3.5" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={cn("max-w-[78%] space-y-1", {
                            "items-start": isUser || msg.role === "AI",
                            "items-end text-right": isAgent,
                          })}
                        >
                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                              {
                                "rounded-tl-sm border border-purple-500/20 bg-slate-800 text-slate-100":
                                  isUser,
                                "rounded-tl-sm border border-blue-500/20 bg-blue-500/10 text-blue-50":
                                  msg.role === "AI",
                                "rounded-tr-sm border border-green-500/25 bg-green-600/20 text-white":
                                  isAgent,
                              },
                            )}
                          >
                            {msg.message}
                          </div>
                          {timeLabel && (
                            <p className="px-1 text-[10px] text-slate-500">
                              {timeLabel}
                            </p>
                          )}
                        </div>

                        {isAgent && (
                          <Avatar className="mt-1 h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="bg-green-600/20 text-[10px] text-green-300">
                              <Headphones className="h-3.5 w-3.5" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Reply Input */}
            <div className="rounded-b-lg border border-slate-700 bg-slate-800/50 p-3">
              {selectedSession.status === "AGENT_HANDLING" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
                    <MessageCircle className="ml-1 h-4 w-4 text-slate-500" />
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleReply();
                      }}
                      placeholder="Type your reply..."
                      className="flex-1 border-0 bg-transparent text-white shadow-none focus-visible:ring-0"
                    />
                    <Button
                      onClick={handleReply}
                      size="icon"
                      className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    User messages appear on the left. Your replies appear on the
                    right.
                  </p>
                </div>
              ) : selectedSession.status === "CLOSED" ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                  This session is closed. Open a live session to continue
                  chatting.
                </div>
              ) : (
                <Button
                  onClick={() => takeSession(selectedSession.id)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Headphones className="mr-2 h-4 w-4" />
                  Take This Session
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
