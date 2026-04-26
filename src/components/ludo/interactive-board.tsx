"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_SIZE = 15;
const CELL_PERCENT = 100 / BOARD_SIZE;
const PAWN_SIZE_PERCENT = CELL_PERCENT * 0.78;
const HOME_PAWNS_PER_COLOR = 2;
const COLORS = ["RED", "GREEN", "YELLOW", "BLUE"] as const;

type LudoColor = (typeof COLORS)[number];

type BoardCellType =
  | { type: "base"; color: LudoColor }
  | { type: "home"; color: LudoColor }
  | { type: "safe"; color?: LudoColor }
  | { type: "path"; color?: LudoColor }
  | { type: "center" };

export interface PawnPosition {
  color: string;
  id: number;
  position: number;
}

interface LudoGameState {
  pawnPositions: PawnPosition[];
  activeColor: LudoColor;
  diceValue: number | null;
  isRolling: boolean;
  turnMessage: string;
}

const COLOR_STYLES: Record<
  LudoColor,
  { base: string; border: string; tint: string; pawn: string; glow: string }
> = {
  RED: {
    base: "bg-[#ef4444]",
    border: "border-[#991b1b]",
    tint: "bg-[#fee2e2]",
    pawn: "from-[#f87171] to-[#b91c1c]",
    glow: "shadow-[0_0_18px_rgba(239,68,68,0.38)]",
  },
  GREEN: {
    base: "bg-[#22c55e]",
    border: "border-[#166534]",
    tint: "bg-[#dcfce7]",
    pawn: "from-[#4ade80] to-[#15803d]",
    glow: "shadow-[0_0_18px_rgba(34,197,94,0.35)]",
  },
  YELLOW: {
    base: "bg-[#facc15]",
    border: "border-[#a16207]",
    tint: "bg-[#fef9c3]",
    pawn: "from-[#fde047] to-[#ca8a04]",
    glow: "shadow-[0_0_18px_rgba(250,204,21,0.35)]",
  },
  BLUE: {
    base: "bg-[#3b82f6]",
    border: "border-[#1d4ed8]",
    tint: "bg-[#dbeafe]",
    pawn: "from-[#60a5fa] to-[#1d4ed8]",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.35)]",
  },
};

const MAIN_TRACK: Array<[number, number]> = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [7, 0],
  [6, 0],
];

const HOME_STRETCH: Record<LudoColor, Array<[number, number]>> = {
  RED: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  GREEN: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  YELLOW: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  BLUE: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};

const START_INDEX: Record<LudoColor, number> = {
  RED: 0,
  GREEN: 12,
  YELLOW: 24,
  BLUE: 37,
};

const SAFE_TRACK_INDEXES = new Set([0, 12, 24, 37]);

const HOME_SLOTS: Record<LudoColor, Array<[number, number]>> = {
  RED: [
    [1.8, 1.8],
    [3.8, 3.8],
  ],
  GREEN: [
    [1.8, 10.2],
    [3.8, 12.2],
  ],
  YELLOW: [
    [10.2, 10.2],
    [12.2, 12.2],
  ],
  BLUE: [
    [10.2, 1.8],
    [12.2, 3.8],
  ],
};

const createInitialState = (): LudoGameState => ({
  pawnPositions: COLORS.flatMap((color) =>
    Array.from({ length: HOME_PAWNS_PER_COLOR }, (_, index) => ({
      color,
      id: index + 1,
      position: -1,
    })),
  ),
  activeColor: "RED",
  diceValue: null,
  isRolling: false,
  turnMessage: "Roll the dice to start the round.",
});

function getBaseColor(row: number, col: number): LudoColor | null {
  if (row <= 5 && col <= 5) return "RED";
  if (row <= 5 && col >= 9) return "GREEN";
  if (row >= 9 && col >= 9) return "YELLOW";
  if (row >= 9 && col <= 5) return "BLUE";
  return null;
}

function getBoardCell(row: number, col: number): BoardCellType {
  const quadrantColor = getBaseColor(row, col);
  if (quadrantColor) {
    const innerRow = row >= 1 && row <= 4;
    const innerCol =
      quadrantColor === "RED" || quadrantColor === "BLUE"
        ? col >= 1 && col <= 4
        : col >= 10 && col <= 13;

    if (innerRow && innerCol) {
      return { type: "home", color: quadrantColor };
    }

    return { type: "base", color: quadrantColor };
  }

  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
    return { type: "center" };
  }

  const homeLaneColor = COLORS.find((color) =>
    HOME_STRETCH[color].some(([laneRow, laneCol]) => laneRow === row && laneCol === col),
  );

  if (homeLaneColor) {
    return { type: "path", color: homeLaneColor };
  }

  const trackIndex = MAIN_TRACK.findIndex(
    ([trackRow, trackCol]) => trackRow === row && trackCol === col,
  );

  if (trackIndex >= 0) {
    return {
      type: SAFE_TRACK_INDEXES.has(trackIndex) ? "safe" : "path",
    };
  }

  return { type: "path" };
}

