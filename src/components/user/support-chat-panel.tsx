"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  Video,
  Mic,
  Square,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  VideoBubble,
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
  videoUrl?: string | null;
  createdAt?: string;
  isLoading?: boolean;
  mode?: SupportMode;
  thread?: SupportMode;
}

export type SupportMode = "AI" | "AGENT";
type ThreadMessage = Message & { thread: SupportMode; originalIndex: number };

const hasRecentDuplicate = (
  list: Message[],
  incoming: Pick<Message, "role" | "message" | "imageUrl" | "voiceUrl" | "videoUrl">,
) =>
  list.some((msg) => {
    if (msg.isLoading) return false;
    if (incoming.imageUrl || incoming.voiceUrl || incoming.videoUrl) return false;
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

const getMessageText = (msg: any) => {
  const value = msg.message ?? msg.content ?? msg.text ?? msg.body ?? "";
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
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

const QUICK_REPLIES = [
  "How to deposit?",
  "How to withdraw?",
  "How to create an account?",
  "How does referral bonus work?",
  "How to play games?",
] as const;

export function SupportChatPanel({
  initialMode,
  onBack,
  embedded = false,
  showBackButton = true,
}: {
  initialMode: SupportMode;
  onBack?: () => void;
  embedded?: boolean;
  showBackButton?: boolean;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("AI_HANDLING");
  const [supportMode, setSupportMode] = useState<SupportMode>(initialMode);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showMicDeniedDialog, setShowMicDeniedDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const scrollBehaviorRef = useRef<ScrollBehavior>("smooth");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const autoRequestedAgentRef = useRef(false);
  const { isConnected, joinSession, onNewMessage, onAgentJoined } = useSocket();
  const { isRecording, micPermission, startRecording, stopRecording } =
    useVoiceRecorder();

  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: ChatService.startSession,
    onSuccess: (data) => {
      const session = data.data;
      shouldAutoScrollRef.current = true;
      scrollBehaviorRef.current = "auto";
      autoRequestedAgentRef.current = false;
      setSessionId(session.id);
      setSessionStatus(session.status);
      setSupportMode(initialMode);
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

  const { mutate: sendMedia, isPending: isSendingMedia } = useMutation({
    mutationFn: ({ sid, fd }: { sid: string; fd: FormData }) =>
      ChatService.sendMedia(sid, fd),
    onError: () => toast.error("Failed to send media"),
  });

  const { mutate: requestAgent, isPending: isRequestingAgent } = useMutation({
    mutationFn: ({
      sessionId: currentSessionId,
      identifier,
    }: {
      sessionId: string;
      identifier: string;
    }) => ChatService.requestAgent(currentSessionId, identifier),
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
    setSupportMode(initialMode);
  }, [initialMode]);

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
        const thread =
          data.thread ?? data.mode ?? getResponderThread(data.role) ?? supportMode;
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
      setTimeout(() => {
        void refetchSession();
      }, 600);
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

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    if (supportMode === "AI") {
      toast.info("Images and videos are available in live agent chat.");
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
        // Intentionally discarded permission check recording.
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
        return <Badge className="bg-blue-500/20 text-[10px] text-blue-400">AI</Badge>;
      case "AGENT":
        return (
          <Badge className="bg-green-500/20 text-[10px] text-green-400">
            Agent
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusInfo = () => {
    if (supportMode === "AI") {
      return { label: "Live AI", color: "bg-blue-500/20 text-blue-400" };
    }

    if (sessionStatus === "WAITING_AGENT") {
      return {
        label: "Waiting for Agent",
        color: "bg-yellow-500/20 text-yellow-400",
      };
    }

    switch (sessionStatus) {
      case "AI_HANDLING":
        return { label: "Live Agent", color: "bg-green-500/20 text-green-400" };
      case "WAITING_AGENT":
        return {
          label: "Waiting for Agent",
          color: "bg-yellow-500/20 text-yellow-400",
        };
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
  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const isAgentThreadActive =
    supportMode === "AGENT" &&
    (sessionStatus === "WAITING_AGENT" || sessionStatus === "AGENT_HANDLING");

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const isBusy = isSending || isSendingMedia || isRecording;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#071120] dark:text-white",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-32 before:bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_62%)] before:content-['']",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(16,185,129,0.03),transparent_22%,transparent_78%,rgba(168,85,247,0.02))] dark:after:bg-[linear-gradient(135deg,rgba(16,185,129,0.06),transparent_22%,transparent_78%,rgba(168,85,247,0.08))] after:content-['']",
        embedded ? "min-h-[calc(100vh-11rem)]" : "h-[calc(100vh-8rem)]",
      )}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleMediaFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/webm,video/mp4,video/quicktime,video/x-matroska"
        className="hidden"
        onChange={handleMediaFileChange}
      />

      {previewUrl && (
        <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {showBackButton && (
        <div className="relative z-10 px-3 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-9 rounded-full px-3 text-slate-600 hover:bg-slate-200/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Go back"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
      )}
      <div
        ref={messagesViewportRef}
        onScroll={handleMessagesScroll}
        className="hide-scrollbar relative z-10 flex-1 space-y-4 overflow-y-auto px-3 pb-2 pt-2"
      >
        <div className="pointer-events-none absolute inset-x-3 inset-y-0 bg-white dark:bg-[#081225]/30" />
        <div className="pointer-events-none absolute inset-x-4 top-4 h-28 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.015),transparent_58%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.015),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_58%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_56%)]" />
        <div className="relative space-y-4 px-4 py-5">
          {isStarting ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {displayedMessages.length === 0 && supportMode === "AGENT" && (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="space-y-2 rounded-2xl bg-white px-5 py-6 text-slate-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-slate-400 dark:shadow-none">
                    <Headphones className="mx-auto h-8 w-8 text-emerald-400/70" />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
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
                    <Avatar className="mt-1 h-7 w-7 shrink-0 border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5">
                      <AvatarFallback
                        className={cn("text-xs", {
                          "bg-violet-500/15": msg.role === "AI",
                          "bg-emerald-500/15": msg.role === "AGENT",
                        })}
                      >
                        {msg.role === "AI" ? (
                          <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-200" />
                        ) : (
                          <Headphones className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-200" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="max-w-[75%] space-y-1">
                    {msg.role !== "USER" && (
                      <div className="flex items-center gap-1 px-1.5">
                        {getRoleBadge(msg.role)}
                      </div>
                    )}

                    <div
                      className={cn("rounded-[22px] px-4 py-3", {
                        "rounded-br-md border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-transparent dark:bg-[linear-gradient(135deg,#d946ef_0%,#a21caf_48%,#7c3aed_100%)] dark:text-white dark:shadow-[0_16px_34px_rgba(168,85,247,0.34)]":
                          msg.role === "USER",
                        "rounded-bl-md border border-slate-300 bg-white text-slate-900 shadow-[0_12px_26px_rgba(148,163,184,0.16)] backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-slate-100 dark:shadow-[0_12px_26px_rgba(2,6,23,0.24)]":
                          msg.role === "AI" && !isUnavailableAiMessage(msg.message),
                        "rounded-bl-md border border-amber-300 bg-amber-50 text-amber-950 backdrop-blur dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100":
                          msg.role === "AI" && isUnavailableAiMessage(msg.message),
                        "rounded-bl-md border border-emerald-300 bg-emerald-50 text-emerald-950 shadow-[0_12px_26px_rgba(16,185,129,0.08)] backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-500/12 dark:text-emerald-50 dark:shadow-[0_12px_26px_rgba(16,185,129,0.12)]":
                          msg.role === "AGENT",
                      })}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-1 py-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                        </div>
                      ) : msg.imageUrl ? (
                        <ImageBubble url={msg.imageUrl} onPreview={setPreviewUrl} />
                      ) : msg.voiceUrl ? (
                        <AudioBubble url={msg.voiceUrl} />
                      ) : msg.videoUrl ? (
                        <VideoBubble url={msg.videoUrl} />
                      ) : (
                        <div className="space-y-2">
                          {msg.role === "AI" && isUnavailableAiMessage(msg.message) && (
                            <div className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
                              AI Unavailable
                            </div>
                          )}
                          <p
                            className={cn("whitespace-pre-wrap text-sm leading-relaxed", {
                              "font-medium text-slate-950 dark:text-white": msg.role === "USER",
                              "text-slate-900 dark:text-slate-100":
                                msg.role === "AI" && !isUnavailableAiMessage(msg.message),
                              "text-amber-950 dark:text-amber-100":
                                msg.role === "AI" && isUnavailableAiMessage(msg.message),
                              "text-emerald-950 dark:text-emerald-50": msg.role === "AGENT",
                            })}
                          >
                            {getDisplayMessage(getMessageText(msg))}
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
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/15"
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
                        className={cn("px-1.5 text-[10px] text-slate-700 dark:text-slate-500", {
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
                    <Avatar className="mt-1 h-7 w-7 shrink-0 border border-violet-200 bg-violet-50 dark:border-violet-400/20 dark:bg-violet-500/10">
                      <AvatarFallback className="bg-violet-100 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isAgentThreadActive && (
                <div className="flex justify-center">
                  <Badge className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/12 dark:text-emerald-200">
                    {sessionStatus === "WAITING_AGENT"
                      ? "Agent request is open"
                      : "Live agent connected"}
                  </Badge>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 bg-white px-3 pb-3 pt-2 backdrop-blur dark:bg-[#0d1930]/40">
        {isRecording && (
          <div className="mb-3 flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-400/15 dark:bg-rose-500/12">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 text-xs font-medium text-rose-700 dark:text-rose-100">
              Recording… release to send
            </span>
            <Square className="h-3 w-3 text-rose-500 dark:text-rose-200" />
          </div>
        )}

        <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-white/4 dark:shadow-none">
          <div className="flex items-center gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isRecording ? "Recording..." : "Type a message..."}
              disabled={isBusy}
              className="h-11 flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm !text-black placeholder:text-slate-500 caret-black dark:border-white/8 dark:bg-[#1a2740] dark:!text-white dark:caret-white dark:placeholder:text-slate-500"
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isBusy || !sessionId || supportMode === "AI"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white !text-black transition-colors hover:bg-slate-100 hover:!text-black disabled:opacity-40 dark:border-transparent dark:bg-[#22314e] dark:!text-slate-300 dark:hover:bg-[#2b3d60] dark:hover:!text-white"
              aria-label="Send image"
            >
              {isSendingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isBusy || !sessionId || supportMode === "AI"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white !text-black transition-colors hover:bg-slate-100 hover:!text-black disabled:opacity-40 dark:border-transparent dark:bg-[#22314e] dark:!text-slate-300 dark:hover:bg-[#2b3d60] dark:hover:!text-white"
              aria-label="Send video"
            >
              {isSendingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={handleMicPointerUp}
              disabled={!sessionId || isSendingMedia || supportMode === "AI"}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                isRecording
                  ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                  : micPermission === "denied"
                    ? "border border-rose-200 bg-rose-50 !text-black hover:bg-rose-100 dark:border-transparent dark:bg-rose-500/12 dark:!text-rose-300 dark:hover:bg-rose-500/20"
                    : "border border-slate-200 bg-white !text-black hover:bg-slate-100 hover:!text-black dark:border-transparent dark:bg-[#22314e] dark:!text-slate-300 dark:hover:bg-[#2b3d60] dark:hover:!text-white",
              )}
              aria-label="Record voice message"
            >
              {micPermission === "denied" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isBusy}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#c026d3_100%)] text-white shadow-[0_14px_28px_rgba(168,85,247,0.32)] hover:opacity-95"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {supportMode === "AI" && !isRecording && (
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_REPLIES.map((quick) => (
              <button
                key={quick}
                onClick={() => setInputMessage(quick)}
                className="rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/15"
              >
                {quick}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showMicDeniedDialog} onOpenChange={setShowMicDeniedDialog}>
        <DialogContent className="max-w-sm border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0d1930] dark:text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <MicOff className="h-5 w-5 text-red-400" />
              Microphone Access Needed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Voice messages need microphone access. Tap try again, then choose Allow if your browser asks.
            </p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                If it is already blocked:
              </p>
              <ol className="list-inside list-decimal space-y-1">
                <li>Open the browser address bar site settings.</li>
                <li>
                  Set{" "}
                  <span className="font-medium text-slate-900 dark:text-white">
                    Microphone
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-emerald-400">
                    Allow
                  </span>
                  .
                </li>
                <li>Reload the page and try again.</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMicDeniedDialog(false)}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleRetryMicrophone}
                className="bg-[linear-gradient(135deg,#7c3aed_0%,#c026d3_100%)] text-white hover:opacity-95"
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
