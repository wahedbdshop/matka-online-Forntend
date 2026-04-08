/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Bot,
  Headphones,
  X,
  ChevronLeft,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatService } from "@/services/chat.service";
import { useAuthStore } from "@/store/auth.store";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "USER" | "AI" | "AGENT";
  message: string;
  createdAt?: string;
  isLoading?: boolean;
}

const hasRecentDuplicate = (
  list: Message[],
  incoming: Pick<Message, "role" | "message">,
) =>
  list.some((msg) => {
    if (msg.isLoading) return false;
    if (msg.role !== incoming.role || msg.message !== incoming.message) {
      return false;
    }
    if (!msg.createdAt) return true;
    return Date.now() - new Date(msg.createdAt).getTime() < 10000;
  });

const isUnavailableAiMessage = (message?: string) =>
  !!message &&
  /temporarily unavailable|request a live agent|try again later/i.test(message);

const getDisplayMessage = (message?: string) => {
  if (!message) return "";

  if (isUnavailableAiMessage(message)) {
    return "AI support is temporarily unavailable right now. Please try again later or request a live agent for help.";
  }

  return message;
};

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [agentIdentifier, setAgentIdentifier] = useState("");
  const [sessionStatus, setSessionStatus] = useState("AI_HANDLING");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, joinSession, onNewMessage, onAgentJoined } = useSocket();

  // Start session
  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: ChatService.startSession,
    onSuccess: (data) => {
      const session = data.data;
      setSessionId(session.id);
      setSessionStatus(session.status);

      // existing messages load
      if (session.messages?.length > 0) {
        setMessages(session.messages);
      } else {
        // welcome message
        setMessages([
          {
            role: "AI",
            message:
              "Hello! I'm your AI assistant. How can I help you today? 😊",
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      joinSession(session.id);
    },
    onError: () => {
      toast.error("Failed to start chat session");
    },
  });

  // Request agent
  const { mutate: requestAgent, isPending: isRequestingAgent } = useMutation({
    mutationFn: ({
      sessionId,
      identifier,
    }: {
      sessionId: string;
      identifier: string;
    }) => ChatService.requestAgent(sessionId, identifier),
    onSuccess: () => {
      setShowAgentDialog(false);
      setSessionStatus("WAITING_AGENT");
      toast.success("Agent request sent. Please wait.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to request agent");
    },
  });

  // Close session
  const { mutate: closeSession } = useMutation({
    mutationFn: () => ChatService.closeSession(sessionId!),
    onSuccess: () => {
      setSessionStatus("CLOSED");
      toast.success("Chat session closed");
    },
  });

  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => ChatService.getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: sessionId && sessionStatus !== "CLOSED" ? 3000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const session = sessionData?.data;
    if (!session) return;

    setSessionStatus(session.status);

    if (session.messages?.length > 0) {
      setMessages((prev) => {
        const dedupedMessages = session.messages.filter(
          (msg: Message, index: number, arr: Message[]) =>
            !arr.slice(0, index).some(
              (existing: Message) =>
                existing.role === msg.role &&
                existing.message === msg.message &&
                (existing.createdAt ?? "") === (msg.createdAt ?? ""),
            ),
        );
        const lastLocalMessage = prev[prev.length - 1];
        const hasLoading = prev.some((msg) => msg.isLoading);
        const sameLength = dedupedMessages.length === prev.length;

        if (!hasLoading && sameLength && lastLocalMessage?.message) {
          return prev;
        }

        setIsSending(false);
        return dedupedMessages;
      });
    }
  }, [sessionData]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start session on mount
  useEffect(() => {
    startSession();
    // `mutate` identity can vary between renders; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join session once socket is actually connected
  useEffect(() => {
    if (!sessionId || !isConnected) return;
    joinSession(sessionId);
  }, [sessionId, isConnected, joinSession]);

  // Socket listeners
  useEffect(() => {
    if (!sessionId) return;

    const unsubMessage = onNewMessage((data: Message) => {
      setIsSending(false);
      setMessages((prev) => {
        // loading message remove করুন
        const filtered = prev.filter((m) => !m.isLoading);
        if (hasRecentDuplicate(filtered, data)) {
          return filtered;
        }
        return [...filtered, { ...data, createdAt: new Date().toISOString() }];
      });
    });

    const unsubAgent = onAgentJoined((data: any) => {
      setSessionStatus("AGENT_HANDLING");
      setMessages((prev) => [
        ...prev,
        {
          role: "AGENT",
          message: data.message,
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success("An agent has joined the chat!");
    });

    return () => {
      unsubMessage();
      unsubAgent();
    };
  }, [sessionId, onAgentJoined, onNewMessage]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;

    const messageText = inputMessage.trim();

    const userMessage: Message = {
      role: "USER",
      message: messageText,
      createdAt: new Date().toISOString(),
    };

    // optimistic update
    setMessages((prev) => [...prev, userMessage]);

    if (sessionStatus === "AI_HANDLING") {
      // AI loading indicator
      setMessages((prev) => [
        ...prev,
        {
          role: "AI",
          message: "",
          isLoading: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setIsSending(true);

    try {
      await ChatService.sendMessage(sessionId, messageText);
      setInputMessage("");
      setTimeout(() => {
        void refetchSession();
      }, 600);
    } catch (error: any) {
      setIsSending(false);
      setMessages((prev) =>
        prev.filter((m) => !m.isLoading && m.createdAt !== userMessage.createdAt),
      );
      console.error("Chat send failed:", error?.response?.data || error);
      toast.error(error?.response?.data?.message || "Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRequestAgent = () => {
    if (!agentIdentifier.trim()) {
      toast.error("Please enter your email or username");
      return;
    }
    requestAgent({ sessionId: sessionId!, identifier: agentIdentifier });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "AI":
        return (
          <Badge className="text-[10px] bg-blue-500/20 text-blue-400">AI</Badge>
        );
      case "AGENT":
        return (
          <Badge className="text-[10px] bg-green-500/20 text-green-400">
            Agent
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusInfo = () => {
    switch (sessionStatus) {
      case "AI_HANDLING":
        return { label: "AI Support", color: "bg-blue-500/20 text-blue-400" };
      case "WAITING_AGENT":
        return {
          label: "Waiting for Agent",
          color: "bg-yellow-500/20 text-yellow-400",
        };
      case "AGENT_HANDLING":
        return {
          label: "Live Agent",
          color: "bg-green-500/20 text-green-400",
        };
      case "CLOSED":
        return { label: "Closed", color: "bg-slate-500/20 text-slate-400" };
      default:
        return { label: "Support", color: "bg-purple-500/20 text-purple-400" };
    }
  };

  const statusInfo = getStatusInfo();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 px-1.5 text-slate-300 hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Chat Header */}
      <Card className="bg-slate-800/50 border-slate-700 rounded-b-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-9 w-9 border border-slate-600">
                  <AvatarFallback
                    className={cn("text-sm", {
                      "bg-blue-600/20": sessionStatus === "AI_HANDLING",
                      "bg-green-600/20": sessionStatus === "AGENT_HANDLING",
                      "bg-yellow-600/20": sessionStatus === "WAITING_AGENT",
                    })}
                  >
                    {sessionStatus === "AGENT_HANDLING" ? (
                      <Headphones className="h-4 w-4 text-green-400" />
                    ) : (
                      <Bot className="h-4 w-4 text-blue-400" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800",
                    isConnected ? "bg-green-500" : "bg-red-500",
                  )}
                />
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {sessionStatus === "AGENT_HANDLING"
                    ? "Live Agent"
                    : "AI Assistant"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("text-[10px]", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-400" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {sessionStatus === "AI_HANDLING" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAgentDialog(true)}
                  className="text-purple-400 hover:text-purple-300 text-xs h-8"
                >
                  <Headphones className="mr-1 h-3.5 w-3.5" />
                  Live Agent
                </Button>
              )}
              {sessionStatus !== "CLOSED" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closeSession()}
                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 px-4 py-4 space-y-4">
        {isStarting ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
              {messages.map((msg, index) => (
              <div
                key={index}
                className={cn("flex gap-2", {
                  "justify-end": msg.role === "USER",
                  "justify-start": msg.role !== "USER",
                })}
              >
                {/* Avatar for AI/Agent */}
                {msg.role !== "USER" && (
                  <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                    <AvatarFallback
                      className={cn("text-xs", {
                        "bg-blue-600/20": msg.role === "AI",
                        "bg-green-600/20": msg.role === "AGENT",
                      })}
                    >
                      {msg.role === "AI" ? (
                        <Bot className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <Headphones className="h-3.5 w-3.5 text-green-400" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn("max-w-[75%] space-y-1", {
                    "items-end": msg.role === "USER",
                  })}
                >
                  {/* Role badge */}
                  {msg.role !== "USER" && (
                    <div className="flex items-center gap-1 px-1">
                      {getRoleBadge(msg.role)}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn("rounded-2xl px-4 py-2.5", {
                      "bg-purple-600 text-white rounded-tr-sm":
                        msg.role === "USER",
                      "bg-slate-700 text-slate-100 rounded-tl-sm":
                        msg.role === "AI" &&
                        !isUnavailableAiMessage(msg.message),
                      "rounded-tl-sm border border-amber-500/30 bg-amber-500/10 text-amber-100":
                        msg.role === "AI" &&
                        isUnavailableAiMessage(msg.message),
                      "bg-green-600/20 text-white border border-green-500/30 rounded-tl-sm":
                        msg.role === "AGENT",
                    })}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {msg.role === "AI" &&
                          isUnavailableAiMessage(msg.message) && (
                            <div className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                              AI Unavailable
                            </div>
                          )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {getDisplayMessage(msg.message)}
                        </p>
                        {msg.role === "AI" &&
                          isUnavailableAiMessage(msg.message) &&
                          sessionStatus !== "WAITING_AGENT" &&
                          sessionStatus !== "AGENT_HANDLING" &&
                          sessionStatus !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={() => setShowAgentDialog(true)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/15"
                            >
                              <Headphones className="h-3.5 w-3.5" />
                              Request Live Agent
                            </button>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  {msg.createdAt && !msg.isLoading && (
                    <p
                      className={cn("text-[10px] text-slate-500 px-1", {
                        "text-right": msg.role === "USER",
                      })}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                {/* Avatar for User */}
                {msg.role === "USER" && (
                  <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-purple-600/20 text-xs text-purple-400">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Waiting for agent */}
            {sessionStatus === "WAITING_AGENT" && (
              <div className="flex justify-center">
                <Badge className="bg-yellow-500/20 text-yellow-400 animate-pulse">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Waiting for agent...
                </Badge>
              </div>
            )}

            {/* Session closed */}
            {sessionStatus === "CLOSED" && (
              <div className="flex justify-center">
                <Badge className="bg-slate-500/20 text-slate-400">
                  Session ended
                </Badge>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-slate-800/50 border-t border-slate-700 p-3">
        {sessionStatus === "CLOSED" ? (
          <Button
            onClick={() => startSession()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Start New Chat
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                sessionStatus === "WAITING_AGENT"
                  ? "Waiting for agent..."
                  : "Type a message..."
              }
              disabled={isSending || sessionStatus === "WAITING_AGENT"}
              className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={handleSend}
              disabled={
                !inputMessage.trim() ||
                isSending ||
                sessionStatus === "WAITING_AGENT"
              }
              size="icon"
              className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Quick replies */}
        {sessionStatus === "AI_HANDLING" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "How to deposit?",
              "How to withdraw?",
              "How to create an account?",
              "How does referral bonus work?",
              "How to play games?",
            ].map((quick) => (
              <button
                key={quick}
                onClick={() => setInputMessage(quick)}
                className="text-xs text-purple-400 border border-purple-500/30 rounded-full px-3 py-1 hover:bg-purple-500/10 transition-colors"
              >
                {quick}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agent Request Dialog */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Headphones className="h-5 w-5 text-purple-400" />
              Talk to Live Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Please provide your email or username so the agent can identify you.
            </p>
            <div className="space-y-2">
              <label className="text-slate-300 text-sm">
                Email or Username
              </label>
              <Input
                value={agentIdentifier}
                onChange={(e) => setAgentIdentifier(e.target.value)}
                placeholder="your@email.com or your_username"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowAgentDialog(false)}
                className="flex-1 border border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestAgent}
                disabled={isRequestingAgent}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isRequestingAgent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  "Request Agent"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
