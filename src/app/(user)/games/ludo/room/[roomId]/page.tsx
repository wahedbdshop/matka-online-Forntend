"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { cn } from "@/lib/utils";
import { LudoBoard, type LudoToken as BoardToken } from "@/components/ludo/board";
import {
  LudoService,
  normalizeLudoRoom,
  type LudoRoom,
  type LudoRoomPlayer,
  type LudoToken,
} from "@/services/ludo.service";

// ─────────────────────────────────────────────────────────────────────────────
// 15×15 board coordinate system
// ─────────────────────────────────────────────────────────────────────────────

/** 30-cell outer path in 15×15 grid coordinates, clockwise from RED exit. */
const TRACK: Array<[number, number]> = [
  // Row 6, cols 1-5 (exit RED home going right)
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Col 6, rows 5-0 (going up top arm)
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  // Row 0, cols 7-8 (across the very top)
  [0,7],[0,8],
  // Col 8, rows 1-5 (going down top arm)
  [1,8],[2,8],[3,8],[4,8],[5,8],
  // Row 6, cols 9-13 (right arm going right)
  [6,9],[6,10],[6,11],[6,12],[6,13],
  // Col 13, rows 7-9 (going down right arm)
  [7,13],[8,13],[9,13],
  // Row 8, cols 12-9 (bottom of right arm going left)
  [8,12],[8,11],[8,10],[8,9],
];

/** Token home circle positions per color on the 15×15 grid.
 *  Must match HOME_CIRCLE_MAP in board.tsx exactly. */
const HOME_CELLS: Record<string, Array<[number, number]>> = {
  RED:    [[1,1],  [1,3],  [3,1],  [3,3]],
  GREEN:  [[1,11], [1,13], [3,11], [3,13]],
  BLUE:   [[11,1], [11,3], [13,1], [13,3]],
  YELLOW: [[11,11],[11,13],[13,11],[13,13]],
};

/** Goal cell (just before center entry) per color. */
const GOAL_CELLS: Record<string, [number, number]> = {
  RED:    [5, 7],
  GREEN:  [7, 9],
  BLUE:   [7, 5],
  YELLOW: [9, 7],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" && error !== null && "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!.data!.message!;
  }
  return fallback;
};

type RoomEventPayload = { room?: LudoRoom | null; winnerName?: string };

