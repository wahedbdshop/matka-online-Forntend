"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Loader2, RefreshCw, Settings2, Trophy, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import {
  calculateLudoNetPrize,
  formatLudoPrizeAmount,
  readStoredLudoCommissionPct,
} from "@/lib/ludo-payout";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { LudoBoard, type LudoColor, type LudoToken as BoardToken } from "@/components/ludo/board";
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

/** 52-cell outer path in 15x15 grid coordinates, clockwise from RED exit. */
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
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0],
];

/** Token home circle positions per color on the 15x15 grid.
 *  Must match the backend LUDO_START_POSITIONS color order. */
const HOME_CELLS: Record<string, Array<[number, number]>> = {
  RED:    [[1,1],  [1,3],  [3,1],  [3,3]],
  GREEN:  [[1,11], [1,13], [3,11], [3,13]],
  BLUE:   [[11,1], [11,3], [13,1], [13,3]],
  YELLOW: [[11,11],[11,13],[13,11],[13,13]],
};

const HOME_LANE_CELLS: Record<string, Array<[number, number]>> = {
  RED:    [[7,1], [7,2], [7,3], [7,4], [7,5], [7,6]],
  GREEN:  [[1,7], [2,7], [3,7], [4,7], [5,7], [6,7]],
  BLUE:   [[13,7], [12,7], [11,7], [10,7], [9,7], [8,7]],
  YELLOW: [[7,13], [7,12], [7,11], [7,10], [7,9], [7,8]],
};

type DisplaySeat = "top-left" | "top-right" | "bottom-right" | "bottom-left";

const DISPLAY_SEAT_PLACEHOLDER_COLOR: Record<DisplaySeat, LudoColor> = {
  "top-left": "RED",
  "top-right": "GREEN",
  "bottom-right": "YELLOW",
  "bottom-left": "BLUE",
};

const PLACEHOLDER_COLOR_TRACK_START_INDEX: Record<LudoColor, number> = {
  RED: 0,
  GREEN: 13,
  YELLOW: 26,
  BLUE: 39,
};

function getDisplaySeatColors(
  viewerColor?: LudoColor,
  opponentColor?: LudoColor,
): Record<DisplaySeat, LudoColor> {
  const allColors: LudoColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];

  if (!viewerColor) {
    return {
      "top-left": "RED",
      "top-right": "GREEN",
      "bottom-right": "YELLOW",
      "bottom-left": "BLUE",
    };
  }

  const used = new Set<LudoColor>([viewerColor]);
  if (opponentColor) used.add(opponentColor);

  const remaining = allColors.filter((color) => !used.has(color));
  const topLeftColor =
    remaining.find((color) => color === "YELLOW") ??
    remaining[0] ??
    "YELLOW";
  const bottomRightColor =
    remaining.find((color) => color !== topLeftColor) ??
    topLeftColor;

  return {
    "top-left": topLeftColor,
    "top-right": opponentColor ?? "GREEN",
    "bottom-right": bottomRightColor,
    "bottom-left": viewerColor,
  };
}

function getDisplaySeatForColor(
  color: LudoColor,
  seatColors: Record<DisplaySeat, LudoColor>,
): DisplaySeat {
  return (
    (Object.entries(seatColors).find(([, seatColor]) => seatColor === color)?.[0] as DisplaySeat | undefined) ??
    "bottom-left"
  );
}

function getPlaceholderColorForSeat(seat: DisplaySeat): LudoColor {
  return DISPLAY_SEAT_PLACEHOLDER_COLOR[seat];
}

function getTrackProgress(token: LudoToken, color: LudoColor) {
  if (typeof token.stepsMoved === "number" && token.stepsMoved > 0) {
    return token.stepsMoved - 1;
  }

  const boardPosition =
    token.boardPosition ??
    (typeof token.position === "number" && token.position > 0
      ? token.position - 1
      : null);

  if (typeof boardPosition !== "number" || boardPosition < 0) {
    return null;
  }

  const absoluteStartIndex = PLACEHOLDER_COLOR_TRACK_START_INDEX[color];
  return (boardPosition - absoluteStartIndex + TRACK.length) % TRACK.length;
}

const LUDO_SOUND_ENABLED_KEY = "ludo.sound.enabled";
const LUDO_SOUND_VOLUME_KEY = "ludo.sound.volume";

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


/** Convert game token state → 15×15 [row, col]. */
function tokenCell(
  token: LudoToken,
  player: LudoRoomPlayer,
  idx: number,
  seatColors: Record<DisplaySeat, LudoColor>,
): [number, number] {
  // Server positions stay absolute; the client remaps them into viewer-relative
  // seats so "you" always render bottom-left and the opponent top-right.
  const displaySeat = getDisplaySeatForColor(player.color, seatColors);
  const placeholderColor = getPlaceholderColorForSeat(displaySeat);

  if (token.status === "HOME") {
    return HOME_CELLS[placeholderColor]?.[idx] ?? [1, 1];
  }

  if (
    typeof token.homeLanePosition === "number" &&
    token.homeLanePosition > 0
  ) {
    const laneIndex = Math.min(token.homeLanePosition, 6) - 1;
    return HOME_LANE_CELLS[placeholderColor]?.[laneIndex] ?? [7, 7];
  }

  if (token.status === "GOAL" || token.status === "FINISHED") {
    return HOME_LANE_CELLS[placeholderColor]?.[5] ?? [7, 7];
  }

  const progress = getTrackProgress(token, player.color);
  if (typeof progress === "number") {
    const displayStartIndex = PLACEHOLDER_COLOR_TRACK_START_INDEX[placeholderColor];
    return TRACK[(displayStartIndex + progress) % TRACK.length] ?? [7, 7];
  }

  return HOME_CELLS[placeholderColor]?.[idx] ?? [7, 7];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dice face SVG
// ─────────────────────────────────────────────────────────────────────────────
function tokenTrackPosition(token: LudoToken) {
  if (
    typeof token.homeLanePosition === "number" &&
    token.homeLanePosition > 0
  ) {
    return null;
  }

  const position =
    token.boardPosition ??
    (typeof token.stepsMoved === "number" && token.stepsMoved > 0
      ? token.stepsMoved - 1
      : token.position - 1);

  return typeof position === "number" && position >= 0
    ? position % TRACK.length
    : null;
}

function tokenTravelPath(token: LudoToken) {
  const currentPosition = tokenTrackPosition(token);
  if (currentPosition === null) return [];

  const steps = Math.max(1, token.stepsMoved ?? token.position ?? 1);
  return Array.from({ length: steps }, (_, index) => {
    const offset = steps - index - 1;
    return (currentPosition - offset + TRACK.length) % TRACK.length;
  });
}

type CaptureReturn = {
  userId: string;
  tokenId: string;
  path: number[];
};

type TokenMoveAnimation = {
  userId: string;
  tokenId: string;
  fromProgress: number;
  toProgress: number;
};

function roomWithCaptureReturnFrame(
  room: LudoRoom,
  captures: CaptureReturn[],
  frameIndex: number,
): LudoRoom {
  return {
    ...room,
    players: room.players.map((player) => ({
      ...player,
      tokens: player.tokens.map((token) => {
        const capture = captures.find(
          (item) => item.userId === player.userId && item.tokenId === token.id,
        );
        if (!capture) return token;

        const boardPosition = capture.path[frameIndex];
        if (boardPosition === undefined) return token;

        return {
          ...token,
          status: "PLAYING" as const,
          canMove: false,
          position: boardPosition + 1,
          stepsMoved: Math.max(1, capture.path.length - frameIndex),
          boardPosition,
          homeLanePosition: null,
        };
      }),
    })),
  };
}

function DiceSVG({ value, size = 56 }: { value?: number | null; size?: number }) {
  const dots: Record<number, Array<[number, number]>> = {
    1: [[50,50]],
    2: [[28,28],[72,72]],
    3: [[28,28],[50,50],[72,72]],
    4: [[28,28],[72,28],[28,72],[72,72]],
    5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
    6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
  };
  const safeValue = typeof value === "number" && value in dots ? value : 1;
  const pts = dots[safeValue];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`dice-body-${safeValue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#63d9ff" />
          <stop offset="100%" stopColor="#1dbbf4" />
        </linearGradient>
      </defs>
      <rect x={7} y={10} width={86} height={86} rx={24} fill="rgba(16,72,108,0.28)" />
      <rect x={4} y={4} width={86} height={86} rx={24} fill={`url(#dice-body-${safeValue})`} stroke="#178fcb" strokeWidth="2" />
      <rect x={12} y={10} width={62} height={20} rx={10} fill="rgba(255,255,255,0.28)" />
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={8.2} fill="#f8fafc" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small inline token icon (for bottom bar)
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  RED: "#ef1d26", GREEN: "#08ae4d", BLUE: "#2ba8ef", YELLOW: "#ffd61f",
};

function PlayerPin({ color }: { color: string }) {
  const hex = COLOR_HEX[color] ?? "#888";
  return (
    <svg width="28" height="40" viewBox="0 0 40 56">
      <ellipse cx="20" cy="53" rx="7.2" ry="2.6" fill="rgba(0,0,0,0.2)" />
      <path
        d="M20 51 C15.6 45.4 8.8 38.8 8.8 27.8 C8.8 18.3 14.7 11.8 20 11.8 C25.3 11.8 31.2 18.3 31.2 27.8 C31.2 38.8 24.4 45.4 20 51 Z"
        fill="white"
        stroke="#475569"
        strokeWidth="1.4"
      />
      <circle cx="20" cy="28" r="9.6" fill="white" stroke="rgba(148,163,184,0.8)" strokeWidth="1" />
      <circle cx="20" cy="28" r="7.5" fill={hex} stroke="rgba(51,65,85,0.5)" strokeWidth="1" />
      <ellipse cx="17.1" cy="23.2" rx="3" ry="1.8" fill="rgba(255,255,255,0.58)" transform="rotate(-22 17.1 23.2)" />
    </svg>
  );
}

function AutoMoveDots({ count = 0 }: { count?: number }) {
  const safeCount = Math.max(0, Math.min(5, count));

  return (
    <div className="mt-1 flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            index < safeCount ? "bg-red-400" : "bg-white/25",
          )}
        />
      ))}
    </div>
  );
}

