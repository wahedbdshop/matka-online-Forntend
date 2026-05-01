/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Bot,
  Headphones,
  ChevronLeft,
  Loader2,
  Wifi,
  WifiOff,
  ImageIcon,
  Mic,
  Square,
  MicOff,
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
import {
  getVoiceRecordingFilename,
  useVoiceRecorder,
} from "@/hooks/use-voice-recorder";
import { cn } from "@/lib/utils";
import {
  AudioBubble,
  ImageBubble,
  ImagePreviewModal,
} from "@/components/chat/media-bubbles";
import {
  CHAT_SESSION_KEY,
  getAgentMessageCount,
  markChatAgentMessagesSeen,
} from "@/lib/chat-unread";

interface Message {
  id?: string;
  role: "USER" | "AI" | "AGENT";
  message: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  createdAt?: string;
  isLoading?: boolean;
  mode?: SupportMode;
  thread?: SupportMode;
}

type SupportMode = "AI" | "AGENT";
type ThreadMessage = Message & { thread: SupportMode; originalIndex: number };

const hasRecentDuplicate = (
  list: Message[],
  incoming: Pick<Message, "role" | "message" | "imageUrl" | "voiceUrl">,
) =>
  list.some((msg) => {
    if (msg.isLoading) return false;
    if (incoming.imageUrl || incoming.voiceUrl) return false;
    if (msg.role !== incoming.role || msg.message !== incoming.message) return false;
    if (!msg.createdAt) return true;
    return Date.now() - new Date(msg.createdAt).getTime() < 10000;
  });

const isUnavailableAiMessage = (message?: string | null) =>
  !!message &&
  /temporarily unavailable|request a live agent|try again later/i.test(message);

const getDisplayMessage = (message?: string | null) => {
  if (!message) return "";
  if (isUnavailableAiMessage(message)) {
    return "AI support is temporarily unavailable right now. Please try again later or request a live agent for help.";
  }
  return message;
};

const createAiGreeting = (): Message => ({
  role: "AI",
  message: "Hello! I'm your AI assistant. How can I help you today?",
  thread: "AI",
  createdAt: new Date().toISOString(),
});

const ensureAiGreeting = (list: Message[]): Message[] => {
  const hasAiThread = list.some(
    (msg) => msg.thread === "AI" || msg.mode === "AI" || msg.role === "AI",
  );
  return hasAiThread ? list : [createAiGreeting(), ...list];
};

const getAiAutoReply = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("deposit")) {
    return "To deposit, go to Deposit, choose your payment method, enter the amount, and submit the transaction details. Your balance will update after approval.";
  }

  if (normalized.includes("withdraw")) {
    return "To withdraw, go to Withdraw, select your account, enter the amount, and submit the request. Please make sure your withdrawal details are correct.";
  }

  if (normalized.includes("account") || normalized.includes("register")) {
    return "To create an account, open Register, fill in your details, verify if required, then login with your username and password.";
  }

  if (normalized.includes("referral")) {
    return "Referral bonus details are available from the Referral page. Share your referral link/code and follow the bonus rules shown there.";
  }

  if (normalized.includes("play") || normalized.includes("game")) {
    return "To play, open Games or your selected lottery page, choose the game type, enter your numbers and amount, then submit before the game closes.";
  }

  return "I got your message. Please choose a quick question below or type what you need help with, and I will guide you.";
};

const getResponderThread = (role: Message["role"]): SupportMode | null => {
  if (role === "AI") return "AI";
  if (role === "AGENT") return "AGENT";
  return null;
};

const getMessageThread = (
  list: Message[],
  index: number,
  fallback: SupportMode,
): SupportMode => {
  const msg = list[index];
  const explicitThread = msg.thread ?? msg.mode;
  if (explicitThread === "AI" || explicitThread === "AGENT") return explicitThread;

  const ownResponderThread = getResponderThread(msg.role);
  if (ownResponderThread) return ownResponderThread;

  for (let i = index + 1; i < list.length; i += 1) {
    const nextThread = list[i].thread ?? list[i].mode ?? getResponderThread(list[i].role);
    if (nextThread === "AI" || nextThread === "AGENT") return nextThread;
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    const prevThread = list[i].thread ?? list[i].mode ?? getResponderThread(list[i].role);
    if (prevThread === "AI" || prevThread === "AGENT") return prevThread;
  }

  return fallback;
};