/** Convert game token state → 15×15 [row, col]. */
function tokenCell(
  token: LudoToken,
  player: LudoRoomPlayer,
  idx: number,
): [number, number] {
  if (token.status === "HOME") {
    return HOME_CELLS[player.color]?.[idx] ?? [1, 1];
  }
  if (token.status === "GOAL" || token.status === "FINISHED") {
    return GOAL_CELLS[player.color] ?? [7, 7];
  }
  const bi =
    token.boardPosition ??
    (typeof token.stepsMoved === "number" && token.stepsMoved > 0
      ? token.stepsMoved - 1
      : token.position - 1);
  const cell =
    typeof bi === "number" && bi >= 0
      ? TRACK[bi % TRACK.length]
      : HOME_CELLS[player.color]?.[idx];
  return cell ?? [7, 7];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dice face SVG
// ─────────────────────────────────────────────────────────────────────────────
function DiceSVG({ value, size = 56 }: { value?: number | null; size?: number }) {
  const dots: Record<number, Array<[number, number]>> = {
    1: [[50,50]],
    2: [[28,28],[72,72]],
    3: [[28,28],[50,50],[72,72]],
    4: [[28,28],[72,28],[28,72],[72,72]],
    5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
    6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
  };
  const pts: Array<[number, number]> =
    typeof value === "number" && value in dots ? dots[value] : [];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x={6} y={8} width={90} height={90} rx={18} fill="rgba(0,0,0,0.18)" />
      <rect x={2} y={2} width={90} height={90} rx={18} fill="white" />
      <rect x={8} y={6} width={76} height={32} rx={12} fill="rgba(255,255,255,0.65)" />
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={9} fill="#1e40af" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small inline token icon (for bottom bar)
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  RED: "#dc2626", GREEN: "#16a34a", BLUE: "#2563eb", YELLOW: "#d97706",
};

function PlayerPin({ color }: { color: string }) {
  const hex = COLOR_HEX[color] ?? "#888";
  return (
    <svg width="28" height="40" viewBox="0 0 40 56">
      <ellipse cx="20" cy="53" rx="7" ry="2.5" fill="rgba(0,0,0,0.25)" />
      <circle cx="20" cy="18" r="17" fill={hex} />
      <circle cx="20" cy="18" r="17" fill="none" stroke="white" strokeWidth="2.5" />
      <ellipse cx="13" cy="11" rx="6" ry="3.5" fill="rgba(255,255,255,0.38)" />
      <circle cx="20" cy="18" r="7" fill="rgba(255,255,255,0.52)" />
      <polygon points="20,33 13,54 20,47 27,54" fill={hex} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LudoRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { isConnected, emitEvent, onEvent } = useSocket();
  const [roomState, setRoomState] = useState<LudoRoom | null>(null);

  const { data: roomData, isLoading, refetch } = useQuery({
    queryKey: ["ludo-room", roomId],
    queryFn: () => LudoService.getRoom(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 2000,
  });

  // Normalize any socket/API payload and preserve per-client yourColor.
  // Server broadcasts the same room object to all clients so yourColor is absent.
  const applyRoomUpdate = useCallback((incoming: unknown) => {
    if (!incoming || typeof incoming !== "object") return;
    // Payload can be { room: {...} } or the room object directly
    const raw = (incoming as Record<string, unknown>).room ?? incoming;
    if (!raw || typeof raw !== "object" || !("players" in raw)) return;
    const normalized = normalizeLudoRoom(raw as LudoRoom);
    setRoomState((prev) => ({
      ...normalized,
      yourColor: normalized.yourColor ?? prev?.yourColor,
    }));
  }, []);

  const rollMutation = useMutation({
    mutationFn: () => LudoService.rollDice(roomId),
    onSuccess: ({ data }) => {
      setRoomState(data);
      // Notify room so the opponent's client gets the update instantly
      emitEvent("ludo:room:join", { roomId });
      void refetch();
    },
    onError: (err: unknown) => { toast.error(getErrorMessage(err, "Failed to roll dice")); },
  });

  const moveMutation = useMutation({
    mutationFn: (tokenId: string) => LudoService.moveToken(roomId, tokenId),
    onSuccess: ({ data }) => {
      setRoomState(data);
      emitEvent("ludo:room:join", { roomId });
      void refetch();
    },
    onError: (err: unknown) => { toast.error(getErrorMessage(err, "Failed to move token")); },
  });

  const leaveMutation = useMutation({
    mutationFn: () => LudoService.leaveRoom(roomId),
    onSuccess: () => { toast.success("Left room"); router.push("/games/ludo"); },
    onError: (err: unknown) => { toast.error(getErrorMessage(err, "Failed to leave room")); },
  });

  useEffect(() => {
    if (!isConnected || !roomId) return;
    emitEvent("ludo:room:join", { roomId });

    // Listen to all common event names the server might use
    const offs = [
      onEvent("ludo:room:update",  applyRoomUpdate),
      onEvent("ludo:turn",         applyRoomUpdate),
      onEvent("ludo:state",        applyRoomUpdate),
      onEvent("ludo:dice:rolled",  applyRoomUpdate),
      onEvent("ludo:token:moved",  applyRoomUpdate),
      onEvent("ludo:game:update",  applyRoomUpdate),
      onEvent("ludo:finished", (p: unknown) => {
        applyRoomUpdate(p);
        const winner = (p as Record<string, unknown>)?.winnerName as string | undefined;
        toast.success(winner ? `${winner} won!` : "Match finished");
      }),
    ];

    return () => { offs.forEach((off) => off()); };
  }, [applyRoomUpdate, emitEvent, isConnected, onEvent, roomId]);

  const room     = roomState ?? (roomData?.data ?? null);
  const me       = room?.players.find((p) => p.color === room?.yourColor);
  const opponent = room?.players.find((p) => p.userId !== me?.userId);
  const myTurn   = Boolean(me && room?.currentTurnUserId === me.userId);
  const availSet = useMemo(() => new Set(room?.availableTokenIds ?? []), [room?.availableTokenIds]);
  const canRoll  = myTurn && !rollMutation.isPending && availSet.size === 0;

  // Build the tokenPositions map for LudoBoard
  const tokenPositions = useMemo<Map<string, BoardToken[]>>(() => {
    const map = new Map<string, BoardToken[]>();
    (room?.players ?? []).forEach((player) => {
      (player.tokens ?? []).forEach((token, idx) => {
        const [row, col] = tokenCell(token, player, idx);
        const key = `${row}-${col}`;
        const entry = map.get(key) ?? [];
        const isMyToken = player.userId === me?.userId;
        const isTokenAvailable =
          isMyToken && (availSet.has(token.id) || Boolean(token.canMove));

        entry.push({
          id: token.id,
          color: player.color as BoardToken["color"],
          label: String(token.label ?? idx + 1),
          available: isTokenAvailable,
        });
        map.set(key, entry);
      });
    });
    return map;
  }, [room?.players, availSet, me?.userId]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d2a6e]">
        <div className="flex items-center gap-3 rounded-full bg-white/10 px-6 py-3 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading room…
        </div>
      </div>
    );
  }

  const myColor  = me?.color  ?? "BLUE";
  const oppColor = opponent?.color ?? "GREEN";

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: "radial-gradient(ellipse at 40% 0%, #1e40af 0%, #1e3a8a 35%, #0f172a 100%)",
      }}
    >
      {/* dot pattern */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" />

      {/* ── Top nav ── */}
      <div className="relative z-10 flex items-center justify-between px-3 py-2.5">
        <button
          type="button"
          onClick={() => router.replace("/games/ludo")}
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="flex items-center gap-2">
          <span className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-black",
            isConnected
              ? "border-green-400/30 bg-green-500/15 text-green-300"
              : "border-yellow-400/30 bg-yellow-500/15 text-yellow-300",
          )}>
            {isConnected ? "● LIVE" : "◌ SYNC"}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
            ৳{room.stakeAmount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/70 px-3 py-2 text-xs font-bold text-white"
        >
          <DoorOpen className="h-3.5 w-3.5" /> Leave
        </button>
      </div>

      {/* ── Opponent label ── */}
      <div className="relative z-10 flex justify-end px-4 pb-1">
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5",
          room.currentTurnUserId === opponent?.userId
            ? "border-yellow-400/60 bg-yellow-400/10"
            : "border-white/15 bg-white/8",
        )}>
          <PlayerPin color={oppColor} />
          <span className="text-sm font-black text-white">
            {opponent?.name ?? "Computer"}
          </span>
          {room.currentTurnUserId === opponent?.userId && (
            <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-yellow-900">TURN</span>
          )}
        </div>
      </div>

      {/* ── Board ── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-3 py-1">
        <div
          className="w-full max-w-95 overflow-hidden rounded-xl"
          style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.14), 0 24px 64px rgba(0,0,0,0.55)" }}
        >
          <LudoBoard
            tokenPositions={tokenPositions}
            onMoveToken={(id) => moveMutation.mutate(id)}
          />
        </div>
      </div>

      {/* ── You label ── */}
      <div className="relative z-10 flex justify-start px-4 pt-1">
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5",
          myTurn
            ? "border-yellow-400/60 bg-yellow-400/10"
            : "border-white/15 bg-white/8",
        )}>
          <PlayerPin color={myColor} />
          <span className="text-sm font-black text-white">{me?.name ?? "You"}</span>
          {myTurn && (
            <span className="rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-yellow-900">YOUR TURN</span>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="relative z-10 mx-3 mt-2 mb-4">
        <div
          className="flex items-center rounded-2xl px-4 py-3"
          style={{
            background: "linear-gradient(180deg,#1d4ed8 0%,#1e3a8a 100%)",
            border: "3px solid #f59e0b",
            boxShadow: "0 0 24px rgba(245,158,11,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {/* You */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <PlayerPin color={myColor} />
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-[#fbbf24]">You</p>
              <p className="truncate text-[10px] text-white/70">{me?.name ?? "Player"}</p>
            </div>
          </div>

          {/* Dice */}
          <div className="flex shrink-0 flex-col items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => rollMutation.mutate()}
              disabled={!canRoll}
              className={cn(
                "relative w-17 h-17 rounded-2xl transition-all duration-100 active:translate-y-1",
                canRoll
                  ? "shadow-[0_6px_0_#1e3a8a,0_10px_24px_rgba(59,130,246,0.4)]"
                  : "opacity-50 shadow-[0_3px_0_#64748b]",
              )}
              style={{
                background: canRoll
                  ? "linear-gradient(180deg,#bfdbfe 0%,#60a5fa 30%,#2563eb 100%)"
                  : "linear-gradient(180deg,#e2e8f0 0%,#94a3b8 100%)",
              }}
            >
              {rollMutation.isPending ? (
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-white" />
              ) : (
                <div className="flex items-center justify-center w-full h-full p-2">
                  <DiceSVG value={room.lastDiceValue} size={52} />
                </div>
              )}
            </button>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/45">
              {canRoll ? "TAP ROLL" : myTurn && availSet.size > 0 ? "MOVE TOKEN" : "WAIT…"}
            </p>
          </div>

          {/* Opponent */}
          <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-black uppercase text-[#fbbf24]">Com</p>
              <p className="truncate text-[10px] text-white/70">{opponent?.name ?? "Opp"}</p>
            </div>
            <PlayerPin color={oppColor} />
          </div>
        </div>
      </div>

      {/* Sync */}
      <div className="relative z-10 flex justify-center pb-3">
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-1 text-[10px] font-bold text-white/20"
        >
          ↻ sync
        </button>
      </div>
    </div>
  );
}
