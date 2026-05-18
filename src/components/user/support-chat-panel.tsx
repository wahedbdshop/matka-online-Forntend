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
  ImageIcon,
  Video,
  Mic,
  Square,
  MicOff,
  MoreVertical,
  Plus,
  X,
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

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const getAiAutoReply = (message: string) => {
  const normalized = message.toLowerCase();

  if (
    hasAnyKeyword(normalized, [
      "deposit",
      "add money",
      "add balance",
      "payment",
      "bkash",
      "nagad",
      "bank",
      "recharge",
    ])
  ) {
    return [
      "Deposit process:",
      "1. Open Deposit from the bottom/menu.",
      "2. Choose your payment method, like bKash, Nagad, or Bank.",
      "3. Enter the deposit amount.",
      "4. Copy the agent number or account details shown on the page.",
      "5. Send payment from your wallet/bank.",
      "6. Submit the transaction ID, sender number, and proof if asked.",
      "7. Wait for admin approval. Balance will add automatically after approval.",
      "If you already paid but balance is not added, send the transaction ID to live agent.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "withdraw",
      "withdrow",
      "withdrawal",
      "cashout",
      "cash out",
      "take money",
    ])
  ) {
    return [
      "Withdrawal process:",
      "1. Open Withdrawal.",
      "2. Select your saved account or add the correct payment number.",
      "3. Enter the withdrawal amount.",
      "4. Check the number and amount carefully.",
      "5. Submit the request.",
      "6. Wait for admin/agent approval.",
      "If the request is pending for long, share your username and withdrawal time with live agent.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "register",
      "registration",
      "signup",
      "sign up",
      "create account",
      "new account",
    ])
  ) {
    return [
      "Account registration process:",
      "1. Open Register.",
      "2. Fill name, username, phone/email, country, and password.",
      "3. Use a valid phone/email so verification can work.",
      "4. Submit registration.",
      "5. Login with your username/email and password.",
      "If OTP or verification does not arrive, request live agent support.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "login",
      "log in",
      "signin",
      "sign in",
      "cannot login",
      "can't login",
      "device",
    ])
  ) {
    return [
      "Login help:",
      "1. Open Login.",
      "2. Enter your username/email and password.",
      "3. Complete captcha or OTP if shown.",
      "4. If device login conflict appears, logout from the old device or contact live agent.",
      "5. If password is wrong, use Forgot Password or ask live agent after account check.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "password",
      "forgot",
      "reset",
      "change password",
      "pass",
    ])
  ) {
    return [
      "Password help:",
      "1. If you remember the old password, go to Profile > Change Password.",
      "2. Enter old password, new password, and confirm password.",
      "3. If you forgot it, use Forgot Password from login page.",
      "4. If reset does not work, contact live agent with your username and phone/email.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "kyc",
      "verify",
      "verification",
      "nid",
      "identity",
      "document",
    ])
  ) {
    return [
      "KYC/verification process:",
      "1. Open KYC or Profile verification page.",
      "2. Upload the requested document/photo clearly.",
      "3. Make sure name and number match your account information.",
      "4. Submit and wait for review.",
      "If rejected, check the reason and upload a clearer document.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "transfer",
      "send balance",
      "send money",
      "balance transfer",
    ])
  ) {
    return [
      "Balance transfer process:",
      "1. Open Transfer.",
      "2. Enter receiver username or account info.",
      "3. Enter amount.",
      "4. Review receiver details carefully.",
      "5. Submit the transfer.",
      "If balance was sent to the wrong user, contact live agent quickly.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "referral",
      "refer",
      "bonus",
      "commission",
      "invite",
    ])
  ) {
    return [
      "Referral and bonus help:",
      "1. Open Referral from your account.",
      "2. Copy your referral link/code.",
      "3. Share it with your friend.",
      "4. Bonus/commission will follow the rules shown on the Referral page.",
      "5. For missing bonus, send referred username and date to live agent.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "play",
      "game",
      "lottery",
      "thai",
      "kalyan",
      "ludo",
      "coin toss",
      "bet",
    ])
  ) {
    return [
      "Game play process:",
      "1. Open Games or the lottery/game page you want.",
      "2. Select the game type or market.",
      "3. Enter your number/choice and amount.",
      "4. Check all details before submit.",
      "5. Submit before the game closes.",
      "6. You can check play history from Bet History or the game history page.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "result",
      "win",
      "history",
      "bet history",
      "play history",
      "winning",
    ])
  ) {
    return [
      "Result and history help:",
      "1. Open the game result page to see latest results.",
      "2. Open Bet History/Win History to check your own entries.",
      "3. If a win is not showing, wait for result settlement.",
      "4. If still missing, contact live agent with game name, date, and bet details.",
    ].join("\n");
  }

  if (
    hasAnyKeyword(normalized, [
      "whatsapp",
      "agent",
      "support",
      "live",
      "help",
      "admin",
    ])
  ) {
    return [
      "Support options:",
      "1. Use Live Agent for account, deposit, withdrawal, and urgent issues.",
      "2. Use WhatsApp for payment proof or quick human support.",
      "3. Send your username, issue type, amount, transaction ID, and screenshot if needed.",
      "Please do not share your password with anyone.",
    ].join("\n");
  }

  return [
    "I can help with these topics:",
    "Deposit, withdrawal, register, login, password, KYC, transfer, referral bonus, games, result/history, and live agent support.",
    "Type any topic name, for example: deposit, withdraw, KYC, password, result.",
  ].join("\n");
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
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
    setShowAttachMenu(false);
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
    setShowAttachMenu(false);
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

  const getStatusInfo = () => {
    if (supportMode === "AI") {
      return {
        label: "Online",
        color: "bg-blue-500/15 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
      };
    }

    if (sessionStatus === "WAITING_AGENT") {
      return {
        label: "Waiting for agent",
        color:
          "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
      };
    }

    switch (sessionStatus) {
      case "AI_HANDLING":
        return {
          label: "Connecting",
          color:
            "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
        };
      case "AGENT_HANDLING":
        return {
          label: "Online",
          color:
            "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
        };
      case "CLOSED":
        return {
          label: "Closed",
          color: "bg-slate-500/15 text-slate-700 dark:bg-white/10 dark:text-slate-300",
        };
      default:
        return {
          label: "Support",
          color:
            "bg-violet-500/15 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const activeTitle = supportMode === "AI" ? "AI Assistant" : "Live Agent";
  const displayedMessages = getThreadMessages(messages, supportMode, supportMode);
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
        "relative flex flex-col overflow-hidden bg-[#f7f8fb] text-slate-900 dark:bg-[#07111f] dark:text-white",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.035)_1px,transparent_0)] before:[background-size:22px_22px] before:opacity-80 before:content-[''] dark:before:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent_16%,transparent_82%,rgba(226,232,240,0.34))] after:content-[''] dark:after:bg-[linear-gradient(180deg,rgba(9,20,38,0.55),transparent_18%,transparent_78%,rgba(2,6,23,0.3))]",
        embedded ? "h-full min-h-0 rounded-none" : "h-[calc(100vh-8rem)] rounded-[30px] border border-slate-200/70 shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:border-white/10 dark:shadow-[0_20px_50px_rgba(2,6,23,0.4)]",
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

      <div className="relative z-10 border-b border-slate-200/70 bg-white/92 px-3 py-2.5 text-slate-950 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-[#0b1728]/94 dark:text-white">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-10 w-10 rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/10">
              <AvatarFallback
                className={cn("text-white", {
                  "bg-[linear-gradient(145deg,#8b5cf6_0%,#c026d3_100%)]": supportMode === "AI",
                  "bg-[linear-gradient(145deg,#059669_0%,#0f766e_100%)]": supportMode === "AGENT",
                })}
              >
                {supportMode === "AI" ? (
                  <Bot className="h-4.5 w-4.5" />
                ) : (
                  <Headphones className="h-4.5 w-4.5" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{activeTitle}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusInfo.color)}>
                  {statusInfo.label}
                </span>
                {isConnected ? (
                  <span className="text-[11px] text-slate-500 dark:text-white/60">secured chat</span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-white/45">reconnecting...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="More"
            >
              <MoreVertical className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={messagesViewportRef}
        onScroll={handleMessagesScroll}
        className="hide-scrollbar relative z-10 flex-1 overflow-y-auto px-2 pb-3 pt-3"
      >
        <div className="pointer-events-none absolute inset-0 bg-transparent" />
        <div className="relative space-y-3 px-2 py-2 sm:px-3">
          {isStarting ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {displayedMessages.length > 0 && (
                <div className="sticky top-1 z-10 flex justify-center">
                  <span className="rounded-full border border-slate-200/80 bg-white/86 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#10203a]/86 dark:text-slate-300">
                    Today
                  </span>
                </div>
              )}

              {supportMode === "AI" && !isRecording && (
                <div className="flex flex-wrap gap-2 px-1 pt-1">
                  {QUICK_REPLIES.map((quick) => (
                    <button
                      key={quick}
                      onClick={() => setInputMessage(quick)}
                      className="rounded-full border border-violet-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-violet-800 shadow-sm transition-colors hover:bg-violet-50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/15"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              )}

              {displayedMessages.length === 0 && supportMode === "AGENT" && (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="space-y-2 rounded-2xl bg-white px-5 py-6 text-slate-700 shadow-sm backdrop-blur dark:bg-white/5 dark:text-slate-300 dark:shadow-none">
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
                    <Avatar className="mb-5 h-7 w-7 shrink-0 border border-slate-200 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <AvatarFallback
                        className={cn("text-xs", {
                          "bg-[linear-gradient(145deg,rgba(124,58,237,0.16),rgba(192,38,211,0.16))]": msg.role === "AI",
                          "bg-[linear-gradient(145deg,rgba(4,120,87,0.18),rgba(15,118,110,0.18))]": msg.role === "AGENT",
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

                  <div className="max-w-[82%] space-y-1 sm:max-w-[76%]">
                    <div
                      className={cn("relative rounded-[20px] px-4 py-2.5", {
                        "rounded-br-md bg-[linear-gradient(135deg,#d946ef_0%,#b625d8_46%,#8b5cf6_100%)] text-white shadow-[0_12px_24px_rgba(168,85,247,0.24)]":
                          msg.role === "USER",
                        "rounded-bl-md border border-slate-200/90 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#101c31] dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.24)]":
                          msg.role === "AI" && !isUnavailableAiMessage(msg.message),
                        "rounded-bl-md border border-amber-300 bg-amber-50 text-amber-950 backdrop-blur dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-100":
                          msg.role === "AI" && isUnavailableAiMessage(msg.message),
                        "rounded-bl-md border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-[0_12px_26px_rgba(16,185,129,0.08)] backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-500/12 dark:text-emerald-50 dark:shadow-[0_12px_26px_rgba(16,185,129,0.12)]":
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
                            className={cn("whitespace-pre-wrap text-[14px] leading-relaxed", {
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
                        className={cn("px-2 text-[10px] font-medium text-slate-400 dark:text-slate-500", {
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

                </div>
              ))}

              {isAgentThreadActive && (
                <div className="flex justify-center">
                  <Badge className="rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-1 text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-500/12 dark:text-emerald-200">
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

      <div className="relative z-10 border-t border-slate-200/70 bg-white/88 px-3 pb-3 pt-2 backdrop-blur dark:border-white/10 dark:bg-[#0b1728]/92">
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-400/15 dark:bg-rose-500/12">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="flex-1 text-xs font-medium text-rose-700 dark:text-rose-100">
              Recording… release to send
            </span>
            <Square className="h-3 w-3 text-rose-500 dark:text-rose-200" />
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative flex flex-1 items-center gap-1.5 rounded-[24px] bg-slate-100/90 px-2 py-1.5 shadow-inner shadow-slate-200/60 dark:bg-[#17243a] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {showAttachMenu && (
              <div className="absolute bottom-[58px] left-0 z-20 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_34px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/10 dark:bg-[#101c31]/95">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isBusy || !sessionId || supportMode === "AI"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40 dark:bg-violet-500/12 dark:text-violet-200 dark:hover:bg-violet-500/20"
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 transition-colors hover:bg-cyan-100 disabled:opacity-40 dark:bg-cyan-500/12 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                  aria-label="Send video"
                >
                  {isSendingMedia ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAttachMenu((open) => !open)}
              disabled={isBusy || !sessionId || supportMode === "AI"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                showAttachMenu
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                  : "bg-white text-slate-600 hover:text-slate-950 dark:bg-white/8 dark:text-slate-200 dark:hover:bg-white/12 dark:hover:text-white",
              )}
              aria-label={showAttachMenu ? "Close attachments" : "Open attachments"}
            >
              {showAttachMenu ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>

            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isRecording ? "Recording..." : "Type a message..."}
              disabled={isBusy}
              className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm !text-black shadow-none placeholder:text-slate-500 caret-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:!text-white dark:caret-white dark:placeholder:text-slate-400"
            />

            <button
              type="button"
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={handleMicPointerUp}
              disabled={!sessionId || isSendingMedia || supportMode === "AI"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                isRecording
                  ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                  : micPermission === "denied"
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/12 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    : "bg-transparent text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
              )}
              aria-label="Record voice message"
            >
              {micPermission === "denied" ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

          </div>

          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isBusy}
            size="icon"
            className="h-12 w-12 shrink-0 rounded-full bg-[linear-gradient(135deg,#8b5cf6_0%,#c026d3_100%)] text-white shadow-[0_14px_28px_rgba(168,85,247,0.32)] hover:opacity-95"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

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