const getThreadMessages = (
  list: Message[],
  thread: SupportMode,
  fallback: SupportMode,
): ThreadMessage[] =>
  list
    .map((msg, index) => ({
      ...msg,
      thread: getMessageThread(list, index, fallback),
      originalIndex: index,
    }))
    .filter((msg) => msg.thread === thread);

const applyThreadHints = (
  incoming: Message[],
  previous: Message[],
  fallback: SupportMode,
): Message[] =>
  incoming.map((msg, index) => {
    if (msg.thread || msg.mode || msg.role !== "USER") return msg;
    const previousMatch = previous.find(
      (old) =>
        old.role === msg.role &&
        old.message === msg.message &&
        (old.createdAt ?? "") === (msg.createdAt ?? "") &&
        (old.thread === "AI" || old.thread === "AGENT"),
    );
    if (previousMatch?.thread) return { ...msg, thread: previousMatch.thread };
    return { ...msg, thread: getMessageThread(incoming, index, fallback) };
  });

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode: SupportMode =
    searchParams.get("mode")?.toLowerCase() === "ai" ? "AI" : "AGENT";
  const user = useAuthStore((s) => s.user);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("AI_HANDLING");
  const [supportMode, setSupportMode] = useState<SupportMode>(requestedMode);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMicDeniedDialog, setShowMicDeniedDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const autoRequestedAgentRef = useRef(false);
  const { isConnected, joinSession, onNewMessage, onAgentJoined } = useSocket();
  const { isRecording, micPermission, startRecording, stopRecording } = useVoiceRecorder();

  // Start session
  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: ChatService.startSession,
    onSuccess: (data) => {
      const session = data.data;
      shouldAutoScrollRef.current = true;
      scrollBehaviorRef.current = "auto";
      autoRequestedAgentRef.current = false;
      setSessionId(session.id);
      setSessionStatus(session.status);
      setSupportMode(requestedMode);
      localStorage.setItem(CHAT_SESSION_KEY, session.id);

      if (session.messages?.length > 0) {
        setMessages(ensureAiGreeting(session.messages));
      } else {
        setMessages([
          {
            role: "AI",
            message: "Hello! I'm your AI assistant. How can I help you today? 😊",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      joinSession(session.id);
    },
    onError: () => toast.error("Failed to start chat session"),
  });

  // Send media
  const { mutate: sendMedia, isPending: isSendingMedia } = useMutation({
    mutationFn: ({ sid, fd }: { sid: string; fd: FormData }) =>
      ChatService.sendMedia(sid, fd),
    onError: () => toast.error("Failed to send media"),
  });

  // Request agent
  const { mutate: requestAgent, isPending: isRequestingAgent } = useMutation({
    mutationFn: ({ sessionId, identifier }: { sessionId: string; identifier: string }) =>
      ChatService.requestAgent(sessionId, identifier),
    onSuccess: () => {
      setSessionStatus("WAITING_AGENT");
      setSupportMode("AGENT");
      toast.success("Agent request sent. Please wait.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to request agent");
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
    // Track how many agent messages user has seen — popup uses this as baseline
    const agentCount = getAgentMessageCount(session.messages ?? []);
    markChatAgentMessagesSeen(agentCount);

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

        if (!hasLoading && sameLength && lastLocalMessage?.message) return prev;

        const privateAiMessages = prev.filter(
          (msg) =>
            (msg.thread === "AI" || msg.mode === "AI") &&
            !dedupedMessages.some(
              (serverMsg: Message) =>
                serverMsg.role === msg.role &&
                serverMsg.message === msg.message &&
                (serverMsg.createdAt ?? "") === (msg.createdAt ?? ""),
            ),
        );

        setIsSending(false);
        return ensureAiGreeting([
          ...privateAiMessages,
          ...applyThreadHints(dedupedMessages, prev, supportMode),
        ]);
      });
    }
  }, [sessionData, supportMode]);

  useEffect(() => {
    if (
      supportMode !== "AGENT" ||
      !sessionId ||
      sessionStatus !== "AI_HANDLING" ||
      autoRequestedAgentRef.current
    ) {
      return;
    }

    const identifier = user?.username || user?.email || user?.name;
    if (!identifier) return;

    autoRequestedAgentRef.current = true;
    requestAgent({ sessionId, identifier });
  }, [
    requestAgent,
    sessionId,
    sessionStatus,
    supportMode,
    user?.email,
    user?.name,
    user?.username,
  ]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: scrollBehaviorRef.current,
      block: "end",
    });
    scrollBehaviorRef.current = "smooth";
  }, [messages, supportMode]);

  const handleMessagesScroll = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  useEffect(() => {
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSupportMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (!sessionId || !isConnected) return;
    joinSession(sessionId);
  }, [sessionId, isConnected, joinSession]);

  useEffect(() => {
    if (!sessionId) return;

    const unsubMessage = onNewMessage((data: Message) => {
      setIsSending(false);
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        if (hasRecentDuplicate(filtered, data)) return filtered;
        const thread = data.thread ?? data.mode ?? getResponderThread(data.role) ?? supportMode;
        return [
          ...filtered,
          { ...data, thread, createdAt: data.createdAt ?? new Date().toISOString() },
        ];
      });
    });

    const unsubAgent = onAgentJoined((data: any) => {
      setSessionStatus("AGENT_HANDLING");
      setSupportMode("AGENT");
      setMessages((prev) => [
        ...prev,
        {
          role: "AGENT",
          message: data.message,
          thread: "AGENT",
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success("An agent has joined the chat!");
    });

    return () => {
      unsubMessage();
      unsubAgent();
    };
  }, [sessionId, onAgentJoined, onNewMessage, supportMode]);

  const handleSend = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;
    const messageText = inputMessage.trim();
    const userMessage: Message = {
      role: "USER",
      message: messageText,
      thread: supportMode,
      createdAt: new Date().toISOString(),
    };

    shouldAutoScrollRef.current = true;
    if (supportMode === "AI") {
      const loadingMessage: Message = {
        role: "AI",
        message: "",
        thread: "AI",
        isLoading: true,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setInputMessage("");
      setIsSending(true);

      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((msg) => msg !== loadingMessage),
          {
            role: "AI",
            message: getAiAutoReply(messageText),
            thread: "AI",
            createdAt: new Date().toISOString(),
          },
        ]);
        setIsSending(false);
      }, 500);
      return;
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    try {
      await ChatService.sendMessage(sessionId, messageText, "AGENT");
      setInputMessage("");
      setTimeout(() => { void refetchSession(); }, 600);
    } catch (error: any) {
      setIsSending(false);
      setMessages((prev) => [
        ...prev.filter((m) => !m.isLoading && m.createdAt !== userMessage.createdAt),
      ]);
      toast.error(error?.response?.data?.message || "Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    if (supportMode === "AI") {
      toast.info("Images are available in live agent chat.");
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", supportMode);
    sendMedia({ sid: sessionId, fd });
    e.target.value = "";
  };

  const handleMicPointerDown = useCallback(
    async (e: React.PointerEvent<HTMLButtonElement>) => {
      if (micPermission === "denied") {
        setShowMicDeniedDialog(true);
        return;
      }
      if (supportMode === "AI") {
        toast.info("Voice messages are available in live agent chat.");
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      const ok = await startRecording();
      if (!ok) setShowMicDeniedDialog(true);
    },
    [startRecording, micPermission, supportMode],
  );

  const handleMicPointerUp = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob || !sessionId) return;
    const fd = new FormData();
    fd.append("file", blob, getVoiceRecordingFilename(blob));
    fd.append("mode", supportMode);
    sendMedia({ sid: sessionId, fd });
  }, [stopRecording, sessionId, sendMedia, supportMode]);

  const handleRetryMicrophone = async () => {
    if (supportMode === "AI") {
      setShowMicDeniedDialog(false);
      toast.info("Voice messages are available in live agent chat.");
      return;
    }

    const ok = await startRecording();
    if (ok) {
      setShowMicDeniedDialog(false);
      toast.success("Microphone is ready. Hold the mic button to send a voice message.");
      const blob = await stopRecording();
      if (blob) {
        // This permission check recording is discarded intentionally.
      }
      return;
    }

    toast.error("Microphone is still blocked. Allow it from browser site settings.");
  };

  const handleRequestAgent = () => {
    if (!sessionId) {
      toast.error("Chat session is starting. Please try again.");
      return;
    }

    const identifier = user?.username || user?.email || user?.name;
    if (!identifier) {
      toast.error("Please login again to request a live agent.");
      router.push("/login");
      return;
    }

    requestAgent({ sessionId, identifier });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "AI":
        return <Badge className="text-[10px] bg-blue-500/20 text-blue-400">AI</Badge>;
      case "AGENT":
        return <Badge className="text-[10px] bg-green-500/20 text-green-400">Agent</Badge>;
      default:
        return null;
    }
  };

  const getStatusInfo = () => {
    if (supportMode === "AI") {
      return { label: "Live AI", color: "bg-blue-500/20 text-blue-400" };
    }

    if (sessionStatus === "WAITING_AGENT") {
      return { label: "Waiting for Agent", color: "bg-yellow-500/20 text-yellow-400" };
    }

    switch (sessionStatus) {
      case "AI_HANDLING":
        return { label: "Live Agent", color: "bg-green-500/20 text-green-400" };
      case "WAITING_AGENT":
        return { label: "Waiting for Agent", color: "bg-yellow-500/20 text-yellow-400" };
      case "AGENT_HANDLING":
        return { label: "Live Agent", color: "bg-green-500/20 text-green-400" };
      case "CLOSED":
        return { label: "Closed", color: "bg-slate-500/20 text-slate-400" };
      default:
        return { label: "Support", color: "bg-purple-500/20 text-purple-400" };
    }
  };

  const statusInfo = getStatusInfo();
  const activeTitle = supportMode === "AI" ? "AI Assistant" : "Live Agent";
  const displayedMessages = getThreadMessages(messages, supportMode, supportMode);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const isBusy = isSending || isSendingMedia || isRecording;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Hidden image input */}
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

      <div className="mb-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 px-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Chat Header */}
      <Card className="rounded-b-none border-slate-200/90 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSupportMode("AGENT")}
              className="flex min-w-0 items-center gap-3 text-left"
              aria-label="Show live agent chat"
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-600">
                  <AvatarFallback
                    className={cn("text-sm", {
                      "bg-green-600/20":
                        sessionStatus === "AI_HANDLING" ||
                        sessionStatus === "AGENT_HANDLING",
                      "bg-yellow-600/20": sessionStatus === "WAITING_AGENT",
                    })}
                  >
                    <Headphones className="h-4 w-4 text-green-400" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800",
                    isConnected ? "bg-green-500" : "bg-red-500",
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-950 dark:text-white">
                  {activeTitle}
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
            </button>

            <div aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <div
        ref={messagesViewportRef}
        onScroll={handleMessagesScroll}
        className="hide-scrollbar flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-slate-100/70 px-4 py-4 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/90"
      >
        {isStarting ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {displayedMessages.length === 0 && supportMode === "AGENT" && (
              <div className="flex h-full items-center justify-center text-center">
                <div className="space-y-2 text-slate-500 dark:text-slate-400">
                  <Headphones className="mx-auto h-8 w-8 text-green-400/70" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Live agent chat is separate
                  </p>
                  <p className="max-w-56 text-xs">
                    Messages you send here will stay in the agent conversation.
                  </p>
                </div>
              </div>
            )}

            {displayedMessages.map((msg) => (
              <div
                key={msg.id ?? `${msg.originalIndex}-${msg.createdAt ?? ""}`}
                className={cn("flex items-end gap-2", {
                  "justify-end": msg.role === "USER",
                  "justify-start": msg.role !== "USER",
                })}
              >
                {msg.role !== "USER" && (
                  <Avatar className="h-7 w-7 shrink-0 mt-1">
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
                  {msg.role !== "USER" && (
                    <div className="flex items-center gap-1 px-1">
                      {getRoleBadge(msg.role)}
                    </div>
                  )}

                  <div
                    className={cn("rounded-2xl px-4 py-2.5", {
                      "rounded-tr-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_10px_24px_rgba(139,92,246,0.26)] dark:from-violet-600 dark:to-purple-600 dark:shadow-none":
                        msg.role === "USER",
                      "rounded-tl-sm border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-transparent dark:bg-slate-700 dark:text-slate-100 dark:shadow-none":
                        msg.role === "AI" && !isUnavailableAiMessage(msg.message),
                      "rounded-tl-sm border border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100":
                        msg.role === "AI" && isUnavailableAiMessage(msg.message),
                      "rounded-tl-sm border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm dark:border-green-500/30 dark:bg-green-600/20 dark:text-white dark:shadow-none":
                        msg.role === "AGENT",
                    })}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                      </div>
                    ) : msg.imageUrl ? (
                      <ImageBubble url={msg.imageUrl} onPreview={setPreviewUrl} />
                    ) : msg.voiceUrl ? (
                      <AudioBubble url={msg.voiceUrl} />
                    ) : (
                      <div className="space-y-2">
                        {msg.role === "AI" && isUnavailableAiMessage(msg.message) && (
                          <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                            AI Unavailable
                          </div>
                        )}
                        <p
                          className={cn("whitespace-pre-wrap text-sm leading-relaxed", {
                            "text-white": msg.role === "USER",
                            "text-slate-700 dark:text-slate-100":
                              msg.role === "AI" && !isUnavailableAiMessage(msg.message),
                            "text-amber-900 dark:text-amber-100":
                              msg.role === "AI" && isUnavailableAiMessage(msg.message),
                            "text-emerald-900 dark:text-white": msg.role === "AGENT",
                          })}
                        >
                          {getDisplayMessage(msg.message)}
                        </p>
                        {msg.role === "AI" &&
                          isUnavailableAiMessage(msg.message) &&
                          sessionStatus !== "WAITING_AGENT" &&
                          sessionStatus !== "AGENT_HANDLING" &&
                          sessionStatus !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={handleRequestAgent}
                              disabled={isRequestingAgent || !sessionId}
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15"
                            >
                              {isRequestingAgent ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Headphones className="h-3.5 w-3.5" />
                              )}
                              {isRequestingAgent ? "Requesting..." : "Request Live Agent"}
                            </button>
                          )}
                      </div>
                    )}
                  </div>

                  {msg.createdAt && !msg.isLoading && (
                    <p
                      className={cn("px-1 text-[10px] text-slate-500", {
                        "pr-0 text-right": msg.role === "USER",
                      })}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>

                {msg.role === "USER" && (
                  <Avatar className="mt-1 h-6 w-6 shrink-0 ring-1 ring-violet-100 dark:ring-purple-500/20">
                    <AvatarFallback className="bg-violet-50 text-[10px] font-semibold text-violet-500 dark:bg-purple-600/20 dark:text-purple-300">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {supportMode === "AGENT" && sessionStatus === "WAITING_AGENT" && (
              <div className="flex justify-center">
                <Badge className="bg-green-500/15 text-green-400">
                  Agent request is open
                </Badge>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200/90 bg-white/95 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 dark:bg-red-500/15">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 text-xs font-medium text-red-600 dark:text-red-400">
              Recording… release to send
            </span>
            <Square className="h-3 w-3 text-red-600 dark:text-red-400" />
          </div>
        )}

        <div className="flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isRecording ? "Recording..." : "Type a message..."}
              disabled={isBusy}
              className="flex-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:placeholder:text-slate-500"
            />

            {/* Image button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isBusy || !sessionId || supportMode === "AI"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
              aria-label="Send image"
            >
              {isSendingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </button>

            {/* Mic button — press & hold */}
            <button
              type="button"
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={handleMicPointerUp}
              disabled={
                !sessionId ||
                isSendingMedia ||
                supportMode === "AI"
              }
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                isRecording
                  ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                  : micPermission === "denied"
                  ? "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white",
              )}
              aria-label="Record voice message"
            >
              {micPermission === "denied" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={
                !inputMessage.trim() ||
                isBusy
              }
              size="icon"
              className="shrink-0 bg-violet-600 text-white hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

        {supportMode === "AI" && !isRecording && (
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
                className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs text-violet-700 transition-colors hover:bg-violet-50 dark:border-purple-500/30 dark:bg-transparent dark:text-purple-400 dark:hover:bg-purple-500/10"
              >
                {quick}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Microphone Permission Dialog */}
      <Dialog open={showMicDeniedDialog} onOpenChange={setShowMicDeniedDialog}>
        <DialogContent className="max-w-sm border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-950 dark:text-white">
              <MicOff className="h-5 w-5 text-red-400" />
              Microphone Access Needed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Voice messages need microphone access. Tap try again, then choose Allow if your browser asks.
            </p>
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">If it is already blocked:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Open the browser address bar site settings.</li>
                <li>
                  Set <span className="font-medium text-slate-900 dark:text-white">Microphone</span> to{" "}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Allow</span>.
                </li>
                <li>Reload the page and try again.</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMicDeniedDialog(false)}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleRetryMicrophone}
                className="bg-violet-600 text-white hover:bg-violet-700 dark:bg-purple-600 dark:hover:bg-purple-700"
              >
                Try again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