function getPlayerLabel(player?: LudoRoomPlayer | null, fallback = "Player") {
  return player?.username?.trim() || player?.name?.trim() || fallback;
}

function getPlayerSubLabel(player?: LudoRoomPlayer | null, fallback = "Player") {
  return player?.name?.trim() || player?.username?.trim() || fallback;
}

function getPlayerInitials(player?: LudoRoomPlayer | null, fallback = "P") {
  const source = player?.name?.trim() || player?.username?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function PlayerAvatarBadge({
  player,
  color,
  active = false,
  countdownProgress = null,
  danger = false,
  className,
}: {
  player?: LudoRoomPlayer | null;
  color: string;
  active?: boolean;
  countdownProgress?: number | null;
  danger?: boolean;
  className?: string;
}) {
  const initials = getPlayerInitials(player);
  const ringColor = danger ? "#ff5b57" : "#f5b414";
  const showTurnRing = active && countdownProgress !== null;

  return (
    <div
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] bg-white p-1 shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-all duration-300 ease-out",
        active && "shadow-[0_0_0_3px_rgba(255,219,92,0.35),0_10px_24px_rgba(0,0,0,0.32)]",
        className,
      )}
      style={{
        borderColor: active ? "#38ff6b" : color,
        ...(showTurnRing
          ? {
              background: `conic-gradient(from -90deg, ${ringColor} 0deg, ${ringColor} ${countdownProgress * 360}deg, rgba(255,255,255,0.14) ${countdownProgress * 360}deg, rgba(255,255,255,0.14) 360deg)`,
            }
          : {}),
      }}
    >
      {active && (
        <span
          className="pointer-events-none absolute -inset-[6px] rounded-full border-2 shadow-[0_0_18px_rgba(255,230,92,0.34)] animate-[ludo-turn-avatar-ring_1.8s_ease-in-out_infinite]"
          style={{ borderColor: danger ? "rgba(255,91,87,0.85)" : "rgba(255,240,168,0.8)" }}
        />
      )}
      <div
        className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-black uppercase text-white"
        style={{
          background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
        }}
      >
        {initials}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
