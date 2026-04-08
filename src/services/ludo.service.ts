import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export type LudoStakeAmount = number;

export type LudoStakeSlot = {
  amount: LudoStakeAmount;
  waitingPlayers: number;
  activeMatches: number;
  onlinePlayers: number;
};

export type LudoLobby = {
  activePlayerCount: number;
  disabledColors: Array<"RED" | "GREEN" | "YELLOW" | "BLUE">;
  stakes: LudoStakeSlot[];
};

export type JoinLudoQueuePayload = {
  stake: LudoStakeAmount;
  preferredColor: "RED" | "GREEN";
  pieceMode: "FOUR";
};

export type LudoToken = {
  id: string;
  label: string;
  position: number;
  status: "HOME" | "TRACK" | "GOAL" | "FINISHED";
  canMove?: boolean;
  userId?: string;
  color?: "RED" | "GREEN" | "YELLOW" | "BLUE";
  stepsMoved?: number;
  boardPosition?: number | null;
  homeLanePosition?: number | null;
};

export type LudoRoomPlayer = {
  userId: string;
  name: string;
  username?: string;
  color: "RED" | "GREEN" | "YELLOW" | "BLUE";
  connected: boolean;
  tokensFinished?: number;
  isYou?: boolean;
  tokens: LudoToken[];
};

export type LudoRoom = {
  id: string;
  stakeAmount: LudoStakeAmount;
  status: "WAITING" | "LIVE" | "FINISHED" | "CANCELLED";
  roomId?: string;
  matchId?: string;
  pieceMode?: "FOUR";
  activePlayerCount?: number;
  yourColor?: "RED" | "GREEN" | "YELLOW" | "BLUE" | null;
  disabledColors?: Array<"RED" | "GREEN" | "YELLOW" | "BLUE">;
  availableTokenIds?: string[];
  currentTurnUserId?: string | null;
  lastDiceValue?: number | null;
  winnerUserId?: string | null;
  turnEndsAt?: string | null;
  players: LudoRoomPlayer[];
  tokens?: LudoToken[];
};

export type LudoMyState = {
  queueId?: string | null;
  roomId?: string | null;
  currentRoomId?: string | null;
  matchId?: string | null;
  stake?: LudoStakeAmount | null;
  preferredColor?: "RED" | "GREEN" | null;
  pieceMode?: "FOUR" | null;
  status?: string | null;
  room?: {
    id?: string | null;
  } | null;
  activeMatch?: {
    roomId?: string | null;
    room?: {
      id?: string | null;
    } | null;
  } | null;
};

type LudoRoomResponse = ApiResponse<
  LudoRoom | { room?: LudoRoom; snapshot?: LudoRoom; diceValue?: number }
>;

const normalizeLudoTokenStatus = (status?: string): LudoToken["status"] => {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
    case "TRACK":
      return "TRACK";
    case "GOAL":
      return "GOAL";
    case "FINISHED":
      return "FINISHED";
    case "HOME":
    default:
      return "HOME";
  }
};

const normalizeLudoRoomStatus = (status?: string): LudoRoom["status"] => {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE":
    case "LIVE":
      return "LIVE";
    case "FINISHED":
      return "FINISHED";
    case "CANCELLED":
      return "CANCELLED";
    case "WAITING":
    default:
      return "WAITING";
  }
};

const normalizeLudoToken = (token: LudoToken): LudoToken => ({
  ...token,
  label: String(token.label ?? token.id ?? "T"),
  position: Number(token.position ?? -1),
  status: normalizeLudoTokenStatus(token.status),
});

const normalizeLudoRoom = (room: LudoRoom): LudoRoom => ({
  ...room,
  id: room.id ?? room.roomId ?? "",
  status: normalizeLudoRoomStatus(room.status),
  players: (room.players ?? []).map((player) => ({
    ...player,
    tokens: (player.tokens ?? []).map((token) => normalizeLudoToken(token)),
  })),
  tokens: (room.tokens ?? []).map((token) => normalizeLudoToken(token)),
  availableTokenIds: room.availableTokenIds ?? [],
  disabledColors: room.disabledColors ?? ["YELLOW", "BLUE"],
});

const normalizeLudoRoomResponse = (response: LudoRoomResponse) => {
  const payload = response.data;
  const room =
    payload && typeof payload === "object" && "room" in payload
      ? (payload.room ?? payload.snapshot)
      : payload;

  if (!room) {
    return response as ApiResponse<LudoRoom>;
  }

  return {
    ...response,
    data: normalizeLudoRoom(room as LudoRoom),
  } satisfies ApiResponse<LudoRoom>;
};

export const LudoService = {
  async getLobby() {
    const res = await api.get<ApiResponse<LudoLobby>>("/ludo/lobby");
    return res.data;
  },

  async joinQueue(payload: JoinLudoQueuePayload) {
    const res = await api.post<
      ApiResponse<{
        queueId: string;
        amount?: LudoStakeAmount;
        stake?: LudoStakeAmount;
        matchId?: string;
        preferredColor?: "RED" | "GREEN";
        yourColor?: "RED" | "GREEN";
        pieceMode?: "FOUR";
        status: "SEARCHING" | "MATCHED";
        roomId?: string;
      }>
    >("/ludo/queue/join", payload);

    return res.data;
  },

  async leaveQueue(queueId: string) {
    const res = await api.post<ApiResponse<{ queueId: string }>>(
      `/ludo/queue/${queueId}/leave`,
    );

    return res.data;
  },

  async getRoom(roomId: string) {
    const res = await api.get<ApiResponse<LudoRoom>>(`/ludo/rooms/${roomId}`);
    return normalizeLudoRoomResponse(res.data);
  },

  async getMyState() {
    const res = await api.get<ApiResponse<LudoMyState>>("/ludo/me");
    return res.data;
  },

  async rollDice(roomId: string) {
    const res = await api.post<LudoRoomResponse>(
      `/ludo/rooms/${roomId}/roll`,
    );
    return normalizeLudoRoomResponse(res.data);
  },

  async moveToken(roomId: string, tokenId: string) {
    const res = await api.post<LudoRoomResponse>(
      `/ludo/rooms/${roomId}/move`,
      { tokenId },
    );
    return normalizeLudoRoomResponse(res.data);
  },

  async leaveRoom(roomId: string) {
    const res = await api.post<ApiResponse<{ roomId: string }>>(
      `/ludo/rooms/${roomId}/leave`,
    );
    return res.data;
  },
};
