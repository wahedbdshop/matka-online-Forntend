"use client";

export const CHAT_SESSION_KEY = "chat_session_id";
export const CHAT_AGENT_COUNT_KEY = "chat_agent_count";
export const CHAT_UNREAD_COUNT_KEY = "chat_unread_count";
export const CHAT_UNREAD_EVENT = "chat-unread-count-changed";

type ChatMessage = {
  role?: string | null;
};

export function getAgentMessageCount(messages: ChatMessage[] = []) {
  return messages.filter((message) => message.role === "AGENT").length;
}

export function readSeenAgentCount() {
  if (typeof window === "undefined") return 0;
  const count = Number.parseInt(
    window.localStorage.getItem(CHAT_AGENT_COUNT_KEY) ?? "0",
    10,
  );
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function writeSeenAgentCount(count: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_AGENT_COUNT_KEY, String(Math.max(0, count)));
}

export function readChatUnreadCount() {
  if (typeof window === "undefined") return 0;
  const count = Number.parseInt(
    window.localStorage.getItem(CHAT_UNREAD_COUNT_KEY) ?? "0",
    10,
  );
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

export function writeChatUnreadCount(count: number) {
  if (typeof window === "undefined") return;
  const safeCount = Math.max(0, count);
  window.localStorage.setItem(CHAT_UNREAD_COUNT_KEY, String(safeCount));
  window.dispatchEvent(
    new CustomEvent(CHAT_UNREAD_EVENT, { detail: { count: safeCount } }),
  );
}

export function setChatUnreadFromAgentTotal(totalAgentMessages: number) {
  const unreadCount = Math.max(0, totalAgentMessages - readSeenAgentCount());
  writeChatUnreadCount(unreadCount);
  return unreadCount;
}

export function markChatAgentMessagesSeen(totalAgentMessages?: number) {
  const nextSeenCount =
    typeof totalAgentMessages === "number"
      ? totalAgentMessages
      : readSeenAgentCount() + readChatUnreadCount();

  writeSeenAgentCount(nextSeenCount);
  writeChatUnreadCount(0);
}

export function clearChatTracking() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(CHAT_SESSION_KEY);
  window.localStorage.removeItem(CHAT_AGENT_COUNT_KEY);
  writeChatUnreadCount(0);
}