function LudoResultOverlay({
  result,
  winnerName,
  runnerUpName,
  stakeAmount,
  commissionPct,
  onConfirm,
}: {
  result: "win" | "loss";
  winnerName: string;
  runnerUpName: string;
  stakeAmount: number;
  commissionPct: number;
  onConfirm: () => void;
}) {
  const isWin = result === "win";
  const isPaidMatch = Number(stakeAmount) > 0;
  const winAmount = isPaidMatch
    ? calculateLudoNetPrize(Number(stakeAmount), commissionPct)
    : 0;
  const particles = Array.from({ length: isWin ? 30 : 20 });
  const winnerPrizeLabel = isPaidMatch
    ? `BDT ${formatLudoPrizeAmount(winAmount)}`
    : "FREE";
  const panelGradient = isWin
    ? "from-[#2e0717] via-[#17112f] to-[#08112a]"
    : "from-[#1f2f55] via-[#131d39] to-[#09101f]";
  const boardGradient = isWin
    ? "from-[#452645]/95 via-[#23192f]/95 to-[#161a2a]/95"
    : "from-[#22334f]/95 via-[#18243b]/95 to-[#101727]/95";

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/58 px-4 text-white backdrop-blur-[3px] ludo-result-fade",
    )}>
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((_, index) => (
          <span
            key={index}
            className={cn("absolute block", isWin ? "ludo-firework rounded-full" : "ludo-rain rounded-full")}
            style={{
              left: `${(index * 29) % 100}%`,
              top: isWin ? `${(index * 17) % 100}%` : `${-10 - (index % 8) * 9}%`,
              animationDelay: `${(index % 10) * 0.16}s`,
              background: isWin
                ? ["#facc15", "#fb7185", "#60a5fa", "#34d399"][index % 4]
                : "#93c5fd",
            }}
          />
        ))}
      </div>

      {isWin && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="ludo-star absolute text-2xl"
              style={{
                left: `${(index * 37) % 100}%`,
                top: `${(index * 23) % 100}%`,
                animationDelay: `${index * 0.12}s`,
              }}
            >
              *
            </span>
          ))}
        </div>
      )}

      <div className={cn(
        "relative z-10 w-full max-w-[360px] rounded-[28px] border border-white/15 bg-gradient-to-b p-4 text-center shadow-[0_25px_70px_rgba(0,0,0,0.52)] ludo-result-pop",
        panelGradient,
      )}>
        <div className="absolute inset-x-6 top-0 h-14 rounded-b-[24px] bg-white/8 blur-2xl" />

        <div className="relative mx-auto mt-1 inline-flex min-h-12 items-center justify-center px-8">
          <span className="absolute inset-0 bg-[linear-gradient(180deg,#f56f92_0%,#d94676_100%)] shadow-[0_12px_20px_rgba(216,70,118,0.35)] [clip-path:polygon(0_22%,8%_22%,12%_0,88%_0,92%_22%,100%_22%,94%_100%,6%_100%)]" />
          <span className="relative text-[2rem] font-black uppercase tracking-[0.08em] text-[#ffd94f] drop-shadow-[0_2px_0_rgba(105,31,53,0.9)]">
            Results
          </span>
        </div>

        <div className={cn(
          "mt-5 rounded-[24px] border border-white/12 bg-gradient-to-b px-4 pb-5 pt-4",
          boardGradient,
        )}>
          <div className="rounded-[18px] border border-white/12 bg-black/20 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/8 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f9d248] text-[#714500] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-base font-black text-white">{winnerName}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">
                  Winner
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-900 shadow-[inset_0_-2px_0_rgba(15,23,42,0.12)]">
                {winnerPrizeLabel}
              </div>
            </div>

            <div className="mt-3 rounded-[14px] border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-sm font-black text-white/90">
                2nd {runnerUpName}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-white/62">
              Match Result
            </p>
            <p className={cn(
              "mt-2 text-lg font-black",
              isWin ? "text-[#ffd95c]" : "text-[#d7e6ff]",
            )}>
              {isWin ? "You won this round" : "Opponent won this round"}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/60">
              Press OK to return to the Ludo lobby
            </p>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            className="mt-5 inline-flex h-14 min-w-[122px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#ffd454_0%,#f1a92b_100%)] px-8 text-xl font-black text-[#6e3b00] shadow-[0_10px_0_#b26b11,0_16px_28px_rgba(0,0,0,0.28)] transition-transform duration-150 hover:translate-y-[1px] active:translate-y-[2px]"
          >
            OK
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ludo-result-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ludo-result-pop {
          0% { transform: scale(.55); opacity: 0; }
          72% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ludo-firework {
          0% { transform: scale(.2) translateY(0); opacity: 0; }
          22% { opacity: 1; }
          100% { transform: scale(1.8) translateY(-90px); opacity: 0; }
        }
        @keyframes ludo-rain {
          0% { transform: translateY(-20vh); opacity: 0; }
          18% { opacity: .75; }
          100% { transform: translateY(120vh); opacity: 0; }
        }
        @keyframes ludo-star-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: .35; }
          50% { transform: translateY(-18px) rotate(18deg); opacity: 1; }
        }
        .ludo-result-fade { animation: ludo-result-fade .35s ease-out both; }
        .ludo-result-pop { animation: ludo-result-pop .65s cubic-bezier(.2,1.4,.4,1) both; }
        .ludo-firework { width: 9px; height: 9px; animation: ludo-firework 1.35s ease-out infinite; box-shadow: 0 0 18px currentColor; }
        .ludo-rain { width: 3px; height: 26px; animation: ludo-rain 1.7s linear infinite; opacity: .7; }
        .ludo-star { animation: ludo-star-float 2.2s ease-in-out infinite; color: #fde68a; text-shadow: 0 0 12px rgba(250,204,21,.9); }
      `}</style>
    </div>
  );
}

export default function LudoRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { isConnected, emitEvent, onEvent } = useSocket();
  const authUserId = useAuthStore((state) => state.user?.id);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [roomState, setRoomState] = useState<LudoRoom | null>(null);
  const [lastVisibleDiceValue, setLastVisibleDiceValue] = useState(1);
  const [lastRolledByUserId, setLastRolledByUserId] = useState<string | null>(null);
  const [activeDiceOwnerId, setActiveDiceOwnerId] = useState<string | null>(null);
  const [tokenMoveLocked, setTokenMoveLocked] = useState(false);
  const [thirdSixPenaltyPending, setThirdSixPenaltyPending] = useState(false);
  const [idleDiceValue] = useState(() => Math.floor(Math.random() * 6) + 1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [soundPrefsReady, setSoundPrefsReady] = useState(false);
  const [storedCommissionPct, setStoredCommissionPct] = useState(0);
  const [sharedTurnCountdown, setSharedTurnCountdown] = useState<number | null>(null);
  const latestRoomRef = useRef<LudoRoom | null>(null);
  const pendingRoomUpdateRef = useRef<unknown | null>(null);
  const pendingCombinedRollRoomRef = useRef<LudoRoom | null>(null);
  const applyRoomUpdateRef = useRef<(incoming: unknown) => void>(() => {});
  const tokenPathHistoryRef = useRef<Map<string, number[]>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const diceSoundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceSoundStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultSoundKeyRef = useRef<string | null>(null);
  const roomRefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step-by-step movement animation ─────────────────────────────────────
  // preMoveRoomRef: snapshot of room taken just before the move API call.
  // animTimersRef: active setTimeout IDs so we can cancel mid-animation.
  // isAnimatingRef: true from the moment the user taps a token until the
  //   animation fully ends — blocks applyRoomUpdate so that the socket
  //   broadcast (which arrives before onSuccess) cannot jump the token to
  //   the final position before the step-walk animation plays.
  // animRoom: intermediate room state shown during animation (overrides room).
  const preMoveRoomRef  = useRef<LudoRoom | null>(null);
  const animTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isAnimatingRef  = useRef(false);
  const [animRoom, setAnimRoom] = useState<LudoRoom | null>(null);

  // ── Three consecutive 6s rule ────────────────────────────────────────────
  // Tracks how many 6s in a row the current player has rolled.
  // On the 3rd consecutive 6, the backend passes the turn to the opponent.
  const consecutiveSixRef = useRef(0);

  // ── Roll countdown timer ─────────────────────────────────────────────────
  // Each turn the current player has ROLL_TIMEOUT_SEC seconds to roll the
  // dice. A draining ring shows the remaining time. When it hits 0 the dice
  // is auto-rolled so the turn passes to the opponent.
  const ROLL_TIMEOUT_SEC = 20;
  const LOCAL_DICE_ROLL_MS = 460;
  const REMOTE_DICE_ROLL_MS = 280;
  const DICE_SETTLE_MS = 0;
  const LOCAL_DICE_ANIMATION_MS = LOCAL_DICE_ROLL_MS + DICE_SETTLE_MS;
  const REMOTE_DICE_ANIMATION_MS = REMOTE_DICE_ROLL_MS + DICE_SETTLE_MS;
  const [rollCountdown, setRollCountdown] = useState<number | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollAutoRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const turnWarningPlayedRef = useRef<string | null>(null);
  const [diceFaceValue, setDiceFaceValue] = useState(1);
  const [diceAnimationState, setDiceAnimationState] = useState<"idle" | "rolling">("idle");
  const diceShuffleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRollPendingRef = useRef(false);
  const diceRollStartRef = useRef<number | null>(null);

  const { data: roomData, isLoading, refetch } = useQuery({
    queryKey: ["ludo-room", roomId],
    queryFn: () => LudoService.getRoom(roomId),
    enabled: Boolean(roomId),
    refetchInterval: isConnected ? false : 2500,
  });

  const scheduleRoomRefetch = useCallback(() => {
    if (roomRefetchTimeoutRef.current) {
      clearTimeout(roomRefetchTimeoutRef.current);
    }

    roomRefetchTimeoutRef.current = setTimeout(() => {
      roomRefetchTimeoutRef.current = null;
      void refetch();
    }, 260);
  }, [refetch]);

  const schedulePenaltySync = useCallback(() => {
    scheduleRoomRefetch();
    setTimeout(() => {
      void refetch();
    }, 700);
  }, [refetch, scheduleRoomRefetch]);

  useEffect(() => {
    const enabled = window.localStorage.getItem(LUDO_SOUND_ENABLED_KEY);
    const volume = window.localStorage.getItem(LUDO_SOUND_VOLUME_KEY);
    if (enabled !== null) setSoundEnabled(enabled === "true");
    if (volume !== null) {
      const parsed = Number(volume);
      if (Number.isFinite(parsed)) {
        setSoundVolume(Math.max(0, Math.min(1, parsed)));
      }
    }
    setSoundPrefsReady(true);
  }, []);

  useEffect(() => {
    const storedValue = readStoredLudoCommissionPct();
    if (storedValue !== null) {
      setStoredCommissionPct(storedValue);
    }
  }, []);

  useEffect(() => {
    if (!soundPrefsReady) return;
    window.localStorage.setItem(LUDO_SOUND_ENABLED_KEY, String(soundEnabled));
    window.localStorage.setItem(LUDO_SOUND_VOLUME_KEY, String(soundVolume));
  }, [soundEnabled, soundPrefsReady, soundVolume]);

  useEffect(() => {
    if (!settingsMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (settingsMenuRef.current?.contains(target)) return;
      setSettingsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuOpen]);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number,
    duration = 0.08,
    type: OscillatorType = "sine",
    gainValue = 0.18,
  ) => {
    if (!soundEnabled || soundVolume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainValue * soundVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [getAudioContext, soundEnabled, soundVolume]);

  const playNoise = useCallback((duration = 0.12, gainValue = 0.14) => {
    if (!soundEnabled || soundVolume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(gainValue * soundVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, [getAudioContext, soundEnabled, soundVolume]);

  const stopDiceSound = useCallback(() => {
    if (diceSoundIntervalRef.current) {
      clearInterval(diceSoundIntervalRef.current);
      diceSoundIntervalRef.current = null;
    }
    if (diceSoundStopRef.current) {
      clearTimeout(diceSoundStopRef.current);
      diceSoundStopRef.current = null;
    }
  }, []);

  const startDiceSound = useCallback((durationMs?: number) => {
    if (!soundEnabled || soundVolume <= 0) return;
    stopDiceSound();
    playNoise(0.07, 0.09);
    playTone(170, 0.045, "triangle", 0.08);
    diceSoundIntervalRef.current = setInterval(() => {
      playNoise(0.055, 0.075);
      playTone(140 + Math.random() * 120, 0.035, "triangle", 0.055);
    }, 90);
    if (durationMs) {
      diceSoundStopRef.current = setTimeout(stopDiceSound, durationMs);
    }
  }, [playNoise, playTone, soundEnabled, soundVolume, stopDiceSound]);

  const clearDiceVisualTimers = useCallback(() => {
    if (diceShuffleIntervalRef.current) {
      clearInterval(diceShuffleIntervalRef.current);
      diceShuffleIntervalRef.current = null;
    }
    if (diceSettleTimeoutRef.current) {
      clearTimeout(diceSettleTimeoutRef.current);
      diceSettleTimeoutRef.current = null;
    }
    if (diceIdleTimeoutRef.current) {
      clearTimeout(diceIdleTimeoutRef.current);
      diceIdleTimeoutRef.current = null;
    }
  }, []);

  const startDiceRollVisual = useCallback(() => {
    clearDiceVisualTimers();
    setTokenMoveLocked(true);
    diceRollStartRef.current = Date.now();
    setDiceAnimationState("rolling");
    setDiceFaceValue(Math.floor(Math.random() * 6) + 1);
  }, [clearDiceVisualTimers]);

  const settleDiceRollVisual = useCallback((finalValue: number, minimumRollMs = 0) => {
    if (diceSettleTimeoutRef.current) {
      clearTimeout(diceSettleTimeoutRef.current);
      diceSettleTimeoutRef.current = null;
    }
    if (diceIdleTimeoutRef.current) {
      clearTimeout(diceIdleTimeoutRef.current);
      diceIdleTimeoutRef.current = null;
    }

    const elapsed =
      diceRollStartRef.current == null ? minimumRollMs : Date.now() - diceRollStartRef.current;
    const remainingRollMs = Math.max(0, minimumRollMs - elapsed);

    diceSettleTimeoutRef.current = setTimeout(() => {
      if (diceShuffleIntervalRef.current) {
        clearInterval(diceShuffleIntervalRef.current);
        diceShuffleIntervalRef.current = null;
      }
      setDiceFaceValue(finalValue);
      diceIdleTimeoutRef.current = setTimeout(() => {
        setDiceAnimationState("idle");
        setActiveDiceOwnerId(null);
        setTokenMoveLocked(false);
        localRollPendingRef.current = false;
        diceRollStartRef.current = null;
      }, DICE_SETTLE_MS);
    }, remainingRollMs);
  }, [DICE_SETTLE_MS]);

  const getRemainingDiceAnimationMs = useCallback((minimumRollMs: number) => {
    const elapsed =
      diceRollStartRef.current == null ? 0 : Date.now() - diceRollStartRef.current;

    return Math.max(0, minimumRollMs - elapsed) + DICE_SETTLE_MS;
  }, [DICE_SETTLE_MS]);

  useEffect(() => {
    return () => {
      clearDiceVisualTimers();
      if (roomRefetchTimeoutRef.current) {
        clearTimeout(roomRefetchTimeoutRef.current);
        roomRefetchTimeoutRef.current = null;
      }
    };
  }, [clearDiceVisualTimers]);

  const playStepSound = useCallback(() => {
    playTone(620, 0.035, "square", 0.09);
  }, [playTone]);

  const playKillSound = useCallback(() => {
    playNoise(0.22, 0.32);
    playTone(92, 0.22, "sawtooth", 0.18);
  }, [playNoise, playTone]);

  const playWinSound = useCallback(() => {
    [523, 659, 784].forEach((frequency, index) => {
      setTimeout(() => playTone(frequency, 0.11, "triangle", 0.12), index * 85);
    });
  }, [playTone]);

  const playLossSound = useCallback(() => {
    [330, 247, 196].forEach((frequency, index) => {
      setTimeout(() => playTone(frequency, 0.18, "sine", 0.1), index * 140);
    });
  }, [playTone]);

  const playTurnWarningSound = useCallback(() => {
    [0, 1, 2, 3, 4].forEach((step) => {
      setTimeout(() => {
        playTone(880, 0.06, "triangle", 0.11);
        setTimeout(() => playTone(740, 0.08, "triangle", 0.09), 80);
      }, step * 1000);
    });
  }, [playTone]);

  useEffect(() => {
    if (soundEnabled && soundVolume > 0) return;
    stopDiceSound();
  }, [soundEnabled, soundVolume, stopDiceSound]);

  useEffect(() => {
    return () => {
      stopDiceSound();
      const audioContext = audioContextRef.current;
      audioContextRef.current = null;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, [stopDiceSound]);

  const rememberTokenPaths = useCallback((nextRoom: LudoRoom) => {
    nextRoom.players.forEach((player) => {
      player.tokens.forEach((token) => {
        if (token.status === "HOME") {
          tokenPathHistoryRef.current.set(token.id, []);
          return;
        }

        const path = tokenTravelPath(token);
        if (path.length > 0) {
          tokenPathHistoryRef.current.set(token.id, path);
        }
      });
    });
  }, []);

  const getCapturedReturns = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom) => {
    const captures: CaptureReturn[] = [];

    for (const fromPlayer of fromRoom.players) {
      const toPlayer = toRoom.players.find(
        (player) => player.userId === fromPlayer.userId,
      );
      if (!toPlayer) continue;

      for (const fromToken of fromPlayer.tokens) {
        const toToken = toPlayer.tokens.find((token) => token.id === fromToken.id);
        if (!toToken) continue;

        const wasOnBoard =
          fromToken.status !== "HOME" && tokenTrackPosition(fromToken) !== null;
        const returnedHome = toToken.status === "HOME";
        if (!wasOnBoard || !returnedHome) continue;

        const storedPath = tokenPathHistoryRef.current.get(fromToken.id) ?? [];
        const fallbackPath = tokenTravelPath(fromToken);
        const forwardPath = storedPath.length > 0 ? storedPath : fallbackPath;
        const returnPath = [...forwardPath].reverse();

        if (returnPath.length > 0) {
          captures.push({
            userId: fromPlayer.userId,
            tokenId: fromToken.id,
            path: returnPath,
          });
        }
      }
    }

    return captures;
  }, []);

  const getTokenProgressForAnimation = useCallback((token: LudoToken, color: LudoColor) => {
    if (token.status === "HOME") return -1;

    if (
      typeof token.homeLanePosition === "number" &&
      token.homeLanePosition > 0
    ) {
      return TRACK.length + Math.min(token.homeLanePosition, 6) - 1;
    }

    if (token.status === "GOAL" || token.status === "FINISHED") {
      return TRACK.length + HOME_LANE_CELLS[color].length - 1;
    }

    return getTrackProgress(token, color);
  }, []);

  const findTokenMoveAnimation = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom): TokenMoveAnimation | null => {
    for (const toPlayer of toRoom.players) {
      const fromPlayer = fromRoom.players.find(
        (player) => player.userId === toPlayer.userId,
      );
      if (!fromPlayer) continue;

      for (const toToken of toPlayer.tokens) {
        const fromToken = fromPlayer.tokens.find((token) => token.id === toToken.id);
        if (!fromToken) continue;

        const fromProgress = getTokenProgressForAnimation(
          fromToken,
          toPlayer.color as LudoColor,
        );
        const toProgress = getTokenProgressForAnimation(
          toToken,
          toPlayer.color as LudoColor,
        );

        if (
          typeof fromProgress !== "number" ||
          typeof toProgress !== "number" ||
          toProgress <= fromProgress
        ) {
          continue;
        }

        const steps = toProgress - fromProgress;
        if (steps > 0 && steps <= 6) {
          return {
            userId: toPlayer.userId,
            tokenId: toToken.id,
            fromProgress,
            toProgress,
          };
        }
      }
    }

    return null;
  }, [getTokenProgressForAnimation]);

  const roomWithMoveProgress = useCallback((
    fromRoom: LudoRoom,
    move: TokenMoveAnimation,
    progress: number,
  ): LudoRoom => ({
    ...fromRoom,
    players: fromRoom.players.map((player) =>
      player.userId !== move.userId
        ? player
        : {
            ...player,
            tokens: player.tokens.map((token) => {
              if (token.id !== move.tokenId) return token;

              if (progress < TRACK.length) {
                return {
                  ...token,
                  status: "TRACK" as const,
                  canMove: false,
                  stepsMoved: progress + 1,
                  position: progress + 1,
                  boardPosition: null,
                  homeLanePosition: null,
                };
              }

              const homeLanePosition = Math.min(
                HOME_LANE_CELLS[player.color].length,
                progress - TRACK.length + 1,
              );

              return {
                ...token,
                status: "TRACK" as const,
                canMove: false,
                stepsMoved: progress + 1,
                position: progress + 1,
                boardPosition: null,
                homeLanePosition,
              };
            }),
          },
    ),
  }), []);

  const didTokenFinish = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom) =>
    fromRoom.players.some((fromPlayer) => {
      const toPlayer = toRoom.players.find((player) => player.userId === fromPlayer.userId);
      return fromPlayer.tokens.some((fromToken) => {
        const toToken = toPlayer?.tokens.find((token) => token.id === fromToken.id);
        return Boolean(
          toToken &&
            fromToken.status !== "GOAL" &&
            fromToken.status !== "FINISHED" &&
            (toToken.status === "GOAL" || toToken.status === "FINISHED"),
        );
      });
    }), []);

  const flushPendingRoomUpdate = useCallback(() => {
    if (isAnimatingRef.current || !pendingRoomUpdateRef.current) return;
    const pendingUpdate = pendingRoomUpdateRef.current;
    pendingRoomUpdateRef.current = null;
    applyRoomUpdateRef.current(pendingUpdate);
  }, []);

  function applyNormalizedRoomUpdate(nextRoom: LudoRoom) {
    const previousRoom = latestRoomRef.current;
    const nextDiceValue =
      typeof nextRoom.lastDiceValue === "number" ? nextRoom.lastDiceValue : null;
    const hasExplicitDiceEvent =
      typeof nextRoom.rolledDiceValue === "number" &&
      nextRoom.rolledDiceValue >= 1 &&
      nextRoom.rolledDiceValue <= 6;
    const didDiceChange = Boolean(
      previousRoom &&
      nextDiceValue !== null &&
      (hasExplicitDiceEvent || nextDiceValue !== previousRoom.lastDiceValue),
    );

    if (didDiceChange && previousRoom) {
      const diceOwnerId = previousRoom.currentTurnUserId ?? null;
      setLastRolledByUserId(diceOwnerId);
      if (localRollPendingRef.current) {
        setActiveDiceOwnerId(diceOwnerId);
      } else {
        setActiveDiceOwnerId(null);
        setTokenMoveLocked(false);
      }
    }

    if (didDiceChange && previousRoom && findTokenMoveAnimation(previousRoom, nextRoom)) {
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
      latestRoomRef.current = nextRoom;
      setRoomState(nextRoom);
      setAnimRoom(previousRoom);
      isAnimatingRef.current = true;

      const delayMs = localRollPendingRef.current
        ? getRemainingDiceAnimationMs(REMOTE_DICE_ROLL_MS)
        : 0;
      const timer = setTimeout(() => {
        playTokenMoveAnimation(previousRoom, nextRoom);
      }, delayMs);

      animTimersRef.current.push(timer);
      return;
    }

    if (previousRoom && playTokenMoveAnimation(previousRoom, nextRoom)) {
      return;
    }

    if (previousRoom && playCaptureReturnAnimation(previousRoom, nextRoom)) {
      return;
    }

    latestRoomRef.current = nextRoom;
    rememberTokenPaths(nextRoom);
    if (previousRoom && didTokenFinish(previousRoom, nextRoom)) {
      playWinSound();
    }
    setRoomState(nextRoom);
  }

  const playCaptureReturnAnimation = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom) => {
    const captures = getCapturedReturns(fromRoom, toRoom);
    const maxFrames = Math.max(0, ...captures.map((capture) => capture.path.length));
    if (captures.length === 0 || maxFrames === 0) {
      rememberTokenPaths(toRoom);
      return false;
    }

    playKillSound();
    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];
    latestRoomRef.current = toRoom;
    setRoomState(toRoom);
    setAnimRoom(roomWithCaptureReturnFrame(toRoom, captures, 0));
    isAnimatingRef.current = true;

    for (let frame = 1; frame <= maxFrames; frame++) {
      const timer = setTimeout(() => {
        if (frame === maxFrames) {
          isAnimatingRef.current = false;
          animTimersRef.current = [];
          setAnimRoom(null);
          rememberTokenPaths(toRoom);
          flushPendingRoomUpdate();
          return;
        }

        playStepSound();
        setAnimRoom(roomWithCaptureReturnFrame(toRoom, captures, frame));
      }, frame * 70);

      animTimersRef.current.push(timer);
    }

    return true;
  }, [flushPendingRoomUpdate, getCapturedReturns, playKillSound, playStepSound, rememberTokenPaths]);

  const finishMoveAnimation = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom) => {
    setAnimRoom(null);

    if (playCaptureReturnAnimation(fromRoom, toRoom)) {
      return;
    }

    if (didTokenFinish(fromRoom, toRoom)) {
      playWinSound();
    }

    isAnimatingRef.current = false;
    latestRoomRef.current = toRoom;
    rememberTokenPaths(toRoom);
    setRoomState(toRoom);
    flushPendingRoomUpdate();
  }, [didTokenFinish, flushPendingRoomUpdate, playCaptureReturnAnimation, playWinSound, rememberTokenPaths]);

  const playTokenMoveAnimation = useCallback((fromRoom: LudoRoom, toRoom: LudoRoom) => {
    const move = findTokenMoveAnimation(fromRoom, toRoom);
    if (!move) return false;

    const steps = move.toProgress - move.fromProgress;
    if (steps <= 0) return false;
    const stepDurationMs =
      steps >= 6 ? 130 :
      steps >= 5 ? 145 :
      steps >= 4 ? 165 :
      steps >= 3 ? 185 :
      220;

    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];
    latestRoomRef.current = toRoom;
    setRoomState(toRoom);
    isAnimatingRef.current = true;
    setAnimRoom(fromRoom);

    if (steps === 1) {
      playStepSound();
      finishMoveAnimation(fromRoom, toRoom);
      return true;
    }

    for (let step = 1; step <= steps; step++) {
      const progress = move.fromProgress + step;
      const isLast = step === steps;

      const timer = setTimeout(() => {
        playStepSound();

        if (isLast) {
          animTimersRef.current = [];
          finishMoveAnimation(fromRoom, toRoom);
          return;
        }

        setAnimRoom(roomWithMoveProgress(fromRoom, move, progress));
      }, step * stepDurationMs);

      animTimersRef.current.push(timer);
    }

    return true;
  }, [findTokenMoveAnimation, finishMoveAnimation, playStepSound, roomWithMoveProgress]);

  // Normalize any socket/API payload and preserve per-client yourColor.
  // Server broadcasts the same room object to all clients so yourColor is absent.
  const applyRoomUpdate = useCallback((incoming: unknown) => {
    if (isAnimatingRef.current) {
      pendingRoomUpdateRef.current = incoming;
      return;
    }

    if (!incoming || typeof incoming !== "object") return;
    // Payload can be { room: {...} } or the room object directly
    const incomingRecord = incoming as Record<string, unknown>;
    const raw = incomingRecord.room ?? incoming;
    if (!raw || typeof raw !== "object" || !("players" in raw)) return;
    const payloadDiceValue =
      typeof incomingRecord.diceValue === "number"
        ? incomingRecord.diceValue
        : typeof incomingRecord.lastDiceValue === "number"
          ? incomingRecord.lastDiceValue
          : null;
    const normalized = normalizeLudoRoom({
      ...(raw as LudoRoom),
      rolledDiceValue: payloadDiceValue,
      lastDiceValue:
        payloadDiceValue ??
        ((raw as LudoRoom).lastDiceValue ?? null),
    });
    const previousRoom = latestRoomRef.current;
    if (payloadDiceValue != null) {
      setLastRolledByUserId(
        previousRoom?.currentTurnUserId ??
        (typeof normalized.currentTurnUserId === "string" ? normalized.currentTurnUserId : null),
      );
    }
    const nextRoom = {
      ...normalized,
      yourColor: previousRoom?.yourColor ?? normalized.yourColor,
    };

    const moveVersionDelta =
      previousRoom && typeof nextRoom.moveVersion === "number"
        ? (nextRoom.moveVersion ?? 0) - (previousRoom.moveVersion ?? 0)
        : 0;
    const hasImmediateTokenMove =
      previousRoom ? findTokenMoveAnimation(previousRoom, nextRoom) !== null : false;

    if (
      previousRoom &&
      payloadDiceValue == null &&
      (nextRoom.lastDiceValue ?? null) == null &&
      moveVersionDelta >= 2 &&
      hasImmediateTokenMove
    ) {
      pendingCombinedRollRoomRef.current = nextRoom;
      return;
    }

    if (
      payloadDiceValue != null &&
      pendingCombinedRollRoomRef.current &&
      (nextRoom.moveVersion ?? 0) <= (pendingCombinedRollRoomRef.current.moveVersion ?? 0)
    ) {
      pendingCombinedRollRoomRef.current = null;
    }

    applyNormalizedRoomUpdate(nextRoom);
  }, [applyNormalizedRoomUpdate, findTokenMoveAnimation]);
  applyRoomUpdateRef.current = applyRoomUpdate;

  const rollMutation = useMutation({
    mutationFn: () => LudoService.rollDice(roomId),
    onSuccess: ({ data }) => {
      const fromRoom = latestRoomRef.current;
      const autoMovedByRoll = Boolean(fromRoom && findTokenMoveAnimation(fromRoom, data));
      const diceOwnerId = authUserId ?? fromRoom?.currentTurnUserId ?? null;
      setLastRolledByUserId(diceOwnerId);
      setActiveDiceOwnerId(diceOwnerId);
      stopDiceSound();
      if (typeof data.lastDiceValue === "number" && data.lastDiceValue >= 1 && data.lastDiceValue <= 6) {
        settleDiceRollVisual(data.lastDiceValue, LOCAL_DICE_ROLL_MS);
      } else {
        setDiceAnimationState("idle");
        setActiveDiceOwnerId(null);
        setTokenMoveLocked(false);
        localRollPendingRef.current = false;
        diceRollStartRef.current = null;
      }
      if (fromRoom && autoMovedByRoll) {
        latestRoomRef.current = data;
        setRoomState(data);
        setAnimRoom(fromRoom);
        isAnimatingRef.current = true;
        const timer = setTimeout(() => {
          playTokenMoveAnimation(fromRoom, data);
        }, getRemainingDiceAnimationMs(LOCAL_DICE_ROLL_MS));
        animTimersRef.current.push(timer);
      } else {
        latestRoomRef.current = data;
        rememberTokenPaths(data);
        setRoomState(data);
      }
      // Notify room so the opponent's client gets the update instantly
      emitEvent("ludo:room:join", roomId);
      scheduleRoomRefetch();

      // First and second consecutive 6s stay valid. On the third 6 we block
      // local move UI and wait for the room sync that passes the turn.
      if (data.lastDiceValue === 6) {
        consecutiveSixRef.current += 1;
        if (consecutiveSixRef.current >= 3) {
          consecutiveSixRef.current = 0;
          setThirdSixPenaltyPending(true);
          setTokenMoveLocked(true);
          toast.warning("Two 6s valid. 3rd 6 cancelled, turn passed.");
          schedulePenaltySync();
        }
      } else {
        consecutiveSixRef.current = 0;
      }
    },
    onError: (err: unknown) => {
      stopDiceSound();
      clearDiceVisualTimers();
      setDiceAnimationState("idle");
      setActiveDiceOwnerId(null);
      setTokenMoveLocked(false);
      localRollPendingRef.current = false;
      diceRollStartRef.current = null;
      toast.error(getErrorMessage(err, "Failed to roll dice"));
    },
  });

  const moveMutation = useMutation({
    mutationFn: (tokenId: string) => LudoService.moveToken(roomId, tokenId),
    onSuccess: ({ data: toRoom }) => {
      emitEvent("ludo:room:join", roomId);
      scheduleRoomRefetch();

      const fromRoom = preMoveRoomRef.current;
      preMoveRoomRef.current = null;

      if (!fromRoom) {
        latestRoomRef.current = toRoom;
        rememberTokenPaths(toRoom);
        setRoomState(toRoom);
        return;
      }

      // ── Find which token moved and how many steps ───────────────────────
      if (playTokenMoveAnimation(fromRoom, toRoom)) {
        return;
      }

      // If only 1 step (or nothing to animate), show final state immediately
      finishMoveAnimation(fromRoom, toRoom);
      return;

      // ── Schedule one setState per intermediate step ─────────────────────
    },
    onError: (err: unknown) => {
      isAnimatingRef.current = false;
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
      setAnimRoom(null);
      preMoveRoomRef.current = null;
      toast.error(getErrorMessage(err, "Failed to move token"));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => LudoService.leaveRoom(roomId),
    onSuccess: () => {
      setExitConfirmOpen(false);
      toast.success("Left room");
      router.push("/games/ludo");
    },
    onError: (err: unknown) => { toast.error(getErrorMessage(err, "Failed to leave room")); },
  });

  const openExitConfirm = useCallback(() => {
    if (leaveMutation.isPending) return;
    setSettingsMenuOpen(false);
    setExitConfirmOpen(true);
  }, [leaveMutation.isPending]);

  const closeExitConfirm = useCallback(() => {
    if (leaveMutation.isPending) return;
    setExitConfirmOpen(false);
  }, [leaveMutation.isPending]);

  const confirmExitAndLeave = useCallback(() => {
    leaveMutation.mutate();
  }, [leaveMutation]);

  useEffect(() => {
    if (!isConnected || !roomId) return;
    emitEvent("ludo:room:join", roomId);

    const handleRealtimeRoomUpdate = (payload: unknown) => {
      applyRoomUpdate(payload);
    };

    // Listen to all common event names the server might use
    const offs = [
      onEvent("ludo:room:update",  handleRealtimeRoomUpdate),
      onEvent("ludo:turn",         handleRealtimeRoomUpdate),
      onEvent("ludo:state",        handleRealtimeRoomUpdate),
      onEvent("ludo:dice:rolled",  handleRealtimeRoomUpdate),
      onEvent("ludo:token:moved",  handleRealtimeRoomUpdate),
      onEvent("ludo:game:update",  handleRealtimeRoomUpdate),
      onEvent("ludo:finished", (p: unknown) => {
        applyRoomUpdate(p);
        const winner = (p as Record<string, unknown>)?.winnerName as string | undefined;
        toast.success(winner ? `${winner} won!` : "Match finished");
      }),
    ];

    return () => { offs.forEach((off) => off()); };
  }, [applyRoomUpdate, emitEvent, isConnected, onEvent, roomId]);

  const serverRoom = roomData?.data ?? null;
  const room =
    serverRoom?.status === "FINISHED" || serverRoom?.status === "CANCELLED"
      ? serverRoom
      : serverRoom && roomState
        ? (serverRoom.moveVersion ?? 0) > (roomState.moveVersion ?? 0)
          ? serverRoom
          : roomState
        : roomState ?? serverRoom;
  const me =
    room?.players.find((p) => p.userId === authUserId) ??
    room?.players.find((p) => p.color === room?.yourColor);
  const opponent = room?.players.find((p) => p.userId !== me?.userId);
  const winner   = room?.players.find((p) => p.userId === room?.winnerUserId);
  const isFinished = room?.status === "FINISHED" || room?.status === "CANCELLED";
  const ludoCommissionPct =
    (typeof (room as Record<string, unknown> | null)?.commissionPct === "number"
      ? Number((room as Record<string, unknown>).commissionPct)
      : storedCommissionPct) || 0;
  const resultType =
    room?.status === "FINISHED" && winner && me
      ? winner.userId === me.userId
        ? "win"
        : "loss"
      : null;
  const turnRequiresRoll =
    room?.status === "LIVE" &&
    !isFinished &&
    (room?.availableTokenIds?.length ?? 0) === 0;
  const myTurn   = Boolean(me && room?.currentTurnUserId === me.userId);
  const availSet = useMemo(() => new Set(room?.availableTokenIds ?? []), [room?.availableTokenIds]);
  const displaySeatColors = useMemo(
    () =>
      getDisplaySeatColors(
        (me?.color as LudoColor | undefined) ?? (room?.yourColor as LudoColor | undefined),
        opponent?.color as LudoColor | undefined,
      ),
    [me?.color, opponent?.color, room?.yourColor],
  );
  const canRoll  =
    room?.status === "LIVE" &&
    myTurn &&
    !thirdSixPenaltyPending &&
    !rollMutation.isPending &&
    availSet.size === 0;
  const visibleDiceValue =
    typeof room?.lastDiceValue === "number" && room.lastDiceValue >= 1 && room.lastDiceValue <= 6
      ? room.lastDiceValue
      : lastVisibleDiceValue;
  const renderedDiceValue =
    diceAnimationState === "idle"
      ? visibleDiceValue
      : diceFaceValue;
  const canMoveTokens = diceAnimationState === "idle" && !tokenMoveLocked && !thirdSixPenaltyPending;
  const handleDiceRollPress = useCallback(() => {
    if (!canRoll || localRollPendingRef.current) return;

    localRollPendingRef.current = true;
    setActiveDiceOwnerId(authUserId ?? room?.currentTurnUserId ?? null);
    startDiceRollVisual();

    requestAnimationFrame(() => {
      startDiceSound(LOCAL_DICE_ROLL_MS);
      rollMutation.mutate();
    });
  }, [LOCAL_DICE_ROLL_MS, authUserId, canRoll, rollMutation, room?.currentTurnUserId, startDiceRollVisual, startDiceSound]);

  useEffect(() => {
    if (!serverRoom) return;

    const previousRoom = latestRoomRef.current;
    const normalizedServerRoom = normalizeLudoRoom(serverRoom);
    const nextRoom = {
      ...normalizedServerRoom,
      yourColor: previousRoom?.yourColor ?? normalizedServerRoom.yourColor,
    };
    const serverMoveVersion = nextRoom.moveVersion ?? 0;
    const previousMoveVersion = previousRoom?.moveVersion ?? -1;
    const didDiceChange =
      typeof nextRoom.lastDiceValue === "number" &&
      nextRoom.lastDiceValue !== (previousRoom?.lastDiceValue ?? null);
    const shouldSyncServerRoom =
      !previousRoom ||
      serverMoveVersion > previousMoveVersion ||
      didDiceChange ||
      nextRoom.currentTurnUserId !== previousRoom.currentTurnUserId ||
      nextRoom.status !== previousRoom.status;

    if (!shouldSyncServerRoom) return;

    applyNormalizedRoomUpdate(nextRoom);
  // `applyNormalizedRoomUpdate` is recreated on render, so keeping it in the
  // dependency list causes a render loop after `setRoomState`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRoom]);

  useEffect(() => {
    if (
      typeof room?.lastDiceValue === "number" &&
      room.lastDiceValue >= 1 &&
      room.lastDiceValue <= 6
    ) {
      setLastVisibleDiceValue(room.lastDiceValue);
    }
  }, [room?.lastDiceValue]);

  useEffect(() => {
    if (!room) return;
    if (isAnimatingRef.current) return;
    latestRoomRef.current = room;
    rememberTokenPaths(room);
  }, [room, rememberTokenPaths]);

  useEffect(() => {
    if (!thirdSixPenaltyPending) return;
    if (!myTurn) {
      setThirdSixPenaltyPending(false);
      setTokenMoveLocked(false);
      return;
    }

    if ((room?.availableTokenIds?.length ?? 0) === 0 && room?.lastDiceValue !== 6) {
      setThirdSixPenaltyPending(false);
      setTokenMoveLocked(false);
    }
  }, [myTurn, room?.availableTokenIds, room?.lastDiceValue, thirdSixPenaltyPending]);

  useEffect(() => {
    if (!resultType || !room?.id) {
      resultSoundKeyRef.current = null;
      return;
    }

    const resultKey = `${room.id}-${resultType}`;
    if (resultSoundKeyRef.current !== resultKey) {
      resultSoundKeyRef.current = resultKey;
      if (resultType === "win") {
        playWinSound();
        const loadConfetti = new Function("return import('canvas-confetti')") as () => Promise<typeof import("canvas-confetti")>;
        void loadConfetti()
          .then((module) => {
            const confetti = module.default;
            confetti({ particleCount: 140, spread: 80, origin: { x: 0.5, y: 0.6 } });
            confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.8 } });
            confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.8 } });
          })
          .catch(() => {});
      } else {
        playLossSound();
      }
    }
  }, [playLossSound, playWinSound, resultType, room?.id]);

  useEffect(() => {
    if (!isFinished) return;
    void router.prefetch("/games/ludo");
  }, [isFinished, router]);

  const handleResultConfirm = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/games/ludo");
      return;
    }

    router.replace("/games/ludo");
  }, [router]);

  // Reset consecutive-6 tracking whenever the turn passes away from us.
  useEffect(() => {
    if (!myTurn) {
      consecutiveSixRef.current = 0;
    }
  }, [myTurn]);

  // Start / clear the roll-countdown whenever canRoll changes.
  useEffect(() => {
    // Clear any running timers first
    if (rollIntervalRef.current) { clearInterval(rollIntervalRef.current); rollIntervalRef.current = null; }
    if (rollAutoRef.current)     { clearTimeout(rollAutoRef.current);      rollAutoRef.current     = null; }
    turnWarningPlayedRef.current = null;

    if (!canRoll) { setRollCountdown(null); return; }

    // canRoll just became true - arm the local visual countdown.
    setRollCountdown(ROLL_TIMEOUT_SEC);

    rollIntervalRef.current = setInterval(() => {
      setRollCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(rollIntervalRef.current!);
          rollIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // The backend handles auto play / forfeit. This timer only nudges a refetch.
    rollAutoRef.current = setTimeout(() => {
      void refetch();
    }, ROLL_TIMEOUT_SEC * 1000);

    return () => {
      if (rollIntervalRef.current) { clearInterval(rollIntervalRef.current); rollIntervalRef.current = null; }
      if (rollAutoRef.current)     { clearTimeout(rollAutoRef.current);      rollAutoRef.current     = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRoll]);

  useEffect(() => {
    if (!room?.turnEndsAt || !room?.currentTurnUserId || isFinished || !turnRequiresRoll) {
      setSharedTurnCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const endAtMs = new Date(room.turnEndsAt as string).getTime();
      if (!Number.isFinite(endAtMs)) {
        setSharedTurnCountdown(null);
        return;
      }

      const remaining = Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
      setSharedTurnCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isFinished, room?.currentTurnUserId, room?.turnEndsAt, turnRequiresRoll]);

  useEffect(() => {
    if (!myTurn || rollCountdown === null || rollCountdown > 5) return;

    const turnKey = room?.turnEndsAt
      ? `${room.currentTurnUserId}:${room.turnEndsAt}`
      : room?.currentTurnUserId ?? "turn-warning";

    if (turnWarningPlayedRef.current === turnKey) return;

    turnWarningPlayedRef.current = turnKey;
    playTurnWarningSound();
  }, [myTurn, playTurnWarningSound, rollCountdown, room?.currentTurnUserId, room?.turnEndsAt]);

  // During animation show the intermediate state; otherwise use the live room.
  const displayedRoom = animRoom ?? room;

  // Build the tokenPositions map for LudoBoard
  const tokenPositions = useMemo<Map<string, BoardToken[]>>(() => {
    const map = new Map<string, BoardToken[]>();
    (displayedRoom?.players ?? []).forEach((player) => {
      (player.tokens ?? []).forEach((token, idx) => {
        const isFinishedToken = token.status === "GOAL" || token.status === "FINISHED";
        const [row, col] = tokenCell(token, player, idx, displaySeatColors);
        const key = isFinishedToken ? `win-${player.color}` : `${row}-${col}`;
        const entry = map.get(key) ?? [];
        const isMyToken = player.userId === me?.userId;
        const isTokenAvailable =
          canMoveTokens && isMyToken && (availSet.has(token.id) || Boolean(token.canMove));

        entry.push({
          id: token.id,
          color: player.color as BoardToken["color"],
          label: String(token.label ?? idx + 1),
          available: isTokenAvailable,
          home: token.status === "HOME",
          finished: isFinishedToken,
        });
        map.set(key, entry);
      });
    });
    return map;
  }, [canMoveTokens, displayedRoom?.players, availSet, displaySeatColors, me?.userId]);
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
  const statusText = isFinished
    ? "FINISHED"
    : canRoll
        ? "ROLL"
        : myTurn && availSet.size > 0
          ? "MOVE"
          : "WAIT";
  const displayTurnCountdown =
    turnRequiresRoll
      ? myTurn
        ? (rollCountdown ?? sharedTurnCountdown)
        : sharedTurnCountdown
      : null;
  const turnCountdownDanger = displayTurnCountdown !== null && displayTurnCountdown <= 5;
  const turnCountdownColor = turnCountdownDanger ? "#ff5b57" : "#f5b414";
  const turnCountdownProgress =
    displayTurnCountdown !== null
      ? Math.max(0, Math.min(1, displayTurnCountdown / ROLL_TIMEOUT_SEC))
      : 0;
  const stakeLabel = Number(room.stakeAmount) <= 0 ? "FREE" : `BDT ${room.stakeAmount}`;
  const activeTurnUserId = room.currentTurnUserId ?? null;
  const isDiceAnimating = diceAnimationState !== "idle";
  const shouldShowTopActiveDice = Boolean(opponent?.userId && activeDiceOwnerId === opponent.userId && isDiceAnimating);
  const shouldShowBottomActiveDice = Boolean(me?.userId && activeDiceOwnerId === me.userId && isDiceAnimating);
  const shouldHighlightTopDice = shouldShowTopActiveDice;
  const shouldHighlightBottomDice = shouldShowBottomActiveDice;
  const shouldGlowTopTurn = Boolean(opponent?.userId && activeTurnUserId === opponent.userId && turnRequiresRoll);
  const shouldGlowBottomTurn = myTurn && turnRequiresRoll;
  const shouldAnimateBottomDiceRing =
    shouldShowBottomActiveDice &&
    displayTurnCountdown !== null &&
    displayTurnCountdown > 0;

  return (
    <div
      className="relative flex h-[calc(100dvh-10.75rem)] min-h-0 flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at top center, rgba(54,104,255,0.34), transparent 30%), linear-gradient(180deg,#173aa7 0%,#153596 42%,#08133b 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.1] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)]" />

      <div className="relative z-10 flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={openExitConfirm}
          className="flex h-8 items-center gap-1 rounded-full border border-white/20 bg-white/12 px-2.5 text-[10px] font-black text-white shadow-sm backdrop-blur"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <div />

        <div ref={settingsMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setSettingsMenuOpen((open) => !open)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-sm backdrop-blur transition hover:bg-white/18"
            aria-label="Open room settings"
            aria-expanded={settingsMenuOpen}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          {settingsMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[248px] rounded-[22px] border border-white/18 bg-[#10245f]/96 p-3 text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    {soundEnabled && soundVolume > 0 ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-white/68" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">Sound</p>
                    <p className="text-sm font-black">{soundEnabled ? "Enabled" : "Muted"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((enabled) => !enabled)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black",
                    soundEnabled
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/15 text-white/70",
                  )}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="mt-3 rounded-2xl bg-white/6 px-3 py-2.5">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
                  <span>Volume</span>
                  <span>{Math.round(soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(soundVolume * 100)}
                  onChange={(event) => setSoundVolume(Number(event.target.value) / 100)}
                  className="w-full accent-yellow-300"
                  aria-label="Sound volume"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  void refetch();
                  setSettingsMenuOpen(false);
                }}
                className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white/8 px-3 py-3 text-left transition hover:bg-white/12"
              >
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Room</span>
                  <span className="block text-sm font-black">Sync room</span>
                </span>
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={openExitConfirm}
                disabled={leaveMutation.isPending}
                className="mt-2 flex w-full items-center justify-between rounded-2xl bg-red-500 px-3 py-3 text-left text-white transition hover:bg-red-400 disabled:opacity-60"
              >
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Match</span>
                  <span className="block text-sm font-black">
                    {leaveMutation.isPending ? "Leaving..." : "Leave room"}
                  </span>
                </span>
                <DoorOpen className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isFinished && (
        <div className="relative z-10 mx-4 mt-3 rounded-xl border border-yellow-300/50 bg-yellow-300/15 px-4 py-2 text-center text-sm font-black text-yellow-100">
          {room.status === "CANCELLED"
            ? "Match cancelled"
            : winner?.userId === me?.userId
              ? "You won"
              : `${winner?.name ?? "Opponent"} won`}
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-5 pb-3 pt-2 sm:px-7 sm:pb-4">
        <div className="relative flex h-full w-full max-w-[500px] flex-col items-center justify-center">
          <div className="pointer-events-none absolute inset-x-8 top-2 z-0 h-10 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18)_0%,transparent_72%)] blur-xl" />

          <div className="absolute right-0 top-0 z-20 flex max-w-[52vw] items-start gap-2 sm:right-2">
            <div className="pt-1 text-right text-white">
              <p className="truncate text-lg font-black leading-none">
                {getPlayerLabel(opponent, "Opponent")}
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">
                {room.currentTurnUserId === opponent?.userId ? "Opponent turn" : getPlayerSubLabel(opponent, "Opponent")}
              </p>
              <div className="mt-1 flex justify-end">
                <AutoMoveDots count={opponent?.autoMoveCount} />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex flex-col items-end">
                <div
                  className={cn(
                    "relative flex h-[54px] w-[54px] items-center justify-center rounded-[16px] border-[3px] shadow-[0_10px_18px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out",
                    shouldHighlightTopDice
                      ? "border-[#ffe76f] bg-[linear-gradient(180deg,#ffe84b_0%,#ffbe0b_100%)]"
                      : "border-white/20 bg-[linear-gradient(180deg,rgba(21,49,127,0.9),rgba(19,37,97,0.94))]",
                    shouldGlowTopTurn && !shouldHighlightTopDice && "border-[#ffe76f]/80 bg-[linear-gradient(180deg,rgba(255,239,128,0.92)_0%,rgba(255,190,11,0.82)_100%)] shadow-[0_0_0_3px_rgba(255,238,140,0.18),0_0_22px_rgba(255,210,64,0.28),0_10px_18px_rgba(0,0,0,0.2)] animate-[ludo-turn-dice-glow_1.8s_ease-in-out_infinite]",
                  )}
                >
                  <div className="pointer-events-none absolute inset-[7%] rounded-[12px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04))]" />
                  <div className="relative flex h-full w-full items-center justify-center p-1">
                    {shouldShowTopActiveDice ? (
                      <DiceSVG value={renderedDiceValue} size={38} />
                    ) : (
                      <div className="opacity-70">
                        <DiceSVG value={visibleDiceValue} size={38} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <PlayerAvatarBadge
                player={opponent}
                color={COLOR_HEX[oppColor] ?? "#2ba8ef"}
                active={room.currentTurnUserId === opponent?.userId}
                countdownProgress={shouldGlowTopTurn ? turnCountdownProgress : null}
                danger={shouldGlowTopTurn && turnCountdownDanger}
              />
            </div>
          </div>

          <div
            className="relative z-10 aspect-square overflow-hidden rounded-[26px] border-[3px] border-[#f5d14d] bg-[#1b4dcf] p-[7px] shadow-[0_18px_34px_rgba(0,0,0,0.26)]"
            style={{
              width: "min(calc(100vw - 52px), 472px, calc(100vh - 250px))",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_42%)]" />
            <LudoBoard
              tokenPositions={tokenPositions}
              onMoveToken={(id) => {
                preMoveRoomRef.current = room;
                isAnimatingRef.current = true;
                moveMutation.mutate(id);
              }}
              viewerColor={me?.color as LudoColor | undefined}
              opponentColor={opponent?.color as LudoColor | undefined}
            />
          </div>

          <div className="absolute bottom-[-8px] left-0 z-20 flex max-w-[78vw] items-center gap-2 sm:left-2">
            <PlayerAvatarBadge
              player={me}
              color={COLOR_HEX[myColor] ?? "#ef1d26"}
              active={myTurn}
              countdownProgress={shouldGlowBottomTurn ? turnCountdownProgress : null}
              danger={shouldGlowBottomTurn && turnCountdownDanger}
            />

            <div className="flex items-center gap-2">
              <div
                className="relative shrink-0 rounded-[22px] p-[4px]"
                style={
                  shouldAnimateBottomDiceRing
                    ? {
                        background: `conic-gradient(from -90deg, ${turnCountdownColor} 0deg, ${turnCountdownColor} ${turnCountdownProgress * 360}deg, rgba(255,255,255,0.16) ${turnCountdownProgress * 360}deg, rgba(255,255,255,0.16) 360deg)`,
                      }
                    : shouldGlowBottomTurn
                      ? { background: "rgba(255,238,140,0.3)", boxShadow: "0 0 0 2px rgba(255,236,122,0.18), 0 0 24px rgba(255,221,31,0.26)" }
                      : { background: "rgba(255,255,255,0.14)" }
                }
              >
                <button
                  type="button"
                  onPointerDown={handleDiceRollPress}
                  disabled={!canRoll}
                  className={cn(
                    "group relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] border-[3px] shadow-[0_10px_18px_rgba(0,0,0,0.26)] transition-all duration-200 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-80",
                    shouldHighlightBottomDice
                      ? "border-[#ffe76f] bg-[linear-gradient(180deg,#ffe84b_0%,#ffbe0b_100%)]"
                      : "border-white/20 bg-[linear-gradient(180deg,rgba(21,49,127,0.9),rgba(19,37,97,0.94))]",
                    shouldGlowBottomTurn && !shouldHighlightBottomDice && "border-[#ffe76f]/80 bg-[linear-gradient(180deg,rgba(255,239,128,0.92)_0%,rgba(255,190,11,0.82)_100%)] shadow-[0_0_0_3px_rgba(255,238,140,0.18),0_0_22px_rgba(255,210,64,0.28),0_12px_20px_rgba(0,0,0,0.28)] animate-[ludo-turn-dice-glow_1.8s_ease-in-out_infinite]",
                    canRoll && "hover:brightness-105",
                    diceAnimationState !== "idle" && "shadow-[0_0_0_4px_rgba(255,247,173,0.24),0_12px_20px_rgba(0,0,0,0.28)]",
                  )}
                  aria-label={canRoll ? "Roll dice" : `Dice status ${statusText.toLowerCase()}`}
                >
                  <div className="pointer-events-none absolute inset-[7%] rounded-[12px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.05))]" />
                  <div
                    className={cn(
                      "relative flex h-full w-full items-center justify-center p-1",
                      shouldShowBottomActiveDice && diceAnimationState === "rolling" && "animate-[ludo-hand-dice-roll_.46s_cubic-bezier(.22,.61,.36,1)_infinite]",
                    )}
                    style={{ transformOrigin: "50% 58%" }}
                  >
                    {shouldShowBottomActiveDice ? (
                      <DiceSVG value={renderedDiceValue} size={40} />
                    ) : (
                      <div className="opacity-70">
                        <DiceSVG value={visibleDiceValue} size={40} />
                      </div>
                    )}
                  </div>
                </button>
              </div>

              <div className="min-w-0 text-white">
                <p className="truncate text-lg font-black leading-none">
                  {getPlayerLabel(me, "You")}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/68">
                  {myTurn ? "Your turn" : getPlayerSubLabel(me, "You")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {resultType && (
        <LudoResultOverlay
          result={resultType}
          winnerName={winner ? getPlayerLabel(winner, "Winner") : "Winner"}
          runnerUpName={
            winner?.userId === me?.userId
              ? getPlayerLabel(opponent, "Opponent")
              : getPlayerLabel(me, "You")
          }
          stakeAmount={Number(room?.stakeAmount ?? 0)}
          commissionPct={ludoCommissionPct}
          onConfirm={handleResultConfirm}
        />
      )}

      {exitConfirmOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/72 px-5 backdrop-blur-[2px]">
          <div className="w-full max-w-[320px] rounded-[22px] border border-white/15 bg-[#10245f] p-5 text-white shadow-[0_20px_45px_rgba(0,0,0,0.4)]">
            <h2 className="text-base font-black">Cancel Game?</h2>
            <p className="mt-2 text-sm leading-5 text-white/78">
              Are you sure you want to cancel the game? If you leave now, you will lose and your opponent will win.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmExitAndLeave}
                disabled={leaveMutation.isPending}
                className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-60"
              >
                {leaveMutation.isPending ? "Leaving..." : "Yes"}
              </button>
              <button
                type="button"
                onClick={closeExitConfirm}
                disabled={leaveMutation.isPending}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes ludo-turn-avatar-ring {
          0%, 100% { opacity: 0.78; }
          50% { opacity: 1; }
        }

        @keyframes ludo-turn-dice-glow {
          0%, 100% { filter: brightness(1) saturate(1); transform: translateZ(0) scale(1); }
          50% { filter: brightness(1.08) saturate(1.08); transform: translateZ(0) scale(1.02); }
        }

        @keyframes ludo-hand-dice-roll {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          18% { transform: translate(-2px, -3px) rotate(-7deg) scale(1.025); }
          36% { transform: translate(3px, -1px) rotate(6deg) scale(0.995); }
          54% { transform: translate(-2px, 2px) rotate(-5deg) scale(1.018); }
          72% { transform: translate(2px, -2px) rotate(5deg) scale(1.02); }
          88% { transform: translate(-1px, 1px) rotate(-3deg) scale(0.998); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }

        @keyframes ludo-hand-dice-settle {
          0% { transform: translate(-1px, -2px) rotate(-4deg) scale(1.03); }
          55% { transform: translate(1px, 1px) rotate(3deg) scale(0.988); }
          100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
      `}</style>
    </div>
  );
}
