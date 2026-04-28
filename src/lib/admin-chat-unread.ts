export const ADMIN_CHAT_SEEN_MESSAGES_KEY = "admin_chat_seen_messages";
export const ADMIN_CHAT_SEEN_MESSAGES_EVENT = "admin-chat-seen-messages";

type ChatMessage = {
  id?: string;
  role?: string;
  message?: string | null;
  createdAt?: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
};

type ChatSession = {
  id?: string;
  messages?: ChatMessage[];
};

export function readAdminChatSeenMap() {
  if (typeof window === "undefined") return {} as Record<string, string>;

  try {
    const raw = window.localStorage.getItem(ADMIN_CHAT_SEEN_MESSAGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAdminChatSeenMap(value: Record<string, string>) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ADMIN_CHAT_SEEN_MESSAGES_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(ADMIN_CHAT_SEEN_MESSAGES_EVENT));
}

export function getLatestUserMessage(session: ChatSession | undefined) {
  const messages = Array.isArray(session?.messages) ? session.messages : [];

  return [...messages]
    .filter((message) => String(message?.role ?? "").toUpperCase() === "USER")
    .sort((left, right) => {
      const rightTime = new Date(right?.createdAt ?? 0).getTime();
      const leftTime = new Date(left?.createdAt ?? 0).getTime();
      return rightTime - leftTime;
    })[0];
}

export function getLatestMessageTime(session: ChatSession | undefined) {
  const messages = Array.isArray(session?.messages) ? session.messages : [];

  return messages.reduce((latest, message) => {
    const time = new Date(message?.createdAt ?? 0).getTime();
    return Number.isFinite(time) && time > latest ? time : latest;
  }, 0);
}

export function buildAdminChatMessageKey(
  sessionId: string,
  message: ChatMessage | undefined,
) {
  if (!message) return `${sessionId}:none`;

  return [
    sessionId,
    message.id ?? "",
    message.createdAt ?? "",
    message.message ?? "",
    message.imageUrl ?? "",
    message.voiceUrl ?? "",
  ].join(":");
}

export function isAdminChatSessionUnread(
  session: ChatSession | undefined,
  seenMap: Record<string, string>,
) {
  const sessionId = String(session?.id ?? "").trim();
  if (!sessionId) return false;

  const latestUserMessage = getLatestUserMessage(session);
  if (!latestUserMessage) return false;

  return (
    buildAdminChatMessageKey(sessionId, latestUserMessage) !== seenMap[sessionId]
  );
}

export function getAdminUnreadChatCount(sessions: ChatSession[] | undefined) {
  const seenMap = readAdminChatSeenMap();
  return (sessions ?? []).filter((session) =>
    isAdminChatSessionUnread(session, seenMap),
  ).length;
}

export function markAdminChatSessionSeen(session: ChatSession | undefined) {
  const sessionId = String(session?.id ?? "").trim();
  if (!sessionId) return;

  const latestUserMessage = getLatestUserMessage(session);
  const nextSeenMap = {
    ...readAdminChatSeenMap(),
    [sessionId]: buildAdminChatMessageKey(sessionId, latestUserMessage),
  };

  writeAdminChatSeenMap(nextSeenMap);
}

export function sortChatSessionsByLatestMessage<T extends ChatSession>(
  sessions: T[],
) {
  return [...sessions].sort(
    (left, right) => getLatestMessageTime(right) - getLatestMessageTime(left),
  );
}