function getPawnCoordinate(
  pawn: PawnPosition,
  stackedIndex: number,
): { row: number; col: number; label: string } {
  const color = pawn.color as LudoColor;

  if (pawn.position < 0) {
    const [row, col] = HOME_SLOTS[color][Math.max(0, pawn.id - 1)] ?? HOME_SLOTS[color][0];
    return { row, col, label: "Home" };
  }

  if (pawn.position >= MAIN_TRACK.length) {
    const stretchIndex = Math.min(
      pawn.position - MAIN_TRACK.length,
      HOME_STRETCH[color].length - 1,
    );
    const [row, col] = HOME_STRETCH[color][stretchIndex];
    const offsetMap: Array<[number, number]> = [
      [-0.16, -0.16],
      [0.16, 0.16],
      [-0.16, 0.16],
      [0.16, -0.16],
    ];
    const [rowOffset, colOffset] = offsetMap[stackedIndex] ?? [0, 0];
    return {
      row: row + rowOffset,
      col: col + colOffset,
      label: stretchIndex === HOME_STRETCH[color].length - 1 ? "Goal" : "Home lane",
    };
  }

  const [row, col] = MAIN_TRACK[pawn.position];
  const offsetMap: Array<[number, number]> = [
    [-0.18, -0.18],
    [0.18, 0.18],
    [-0.18, 0.18],
    [0.18, -0.18],
  ];
  const [rowOffset, colOffset] = offsetMap[stackedIndex] ?? [0, 0];
  return {
    row: row + rowOffset,
    col: col + colOffset,
    label: `Track ${pawn.position + 1}`,
  };
}

function getNextColor(color: LudoColor): LudoColor {
  return COLORS[(COLORS.indexOf(color) + 1) % COLORS.length];
}

