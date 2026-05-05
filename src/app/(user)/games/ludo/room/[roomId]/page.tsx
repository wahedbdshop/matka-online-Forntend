"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Home, Loader2, RefreshCw, Trophy, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
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
  GREEN:  [[11,11],[11,13],[13,11],[13,13]],
  BLUE:   [[11,1], [11,3], [13,1], [13,3]],
  YELLOW: [[1,11], [1,13], [3,11], [3,13]],
};

const HOME_LANE_CELLS: Record<string, Array<[number, number]>> = {
  RED:    [[7,1], [7,2], [7,3], [7,4], [7,5], [7,6]],
  GREEN:  [[7,13], [7,12], [7,11], [7,10], [7,9], [7,8]],
  BLUE:   [[13,7], [12,7], [11,7], [10,7], [9,7], [8,7]],
  YELLOW: [[1,7], [2,7], [3,7], [4,7], [5,7], [6,7]],
};

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
): [number, number] {
  if (token.status === "HOME") {
    return HOME_CELLS[player.color]?.[idx] ?? [1, 1];
  }

  if (
    typeof token.homeLanePosition === "number" &&
    token.homeLanePosition > 0
  ) {
    const laneIndex = Math.min(token.homeLanePosition, 6) - 1;
    return HOME_LANE_CELLS[player.color]?.[laneIndex] ?? [7, 7];
  }

  if (token.status === "GOAL" || token.status === "FINISHED") {
    return HOME_LANE_CELLS[player.color]?.[5] ?? [7, 7];
  }
  const bi =
    token.boardPosition ??
    (typeof token.stepsMoved === "number" && token.stepsMoved > 0
      ? token.stepsMoved - 1
      : token.position - 1);
  const cell =
    typeof bi === "number" && bi >= 0 && bi < TRACK.length
      ? TRACK[bi % TRACK.length]
      : HOME_CELLS[player.color]?.[idx];
  return cell ?? [7, 7];
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
function LudoResultOverlay({
  result,
  playerName,
  countdown,
  showActions,
  onPlayAgain,
  onHome,
}: {
  result: "win" | "loss";
  playerName: string;
  countdown: number;
  showActions: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const isWin = result === "win";
  const particles = Array.from({ length: isWin ? 34 : 28 });

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-5 text-white ludo-result-fade",
      isWin
        ? "bg-[radial-gradient(circle_at_center,#552b02_0%,#140824_42%,#05030d_100%)]"
        : "bg-[radial-gradient(circle_at_center,#24324b_0%,#111827_46%,#050816_100%)]",
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

      <div className="relative z-10 w-full max-w-[430px] text-center">
        <div className={cn(
          "mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border shadow-2xl ludo-result-pop",
          isWin
            ? "border-yellow-200/70 bg-yellow-300 text-yellow-950 shadow-yellow-400/40"
            : "border-blue-200/25 bg-slate-700 text-blue-100 shadow-blue-950/60",
        )}>
          {isWin ? <Trophy className="h-12 w-12" /> : <span className="text-5xl">:(</span>}
        </div>

        <h1 className={cn(
          "ludo-result-title text-4xl font-black leading-tight sm:text-5xl",
          isWin ? "text-yellow-200" : "text-blue-100",
        )}>
          {isWin ? "CONGRATULATIONS!" : "BETTER LUCK NEXT TIME"}
        </h1>
        <p className="mt-4 text-lg font-black text-white">
          {isWin ? "Trophy for" : "Played by"} {playerName}
        </p>

        {!showActions ? (
          <div className="mt-8 inline-flex h-14 min-w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-2xl font-black shadow-xl backdrop-blur">
            {countdown}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onPlayAgain}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-black shadow-lg",
                isWin ? "bg-yellow-300 text-yellow-950" : "bg-blue-300 text-blue-950",
              )}
            >
              <RefreshCw className="h-4 w-4" />
              {isWin ? "Play Again" : "Try Again"}
            </button>
            <button
              type="button"
              onClick={onHome}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/12 text-sm font-black text-white shadow-lg"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes ludo-result-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ludo-result-pop {
          0% { transform: scale(.55); opacity: 0; }
          72% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ludo-title-glow {
          0%, 100% { transform: scale(1); text-shadow: 0 0 12px rgba(250,204,21,.55), 0 0 34px rgba(250,204,21,.35); }
          50% { transform: scale(1.035); text-shadow: 0 0 18px rgba(250,204,21,.9), 0 0 46px rgba(250,204,21,.55); }
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
        .ludo-result-title { animation: ludo-title-glow 1.35s ease-in-out infinite; }
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
  const [roomState, setRoomState] = useState<LudoRoom | null>(null);
  const [lastVisibleDiceValue, setLastVisibleDiceValue] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const [soundPrefsReady, setSoundPrefsReady] = useState(false);
  const [resultCountdown, setResultCountdown] = useState(10);
  const [resultActionsVisible, setResultActionsVisible] = useState(false);
  const latestRoomRef = useRef<LudoRoom | null>(null);
  const tokenPathHistoryRef = useRef<Map<string, number[]>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const diceSoundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceSoundStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultSoundKeyRef = useRef<string | null>(null);

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
  const [rollCountdown, setRollCountdown] = useState<number | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollAutoRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const { data: roomData, isLoading, refetch } = useQuery({
    queryKey: ["ludo-room", roomId],
    queryFn: () => LudoService.getRoom(roomId),
    enabled: Boolean(roomId),
    refetchInterval: 2000,
  });

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
    if (!soundPrefsReady) return;
    window.localStorage.setItem(LUDO_SOUND_ENABLED_KEY, String(soundEnabled));
    window.localStorage.setItem(LUDO_SOUND_VOLUME_KEY, String(soundVolume));
  }, [soundEnabled, soundPrefsReady, soundVolume]);

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

  useEffect(() => {
    if (soundEnabled && soundVolume > 0) return;
    stopDiceSound();
  }, [soundEnabled, soundVolume, stopDiceSound]);

  useEffect(() => {
    return () => {
      stopDiceSound();
      void audioContextRef.current?.close();
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
          return;
        }

        playStepSound();
        setAnimRoom(roomWithCaptureReturnFrame(toRoom, captures, frame));
      }, frame * 70);

      animTimersRef.current.push(timer);
    }

    return true;
  }, [getCapturedReturns, playKillSound, playStepSound, rememberTokenPaths]);

  // Normalize any socket/API payload and preserve per-client yourColor.
  // Server broadcasts the same room object to all clients so yourColor is absent.
  const applyRoomUpdate = useCallback((incoming: unknown) => {
    // Block socket pushes while a step-walk animation is in progress.
    // Without this guard the socket broadcast (which arrives before onSuccess)
    // jumps the token straight to its final cell, making the animation appear
    // to walk backwards from that cell back to the start.
    if (isAnimatingRef.current) return;

    if (!incoming || typeof incoming !== "object") return;
    // Payload can be { room: {...} } or the room object directly
    const raw = (incoming as Record<string, unknown>).room ?? incoming;
    if (!raw || typeof raw !== "object" || !("players" in raw)) return;
    const normalized = normalizeLudoRoom(raw as LudoRoom);
    const previousRoom = latestRoomRef.current;
    const nextRoom = {
      ...normalized,
      yourColor: previousRoom?.yourColor ?? normalized.yourColor,
    };

    if (
      previousRoom &&
      typeof nextRoom.lastDiceValue === "number" &&
      nextRoom.lastDiceValue !== previousRoom.lastDiceValue
    ) {
      startDiceSound(360);
    }

    if (previousRoom) {
      const previousFinishedIds = new Set(
        previousRoom.players.flatMap((player) =>
          player.tokens
            .filter((token) => token.status === "GOAL" || token.status === "FINISHED")
            .map((token) => token.id),
        ),
      );
      const hasNewFinishedToken = nextRoom.players.some((player) =>
        player.tokens.some(
          (token) =>
            (token.status === "GOAL" || token.status === "FINISHED") &&
            !previousFinishedIds.has(token.id),
        ),
      );
      if (hasNewFinishedToken) playWinSound();
    }

    if (previousRoom && playCaptureReturnAnimation(previousRoom, nextRoom)) {
      return;
    }

    latestRoomRef.current = nextRoom;
    rememberTokenPaths(nextRoom);
    setRoomState(nextRoom);
  }, [playCaptureReturnAnimation, playWinSound, rememberTokenPaths, startDiceSound]);

  const rollMutation = useMutation({
    mutationFn: () => LudoService.rollDice(roomId),
    onSuccess: ({ data }) => {
      stopDiceSound();
      latestRoomRef.current = data;
      rememberTokenPaths(data);
      setRoomState(data);
      // Notify room so the opponent's client gets the update instantly
      emitEvent("ludo:room:join", roomId);
      void refetch();

      // Three consecutive 6s rule
      if (data.lastDiceValue === 6) {
        consecutiveSixRef.current += 1;
        if (consecutiveSixRef.current >= 3) {
          consecutiveSixRef.current = 0;
          toast.warning("3 consecutive 6s! Turn passed.");
        }
      } else {
        consecutiveSixRef.current = 0;
      }
    },
    onError: (err: unknown) => {
      stopDiceSound();
      toast.error(getErrorMessage(err, "Failed to roll dice"));
    },
  });

  const moveMutation = useMutation({
    mutationFn: (tokenId: string) => LudoService.moveToken(roomId, tokenId),
    onSuccess: ({ data: toRoom }) => {
      emitEvent("ludo:room:join", roomId);
      void refetch();

      const fromRoom = preMoveRoomRef.current;
      preMoveRoomRef.current = null;

      if (!fromRoom) {
        latestRoomRef.current = toRoom;
        rememberTokenPaths(toRoom);
        setRoomState(toRoom);
        return;
      }

      // ── Find which token moved and how many steps ───────────────────────
      let movingPlayerId = "";
      let movingTokenId  = "";
      let fromBoardPos   = -1;
      let steps          = 0;

      outer: for (const toPlayer of toRoom.players) {
        const fromPlayer = fromRoom.players.find(p => p.userId === toPlayer.userId);
        if (!fromPlayer) continue;
        for (const toToken of toPlayer.tokens) {
          const fromToken = fromPlayer.tokens.find(t => t.id === toToken.id);
          if (!fromToken) continue;
          // Entered from home
          if (fromToken.status === "HOME" && toToken.status !== "HOME") {
            movingPlayerId = toPlayer.userId;
            movingTokenId  = toToken.id;
            steps = 1; fromBoardPos = -1;
            break outer;
          }
          // Moved along TRACK
          const fp = fromToken.boardPosition ?? Math.max(0, (fromToken.position ?? 1) - 1);
          const tp = toToken.boardPosition   ?? Math.max(0, (toToken.position   ?? 1) - 1);
          if (tp > fp && tp - fp <= 6 && toToken.status !== "GOAL" && toToken.status !== "FINISHED") {
            movingPlayerId = toPlayer.userId;
            movingTokenId  = toToken.id;
            fromBoardPos   = fp;
            steps          = tp - fp;
            break outer;
          }
        }
      }

      // If only 1 step (or nothing to animate), show final state immediately
      if (steps <= 1) {
        playStepSound();
        if (!playCaptureReturnAnimation(fromRoom, toRoom)) {
          const wonToken = fromRoom.players.some((fromPlayer) => {
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
          });
          if (wonToken) playWinSound();
          isAnimatingRef.current = false;
          latestRoomRef.current = toRoom;
          rememberTokenPaths(toRoom);
          setRoomState(toRoom);
        }
        return;
      }

      // ── Schedule one setState per intermediate step ─────────────────────
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];

      for (let step = 1; step <= steps; step++) {
        const intPos = fromBoardPos + step;
        const isLast = step === steps;

        const t = setTimeout(() => {
          playStepSound();
          if (isLast) {
            animTimersRef.current = [];
            setAnimRoom(null);
            if (!playCaptureReturnAnimation(fromRoom, toRoom)) {
              const wonToken = fromRoom.players.some((fromPlayer) => {
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
              });
              if (wonToken) playWinSound();
              isAnimatingRef.current = false;
              latestRoomRef.current = toRoom;
              rememberTokenPaths(toRoom);
              setRoomState(toRoom);
            }
          } else {
            setAnimRoom({
              ...fromRoom,
              players: fromRoom.players.map(p =>
                p.userId !== movingPlayerId ? p : {
                  ...p,
                  tokens: p.tokens.map(tk =>
                    tk.id !== movingTokenId ? tk : {
                      ...tk,
                      status: "PLAYING" as const,
                      boardPosition: intPos,
                      position: intPos + 1,
                    }
                  ),
                }
              ),
            });
          }
        }, step * 200);

        animTimersRef.current.push(t);
      }
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
    onSuccess: () => { toast.success("Left room"); router.push("/games/ludo"); },
    onError: (err: unknown) => { toast.error(getErrorMessage(err, "Failed to leave room")); },
  });

  useEffect(() => {
    if (!isConnected || !roomId) return;
    emitEvent("ludo:room:join", roomId);

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

  const serverRoom = roomData?.data ?? null;
  const room =
    serverRoom?.status === "FINISHED" || serverRoom?.status === "CANCELLED"
      ? serverRoom
      : serverRoom &&
          (
            !roomState?.currentTurnUserId ||
            (serverRoom.moveVersion ?? 0) > (roomState.moveVersion ?? 0)
          )
        ? serverRoom
        : roomState ?? serverRoom;
  const me =
    room?.players.find((p) => p.userId === authUserId) ??
    room?.players.find((p) => p.color === room?.yourColor);
  const opponent = room?.players.find((p) => p.userId !== me?.userId);
  const winner   = room?.players.find((p) => p.userId === room?.winnerUserId);
  const isFinished = room?.status === "FINISHED" || room?.status === "CANCELLED";
  const resultType =
    room?.status === "FINISHED" && winner && me
      ? winner.userId === me.userId
        ? "win"
        : "loss"
      : null;
  const myTurn   = Boolean(me && room?.currentTurnUserId === me.userId);
  const availSet = useMemo(() => new Set(room?.availableTokenIds ?? []), [room?.availableTokenIds]);
  const canRoll  =
    room?.status === "LIVE" &&
    myTurn &&
    !rollMutation.isPending &&
    availSet.size === 0;
  const visibleDiceValue =
    typeof room?.lastDiceValue === "number" && room.lastDiceValue >= 1 && room.lastDiceValue <= 6
      ? room.lastDiceValue
      : lastVisibleDiceValue;

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
    latestRoomRef.current = room;
    rememberTokenPaths(room);
  }, [room, rememberTokenPaths]);

  useEffect(() => {
    if (!resultType || !room?.id) {
      setResultCountdown(10);
      setResultActionsVisible(false);
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

    setResultCountdown(10);
    setResultActionsVisible(false);
    const interval = setInterval(() => {
      setResultCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    const timer = setTimeout(() => {
      setResultActionsVisible(true);
      setResultCountdown(0);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [playLossSound, playWinSound, resultType, room?.id]);

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

  // During animation show the intermediate state; otherwise use the live room.
  const displayedRoom = animRoom ?? room;

  // Build the tokenPositions map for LudoBoard
  const tokenPositions = useMemo<Map<string, BoardToken[]>>(() => {
    const map = new Map<string, BoardToken[]>();
    (displayedRoom?.players ?? []).forEach((player) => {
      (player.tokens ?? []).forEach((token, idx) => {
        const isFinishedToken = token.status === "GOAL" || token.status === "FINISHED";
        const [row, col] = tokenCell(token, player, idx);
        const key = isFinishedToken ? `win-${player.color}` : `${row}-${col}`;
        const entry = map.get(key) ?? [];
        const isMyToken = player.userId === me?.userId;
        const isTokenAvailable =
          isMyToken && (availSet.has(token.id) || Boolean(token.canMove));

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
  }, [displayedRoom?.players, availSet, me?.userId]);

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
  const stakeLabel = Number(room.stakeAmount) <= 0 ? "FREE" : `BDT ${room.stakeAmount}`;

  return (
    <div
      className="flex h-[calc(100dvh-10.75rem)] min-h-0 flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg,#173aa7 0%,#102b81 52%,#08133b 100%)",
      }}
    >
      {/* dot pattern */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px]" />

      {/* ── Top nav ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={() => router.replace("/games/ludo")}
          className="flex h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 text-xs font-black text-white shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="flex items-center gap-2">
          <span className={cn(
            "hidden rounded-full border px-3 py-1.5 text-[10px] font-black",
            isConnected
              ? "border-green-400/30 bg-green-500/15 text-green-300"
              : "border-yellow-400/30 bg-yellow-500/15 text-yellow-300",
          )}>
            {isConnected ? "● LIVE" : "◌ SYNC"}
          </span>
          <span className="hidden rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-black text-white">
            ৳{room.stakeAmount}
          </span>
          <span className={cn(
            "rounded-full border px-3 py-1.5 text-[10px] font-black",
            isConnected
              ? "border-green-400/30 bg-green-500/15 text-green-300"
              : "border-yellow-400/30 bg-yellow-500/15 text-yellow-300",
          )}>
            {isConnected ? "LIVE" : "SYNC"}
          </span>
          <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-black text-white">
            {stakeLabel}
          </span>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundPanelOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-sm"
            aria-label="Sound settings"
          >
            {soundEnabled && soundVolume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            className="flex h-10 items-center gap-1.5 rounded-full border border-red-300/35 bg-red-500 px-3 text-xs font-black text-white shadow-sm disabled:opacity-60"
          >
            <DoorOpen className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      </div>

      {/* ── Opponent label ── */}
      {soundPanelOpen && (
        <div className="relative z-20 mx-4 mt-2 rounded-2xl border border-white/20 bg-[#12245f]/95 px-3 py-2 text-white shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[11px] font-black uppercase tracking-wide">Sound</span>
            <button
              type="button"
              onClick={() => setSoundEnabled((enabled) => !enabled)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[10px] font-black",
                soundEnabled
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-white/15 text-white/70",
              )}
            >
              {soundEnabled ? "ON" : "OFF"}
            </button>
            <label className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white/65">
              {Math.round(soundVolume * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(soundVolume * 100)}
              onChange={(event) => setSoundVolume(Number(event.target.value) / 100)}
              className="min-w-0 flex-1 accent-yellow-300"
            />
          </div>
        </div>
      )}

      {isFinished && (
        <div className="relative z-10 mx-4 mt-3 rounded-xl border border-yellow-300/50 bg-yellow-300/15 px-4 py-2 text-center text-sm font-black text-yellow-100">
          {room.status === "CANCELLED"
            ? "Match cancelled"
            : winner?.userId === me?.userId
              ? "You won"
              : `${winner?.name ?? "Opponent"} won`}
        </div>
      )}

      {/* ── Board ── */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        <div
          className="aspect-square overflow-hidden rounded-xl bg-white"
          style={{
            width: "min(100%, 420px, calc(100vh - 178px))",
            boxShadow: "0 0 0 3px rgba(255,255,255,0.16), 0 18px 36px rgba(0,0,0,0.36)",
          }}
        >
          <LudoBoard
            tokenPositions={tokenPositions}
            onMoveToken={(id) => {
              preMoveRoomRef.current = room;
              isAnimatingRef.current = true;  // block socket updates NOW, before onSuccess
              moveMutation.mutate(id);
            }}
            viewerColor={me?.color as LudoColor | undefined}
          />
        </div>
      </div>

      {/* ── You label ── */}
      {/* ── Bottom bar ── */}
      <div className="relative z-10 mx-4 mb-2 mt-auto pt-3">
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-[18px] px-3 py-3"
          style={{
            background: "#2150d8",
            border: "3px solid #f5b414",
            boxShadow: "0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
          }}
        >
          <div className={cn(
            "translate-y-1 flex min-w-0 items-center gap-1.5 rounded-xl border px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
            myTurn
              ? "border-yellow-300 bg-yellow-300/16"
              : "border-white/15 bg-white/10",
          )}>
            <PlayerPin color={myColor} />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black leading-tight text-white">
                {me?.name ?? "You"}
              </p>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/55">
                {myTurn ? "Your turn" : "You"}
              </p>
              <AutoMoveDots count={me?.autoMoveCount} />
            </div>
          </div>

          {/* Dice + countdown ring */}
          <div className="relative flex shrink-0 flex-col items-center gap-1">

            {/* SVG ring — drains over ROLL_TIMEOUT_SEC seconds */}
            {canRoll && rollCountdown !== null && (() => {
              const r = 42;
              const circ = 2 * Math.PI * r;
              const fraction = rollCountdown / ROLL_TIMEOUT_SEC;
              const offset = circ * (1 - fraction);
              const danger = rollCountdown <= 1;
              return (
                <svg
                  aria-hidden
                  className="pointer-events-none absolute z-10"
                  style={{ top: -10, left: -10, width: 88, height: 88 }}
                  viewBox="0 0 88 88"
                >
                  {/* Track */}
                  <circle cx="44" cy="44" r={r} fill="none"
                    stroke="rgba(255,255,255,0.12)" strokeWidth="4.5" />
                  {/* Progress arc */}
                  <circle cx="44" cy="44" r={r} fill="none"
                    stroke={danger ? "#ef4444" : "#fbbf24"}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 44 44)"
                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                  />
                </svg>
              );
            })()}

            {/* Countdown badge */}
            {canRoll && rollCountdown !== null && rollCountdown > 0 && (
              <div
                className="pointer-events-none absolute -right-1 -top-2 z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-black shadow-lg"
                style={{
                  background: rollCountdown <= 1 ? "#ef4444" : "#fbbf24",
                  color: rollCountdown <= 1 ? "#fff" : "#1a1a1a",
                }}
              >
                {rollCountdown}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                startDiceSound();
                rollMutation.mutate();
              }}
              disabled={!canRoll}
              className={cn(
                "relative h-[68px] w-[68px] rounded-[18px] transition-all duration-100 active:translate-y-1",
                canRoll
                  ? "shadow-[0_7px_0_#163393,0_12px_20px_rgba(0,0,0,0.24)]"
                  : "opacity-60 shadow-[0_4px_0_#64748b]",
              )}
              style={{ background: canRoll ? "#7fb2ff" : "#9caee0" }}
            >
              <div className="flex h-full w-full items-center justify-center p-2">
                <DiceSVG value={visibleDiceValue} size={48} />
              </div>
              {rollMutation.isPending && (
                <Loader2 className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-800" />
              )}
            </button>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
              {statusText}
            </p>
          </div>

          <div className={cn(
            "translate-y-1 flex min-w-0 items-center justify-end gap-1.5 rounded-xl border px-2 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
            room.currentTurnUserId === opponent?.userId
              ? "border-yellow-300 bg-yellow-300/16"
              : "border-white/15 bg-white/10",
          )}>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black leading-tight text-white">
                {opponent?.name ?? "Opponent"}
              </p>
              <p className="text-[8px] font-black uppercase tracking-wider text-white/55">
                {room.currentTurnUserId === opponent?.userId ? "Turn" : "Opponent"}
              </p>
              <div className="flex justify-end">
                <AutoMoveDots count={opponent?.autoMoveCount} />
              </div>
            </div>
            <PlayerPin color={oppColor} />
          </div>
        </div>
      </div>

      {/* Sync */}
      <div className="relative z-10 flex justify-center pb-2">
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-1 text-[10px] font-bold text-white/35"
        >
          sync
        </button>
      </div>

      {resultType && (
        <LudoResultOverlay
          result={resultType}
          playerName={me?.name ?? "Player"}
          countdown={resultCountdown}
          showActions={resultActionsVisible}
          onPlayAgain={() => router.push("/games/ludo")}
          onHome={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}