export function InteractiveLudoBoard() {
  const [gameState, setGameState] = useState<LudoGameState>(createInitialState);

  const boardCells = useMemo(
    () =>
      Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
        const row = Math.floor(index / BOARD_SIZE);
        const col = index % BOARD_SIZE;
        return { row, col, cell: getBoardCell(row, col) };
      }),
    [],
  );

  const pawnStacks = useMemo(() => {
    const stackMap = new Map<string, number>();

    return gameState.pawnPositions.map((pawn) => {
      const rawKey =
        pawn.position < 0
          ? `${pawn.color}-home-${pawn.id}`
          : pawn.position >= MAIN_TRACK.length
            ? `${pawn.color}-lane-${pawn.position}`
            : `track-${pawn.position}`;
      const stackIndex = stackMap.get(rawKey) ?? 0;
      stackMap.set(rawKey, stackIndex + 1);
      return { pawn, stackIndex, coordinate: getPawnCoordinate(pawn, stackIndex) };
    });
  }, [gameState.pawnPositions]);

  const activePawns = useMemo(
    () =>
      gameState.pawnPositions.filter(
        (pawn) => pawn.color === gameState.activeColor && pawn.position < MAIN_TRACK.length + 6,
      ),
    [gameState.activeColor, gameState.pawnPositions],
  );

  const rollDice = () => {
    if (gameState.isRolling || gameState.diceValue !== null) return;

    setGameState((current) => ({
      ...current,
      isRolling: true,
      turnMessage: `${current.activeColor} is rolling the dice...`,
    }));

    window.setTimeout(() => {
      const nextValue = Math.floor(Math.random() * 6) + 1;
      setGameState((current) => ({
        ...current,
        isRolling: false,
        diceValue: nextValue,
        turnMessage: `Rolled ${nextValue}. Tap a ${current.activeColor.toLowerCase()} pawn to move.`,
      }));
    }, 720);
  };

  const movePawn = (selectedPawn: PawnPosition) => {
    if (gameState.isRolling || gameState.diceValue === null) return;
    if (selectedPawn.color !== gameState.activeColor) return;

    const diceValue = gameState.diceValue;
    const color = selectedPawn.color as LudoColor;
    const limit = MAIN_TRACK.length + HOME_STRETCH[color].length - 1;

    if (selectedPawn.position < 0 && diceValue !== 6) {
      setGameState((current) => ({
        ...current,
        diceValue: null,
        activeColor: getNextColor(current.activeColor),
        turnMessage: `${color} needs a 6 to leave home. Turn passed to ${getNextColor(color)}.`,
      }));
      return;
    }

    const tentativePosition =
      selectedPawn.position < 0 ? START_INDEX[color] : selectedPawn.position + diceValue;

    if (tentativePosition > limit) {
      setGameState((current) => ({
        ...current,
        diceValue: null,
        activeColor: getNextColor(current.activeColor),
        turnMessage: `${color} needs an exact roll to finish. Turn passed to ${getNextColor(color)}.`,
      }));
      return;
    }

    const nextColor = diceValue === 6 ? color : getNextColor(color);

    setGameState((current) => ({
      ...current,
      pawnPositions: current.pawnPositions.map((pawn) =>
        pawn.color === selectedPawn.color && pawn.id === selectedPawn.id
          ? { ...pawn, position: tentativePosition }
          : pawn,
      ),
      diceValue: null,
      activeColor: nextColor,
      turnMessage:
        diceValue === 6
          ? `${color} moved pawn ${selectedPawn.id} and earned another roll.`
          : `${color} moved pawn ${selectedPawn.id}. Next turn: ${nextColor}.`,
    }));
  };

  return (
    <section className="mx-auto w-full max-w-[38rem]">
      <div className="relative">
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#f8fafc] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-3">
          <div
            className="grid h-full w-full overflow-hidden rounded-[1.25rem]"
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
          >
            {boardCells.map(({ row, col, cell }) => {
              const color =
                "color" in cell && cell.color ? COLOR_STYLES[cell.color] : undefined;

              return (
                <div
                  key={`${row}-${col}`}
                  className={cn(
                    "relative border border-slate-300/90",
                    cell.type === "base" && color?.base,
                    cell.type === "home" && "bg-white",
                    cell.type === "path" && (color?.tint ?? "bg-white"),
                    cell.type === "safe" && "bg-white",
                    cell.type === "center" && "bg-white",
                  )}
                >
                  {cell.type === "home" && color ? (
                    <div className="flex h-full w-full items-center justify-center p-[10%]">
                      <div
                        className={cn(
                          "h-full w-full rounded-full border-[3px] bg-white shadow-inner",
                          color.border,
                        )}
                      />
                    </div>
                  ) : null}

                  {cell.type === "safe" ? (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute left-[40%] top-[40%] h-[20%] w-[20%] overflow-hidden rounded-full border border-slate-300">
            <div className="absolute inset-0 [clip-path:polygon(50%_50%,0_0,100%_0)] bg-[#ef4444]" />
            <div className="absolute inset-0 [clip-path:polygon(50%_50%,100%_0,100%_100%)] bg-[#22c55e]" />
            <div className="absolute inset-0 [clip-path:polygon(50%_50%,100%_100%,0_100%)] bg-[#facc15]" />
            <div className="absolute inset-0 [clip-path:polygon(50%_50%,0_100%,0_0)] bg-[#3b82f6]" />
          </div>

          {pawnStacks.map(({ pawn, stackIndex, coordinate }) => {
            const color = pawn.color as LudoColor;
            const isActivePawn =
              gameState.activeColor === pawn.color &&
              gameState.diceValue !== null &&
              !gameState.isRolling;

            return (
              <motion.button
                key={`${pawn.color}-${pawn.id}`}
                type="button"
                layout
                onClick={() => movePawn(pawn)}
                className={cn(
                  "absolute rounded-full border-[3px] border-white text-[0.65rem] font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.24)]",
                  `bg-gradient-to-br ${COLOR_STYLES[color].pawn}`,
                  isActivePawn && COLOR_STYLES[color].glow,
                  pawn.color !== gameState.activeColor && "cursor-default opacity-85",
                )}
                style={{
                  width: `${PAWN_SIZE_PERCENT}%`,
                  height: `${PAWN_SIZE_PERCENT}%`,
                }}
                animate={{
                  left: `${coordinate.col * CELL_PERCENT + (CELL_PERCENT - PAWN_SIZE_PERCENT) / 2}%`,
                  top: `${coordinate.row * CELL_PERCENT + (CELL_PERCENT - PAWN_SIZE_PERCENT) / 2}%`,
                  scale:
                    gameState.activeColor === pawn.color && gameState.diceValue !== null
                      ? 1.05
                      : 1,
                }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                whileHover={
                  isActivePawn
                    ? { scale: 1.1, y: -2 }
                    : undefined
                }
                whileTap={
                  isActivePawn
                    ? { scale: 0.96 }
                    : undefined
                }
                aria-label={`${pawn.color} pawn ${pawn.id}, ${coordinate.label}`}
              >
                <span className="drop-shadow-sm">{pawn.id}</span>
                {stackIndex > 0 ? (
                  <span className="sr-only">Stacked pawn</span>
                ) : null}
              </motion.button>
            );
          })}

        </div>
      </div>
    </section>
  );
}
