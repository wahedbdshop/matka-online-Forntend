"use client";

/**
 * Pixel-perfect 15×15 Ludo board.
 *
 * Grid layout (0-indexed):
 *   Rows 0-5 , cols 0-5  → RED home    (top-left)
 *   Rows 0-5 , cols 9-14 → YELLOW home (top-right)
 *   Rows 9-14, cols 0-5  → BLUE home   (bottom-left)
 *   Rows 9-14, cols 9-14 → GREEN home  (bottom-right)
 *   Cols 6-8 (all rows)  → vertical path arm
 *   Rows 6-8 (all cols)  → horizontal path arm
 *   Rows 6-8, cols 6-8   → center (3×3)
 *
 * All positions satisfy: mirror(r,c) = (14-r, 14-c) for 4-fold symmetry.
 */

import { createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────
export type LudoColor = "RED" | "GREEN" | "BLUE" | "YELLOW";

export type LudoToken = {
  id: string;
  color: LudoColor;
  label?: string;
  available?: boolean;
  home?: boolean;
  finished?: boolean;
};

export type LudoBoardProps = {
  /** Map keyed by "row-col" (e.g. "6-1") → tokens on that cell. */
  tokenPositions?: Map<string, LudoToken[]>;
  onMoveToken?: (tokenId: string) => void;
  viewerColor?: LudoColor;
  opponentColor?: LudoColor;
};

// ─────────────────────────────────────────────────────────────────────────────
// Board rotation context — shared with TokenPin for counter-rotation so that
// pins always point downward regardless of the board's CSS rotation angle.
// ─────────────────────────────────────────────────────────────────────────────
const BoardRotationContext = createContext<0 | 90 | 180 | 270>(0);

// ─────────────────────────────────────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
  RED:    { main: "#ff2332", dark: "#b50f18", tint: "#ff2332" },
  GREEN:  { main: "#08bf45", dark: "#04722a", tint: "#08bf45" },
  BLUE:   { main: "#2fa9f5", dark: "#166f9f", tint: "#2fa9f5" },
  YELLOW: { main: "#ffd51b", dark: "#c08a00", tint: "#ffd51b" },
} satisfies Record<LudoColor, { main: string; dark: string; tint: string }>;

function darkenHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const safeAmount = Math.max(0, Math.min(1, amount));
  const toChannel = (start: number) => {
    const value = Number.parseInt(normalized.slice(start, start + 2), 16);
    const darkened = Math.max(0, Math.round(value * (1 - safeAmount)));
    return darkened.toString(16).padStart(2, "0");
  };

  return `#${toChannel(0)}${toChannel(2)}${toChannel(4)}`;
}

type Seat = "top-left" | "top-right" | "bottom-right" | "bottom-left";
const ABSOLUTE_COLOR_SEAT: Record<LudoColor, Seat> = {
  RED: "top-left",
  GREEN: "top-right",
  YELLOW: "bottom-right",
  BLUE: "bottom-left",
};

const DISPLAY_SEAT_TO_WIN_ANCHORS: Record<Seat, Array<{ left: string; top: string }>> = {
  "top-left": [
    { left: "30%", top: "50%" },
    { left: "38%", top: "42%" },
    { left: "38%", top: "58%" },
    { left: "46%", top: "50%" },
  ],
  "top-right": [
    { left: "50%", top: "30%" },
    { left: "42%", top: "38%" },
    { left: "58%", top: "38%" },
    { left: "50%", top: "46%" },
  ],
  "bottom-right": [
    { left: "70%", top: "50%" },
    { left: "62%", top: "42%" },
    { left: "62%", top: "58%" },
    { left: "54%", top: "50%" },
  ],
  "bottom-left": [
    { left: "50%", top: "70%" },
    { left: "42%", top: "62%" },
    { left: "58%", top: "62%" },
    { left: "50%", top: "54%" },
  ],
};

function getDisplaySeatColors(
  viewerColor?: LudoColor,
  opponentColor?: LudoColor,
): Record<Seat, LudoColor> {
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
  seatColors: Record<Seat, LudoColor>,
): Seat {
  return (
    (Object.entries(seatColors).find(([, seatColor]) => seatColor === color)?.[0] as Seat | undefined) ??
    "bottom-left"
  );
}

function remapKindForView(
  kind: CellKind,
  seatColors: Record<Seat, LudoColor>,
): CellKind {
  if (!("color" in kind)) return kind;

  const mappedColor = seatColors[ABSOLUTE_COLOR_SEAT[kind.color]];

  if (kind.t === "direction") {
    return { ...kind, color: mappedColor };
  }

  return { ...kind, color: mappedColor };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mathematical layout
// ─────────────────────────────────────────────────────────────────────────────

// Home inner white zone bounds [r1, r2, c1, c2] (inclusive).
// All four are derived from RED = [1,4,1,4] by applying (r→14-r) and/or (c→14-c).
const HOME_INNER_BOUNDS: Record<LudoColor, readonly [number, number, number, number]> = {
  RED:    [1,  4,  1,  4],
  GREEN:  [1,  4,  10, 13],
  BLUE:   [10, 13, 1,  4],   // r → 14-r: 1→13, 4→10
  YELLOW: [10, 13, 10, 13],
};

/**
 * Home-circle positions.
 * RED base: (1,1),(1,3),(3,1),(3,3)
 * YELLOW: c → 14-c  → (1,13),(1,11),(3,13),(3,11)
 * BLUE:   r → 14-r  → (13,1),(13,3),(11,1),(11,3)
 * GREEN:  both      → (13,13),(13,11),(11,13),(11,11)
 */
const HOME_CIRCLE_MAP = new Map<string, LudoColor>([
  // RED
  ["1-1", "RED"],  ["1-3", "RED"],  ["3-1", "RED"],  ["3-3", "RED"],
  // YELLOW (c → 14-c)
  ["1-11","GREEN"],["1-13","GREEN"],["3-11","GREEN"],["3-13","GREEN"],
  // BLUE   (r → 14-r)
  ["11-1","BLUE"], ["11-3","BLUE"], ["13-1","BLUE"], ["13-3","BLUE"],
  // GREEN  (r → 14-r, c → 14-c)
  ["11-11","YELLOW"],["11-13","YELLOW"],["13-11","YELLOW"],["13-13","YELLOW"],
]);

/**
 * Safe cells — 4 positions, rotationally symmetric about (7,7).
 *
 *   (2,6)   top arm
 *   (6,12)  right arm
 *   (12,8)  bottom arm
 *   (8,2)   left arm
 */
const SAFE_SET = new Set([
  "2-6",
  "6-12",
  "12-8",
  "8-2",
]);

const SAFE_COLOR_MAP = new Map<string, LudoColor>([
  ["2-6", "GREEN"],
  ["6-12", "YELLOW"],
  ["12-8", "BLUE"],
  ["8-2", "RED"],
]);

/**
 * Colored run-up lanes — the final stretch each color travels before reaching
 * the center. Symmetric about both axes.
 *
 *   YELLOW → col 7, rows 1-5   (enters center from top)
 *   BLUE   → col 7, rows 9-13  (enters center from bottom)
 *   RED    → row 7, cols 1-5   (enters center from left)
 *   GREEN  → row 7, cols 9-13  (enters center from right)
 */
const RUN_UP_MAP = ((): Map<string, LudoColor> => {
  const m = new Map<string, LudoColor>();
  for (let r = 1; r <= 5;  r++) m.set(`${r}-7`, "GREEN");
  for (let r = 9; r <= 13; r++) m.set(`${r}-7`, "BLUE");
  for (let c = 1; c <= 5;  c++) m.set(`7-${c}`, "RED");
  for (let c = 9; c <= 13; c++) m.set(`7-${c}`, "YELLOW");
  return m;
})();

/** Token entry cells (where each color exits its home and enters the shared path). */
const START_MAP = new Map<string, LudoColor>([
  ["6-1",  "RED"],
  ["1-8",  "GREEN"],
  ["8-13", "YELLOW"],
  ["13-6", "BLUE"],
]);

/**
 * Directional arrow cells at the four arm edges — indicate travel direction
 * and are tinted with the adjacent home color.
 */
const DIRECTION_MAP = new Map<string, { arrow: string; color: LudoColor }>([
  ["0-7",  { arrow: "↓", color: "YELLOW" }],
  ["7-0",  { arrow: "→", color: "RED" }],
  ["7-14", { arrow: "←", color: "GREEN" }],
  ["14-7", { arrow: "↑", color: "BLUE" }],
]);

// ─────────────────────────────────────────────────────────────────────────────
// Cell classification
// ─────────────────────────────────────────────────────────────────────────────
type CellKind =
  | { t: "home-outer";  color: LudoColor }
  | { t: "home-inner";  color: LudoColor }
  | { t: "home-circle"; color: LudoColor }
  | { t: "run-up";      color: LudoColor }
  | { t: "start";       color: LudoColor }
  | { t: "safe";        color: LudoColor }
  | { t: "direction";   color: LudoColor; arrow: string }
  | { t: "center" }
  | { t: "path" };

function classify(row: number, col: number): CellKind {
  const key = `${row}-${col}`;

  // ── Home quadrants ────────────────────────────────────────────────────────
  const inRed    = row <= 5 && col <= 5;
  const inGreen  = row <= 5 && col >= 9;
  const inBlue   = row >= 9 && col <= 5;
  const inYellow = row >= 9 && col >= 9;

  if (inRed || inGreen || inBlue || inYellow) {
    const color: LudoColor =
      inRed ? "RED" : inGreen ? "GREEN" : inBlue ? "BLUE" : "YELLOW";

    if (HOME_CIRCLE_MAP.has(key)) return { t: "home-circle", color };

    const [r1, r2, c1, c2] = HOME_INNER_BOUNDS[color];
    if (row >= r1 && row <= r2 && col >= c1 && col <= c2)
      return { t: "home-inner", color };

    return { t: "home-outer", color };
  }

  // ── Center 3×3 ───────────────────────────────────────────────────────────
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return { t: "center" };

  // ── Colored run-up lanes ─────────────────────────────────────────────────
  const runColor = RUN_UP_MAP.get(key);
  if (runColor) return { t: "run-up", color: runColor };

  // ── Color start / entry cells ────────────────────────────────────────────
  const startColor = START_MAP.get(key);
  if (startColor) return { t: "start", color: startColor };

  // ── Safe cells ───────────────────────────────────────────────────────────
  if (SAFE_SET.has(key)) {
    return { t: "safe", color: SAFE_COLOR_MAP.get(key) ?? "RED" };
  }

  // ── Directional arrow cells ───────────────────────────────────────────────
  const dir = DIRECTION_MAP.get(key);
  if (dir) {
    if (key === "0-7") return { t: "direction", color: "GREEN", arrow: "down" };
    if (key === "7-0") return { t: "direction", color: "RED", arrow: "right" };
    if (key === "7-14") return { t: "direction", color: "YELLOW", arrow: "left" };
    if (key === "14-7") return { t: "direction", color: "BLUE", arrow: "up" };
    return { t: "direction", color: dir.color, arrow: dir.arrow };
  }

  // ── Regular path ─────────────────────────────────────────────────────────
  return { t: "path" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token pin — location-pin (map marker) style, matching the Ludo King aesthetic.
//
// Shape: teardrop — circle head (centre 20,16 r=14) tapering to a downward tip.
// Square 40×40 viewBox ensures counter-rotation never clips the content.
// Reads BoardRotationContext to rotate itself opposite to the board so it
// always appears upright (pointing down) regardless of the board's CSS rotation.
//
// Interactive tokens: button covers the full parent (absolute inset-0) so the
// entire cell is tappable on mobile.
// Non-interactive tokens: simple centred div.
// ─────────────────────────────────────────────────────────────────────────────
function TokenPin({
  token,
  fill = "100%",
  onMove,
}: {
  token: LudoToken;
  fill?: string;
  onMove?: (id: string) => void;
}) {
  return <ClassicTokenPin token={token} fill={fill} onMove={onMove} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeArea — conceptual component (documents home structure; cells rendered
// individually inside the LudoBoard grid).
// ─────────────────────────────────────────────────────────────────────────────
export function HomeArea({
  color,
  children,
}: {
  color: LudoColor;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: PALETTE[color].main }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell
// ─────────────────────────────────────────────────────────────────────────────
function Cell({
  kind,
  tokens,
  onMove,
}: {
  kind: CellKind;
  tokens: LudoToken[];
  onMove?: (id: string) => void;
}) {
  const first = tokens[0];
  const multi = tokens.length > 1;
  const routeTokenFill = "108%";

  // ── HOME OUTER — solid color, no border ───────────────────────────────────
  if (kind.t === "home-outer") {
    return (
      <div
        className="aspect-square"
        style={{ backgroundColor: PALETTE[kind.color].main }}
      />
    );
  }

  // ── HOME INNER — white; merges to form the white inset box ────────────────
  if (kind.t === "home-inner") {
    return <div className="aspect-square bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />;
  }

  // ── HOME CIRCLE — token starting position ─────────────────────────────────
  if (kind.t === "home-circle") {
    const hex = PALETTE[kind.color].main;
    return (
      <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible bg-white p-[5%]">
        {/* Decorative circle — shows under token if occupied */}
        <div
          className="relative z-10 flex h-full w-full items-center justify-center overflow-visible rounded-full"
          style={{
            background: `radial-gradient(circle at 36% 30%, #ffffff40, ${hex} 45%, ${hex})`,
            boxShadow: `0 2px 6px rgba(0,0,0,.25), 0 0 0 3px white, 0 0 0 4px ${hex}88`,
          }}
        >
          {/* Highlight arc */}
          <span
            className="absolute rounded-full"
            style={{
              top: "8%", left: "14%",
              width: "40%", height: "30%",
              background: "rgba(255,255,255,.32)",
              borderRadius: "50%",
            }}
          />
          {/* Inner white dot */}
          <span
            className="rounded-full"
            style={{ width: "36%", height: "36%", background: "rgba(255,255,255,.48)" }}
          />

          {/* Token (if present) rendered on top */}
          {first && (
            <div className="absolute -inset-[4%] z-20 overflow-visible">
              <TokenPin
                token={first}
                fill={routeTokenFill}
                onMove={first.available ? onMove : undefined}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CENTER — transparent; SVG overlay covers this zone ────────────────────
  if (kind.t === "center") {
    return <div className="aspect-square bg-transparent" />;
  }

  // ── RUN-UP LANE — colored tint, path border ───────────────────────────────
  if (kind.t === "run-up") {
    return (
      <div
        className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7]"
        style={{ backgroundColor: PALETTE[kind.color].tint }}
      >
        {!multi && first ? (
          <TokenPin
            token={first}
            fill={routeTokenFill}
            onMove={first.available ? onMove : undefined}
          />
        ) : (
          null
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  // ── START CELL — colored entry indicator ──────────────────────────────────
  if (kind.t === "start") {
    const hex = PALETTE[kind.color].main;
    return (
      <div
        className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7] bg-white"
        style={{ boxShadow: `inset 0 0 0 2.5px ${hex}` }}
      >
        {!multi && first ? (
          <TokenPin token={first} fill={routeTokenFill} onMove={first.available ? onMove : undefined} />
        ) : (
          <span
            className="rounded-full opacity-55"
            style={{ width: "38%", height: "38%", backgroundColor: hex }}
          />
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  // ── SAFE CELL — white with star icon ─────────────────────────────────────
  if (kind.t === "safe") {
    const hex = PALETTE[kind.color].main;
    const softHex = darkenHex(hex, 0.18);
    return (
      <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7] bg-white">
        {!multi && first && (
          <TokenPin token={first} fill={routeTokenFill} onMove={first.available ? onMove : undefined} />
        )}
        {!first && (
          <svg viewBox="0 0 20 20" className="h-[68%] w-[68%]" fill={`${hex}26`} stroke={softHex} strokeWidth="1.25">
            <polygon points="10,2 12.4,7.8 18.5,8.5 14,12.8 15.3,19 10,15.8 4.7,19 6,12.8 1.5,8.5 7.6,7.8" />
          </svg>
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  // ── DIRECTION CELL — colored arrow at arm edges ───────────────────────────
  if (kind.t === "direction") {
    return (
      <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7] bg-white">
        {!multi && first && (
          <TokenPin token={first} fill={routeTokenFill} onMove={first.available ? onMove : undefined} />
        )}
        {!first && (
          <span
            className="select-none pointer-events-none leading-none"
            style={{ color: PALETTE[kind.color].main, fontSize: "65%", fontWeight: 700 }}
          >
            {kind.arrow}
          </span>
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  // ── REGULAR PATH ──────────────────────────────────────────────────────────
  return (
    <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7] bg-white">
      {!multi && first && (
        <TokenPin token={first} fill={routeTokenFill} onMove={first.available ? onMove : undefined} />
      )}
      {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiTokens — up to 4 tokens in a 2×2 layout when a cell is crowded
// ─────────────────────────────────────────────────────────────────────────────
function MultiTokens({
  tokens,
  onMove,
}: {
  tokens: LudoToken[];
  onMove?: (id: string) => void;
}) {
  const visibleTokens = tokens.slice(0, 4);
  const positionsByCount: Record<number, Array<{ left: string; top: string; size: string }>> = {
    1: [{ left: "50%", top: "50%", size: "80%" }],
    2: [
      { left: "38%", top: "50%", size: "64%" },
      { left: "62%", top: "50%", size: "64%" },
    ],
    3: [
      { left: "50%", top: "32%", size: "56%" },
      { left: "32%", top: "66%", size: "56%" },
      { left: "68%", top: "66%", size: "56%" },
    ],
    4: [
      { left: "32%", top: "32%", size: "50%" },
      { left: "68%", top: "32%", size: "50%" },
      { left: "32%", top: "68%", size: "50%" },
      { left: "68%", top: "68%", size: "50%" },
    ],
  };
  const positions = positionsByCount[visibleTokens.length] ?? positionsByCount[4];

  return (
    <div className="absolute inset-0 z-20 overflow-visible">
      {visibleTokens.map((t, index) => {
        const pos = positions[index] ?? positions[positions.length - 1];
        return (
          <div
            key={t.id}
            className="absolute flex items-center justify-center overflow-visible animate-[ludo-token-hop_.24s_cubic-bezier(.22,.8,.28,1)]"
            style={{
              left: pos.left,
              top: pos.top,
              width: pos.size,
              height: pos.size,
              transform: "translate(-50%, -50%)",
            }}
          >
            <ClassicTokenPin
              token={t}
              fill="100%"
              onMove={t.available ? onMove : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function ClassicTokenPin({
  token,
  fill = "100%",
  onMove,
}: {
  token: LudoToken;
  fill?: string;
  onMove?: (id: string) => void;
}) {
  const boardRotation = useContext(BoardRotationContext);
  const hex = PALETTE[token.color].main;
  const dark = PALETTE[token.color].dark;
  const gid = `${token.color.toLowerCase()}-${token.id.replace(/[^a-z0-9_-]/gi, "")}`;
  const shellDark = "rgba(17,24,39,0.9)";
  const rotationStyle =
    boardRotation !== 0
      ? {
          transform: `rotate(${-boardRotation}deg)`,
          transformOrigin: "center",
        }
      : undefined;

  const pinPath =
    "M20 37 C16.1 32 10 26.1 10 17.5 C10 10.1 14.5 5 20 5 C25.5 5 30 10.1 30 17.5 C30 26.1 23.9 32 20 37 Z";
  const innerPinPath =
    "M20 34.4 C17.1 30.5 13 25.6 13 18.1 C13 12.2 16.2 8.6 20 8.6 C23.8 8.6 27 12.2 27 18.1 C27 25.6 22.9 30.5 20 34.4 Z";
  const tokenBasePath =
    "M14.4 29.4 C16.1 31.8 17.8 34.1 20 36.7 C22.2 34.1 23.9 31.8 25.6 29.4";

  const finishedEl = (
    <svg
      viewBox="0 0 40 40"
      style={{ width: fill, height: fill, flexShrink: 0, ...rotationStyle }}
      className="drop-shadow-[0_0_10px_rgba(255,255,255,0.42)]"
    >
      <defs>
        <radialGradient id={`shell-finished-${gid}`} cx="35%" cy="24%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="34%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#bcc8d8" />
        </radialGradient>
        <radialGradient id={`core-finished-${gid}`} cx="34%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="16%" stopColor="#ffffff" stopOpacity="0.84" />
          <stop offset="28%" stopColor={hex} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`base-finished-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.94)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)" />
        </linearGradient>
      </defs>

      <ellipse cx="20.4" cy="37" rx="8.7" ry="2.7" fill="rgba(15,23,42,0.16)" />
      <path d={pinPath} fill={`url(#shell-finished-${gid})`} stroke={shellDark} strokeWidth="1.35" />
      <path d={innerPinPath} fill="rgba(255,255,255,0.88)" />
      <path d={tokenBasePath} fill={`url(#base-finished-${gid})`} stroke="rgba(148,163,184,0.5)" strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="20" cy="30.9" rx="5.6" ry="1.5" fill="rgba(15,23,42,0.14)" />
      <circle cx="20" cy="17.2" r="8.55" fill="white" stroke="rgba(148,163,184,0.7)" strokeWidth="0.85" />
      <circle cx="20" cy="17.2" r="7.1" fill={`url(#core-finished-${gid})`} stroke={dark} strokeWidth="1" />
      <circle cx="20" cy="17.2" r="3.35" fill="rgba(255,255,255,0.16)" />
      <ellipse cx="16.9" cy="12.8" rx="3.35" ry="1.95" fill="rgba(255,255,255,0.68)" transform="rotate(-22 16.9 12.8)" />
    </svg>
  );

  const svgEl = token.finished ? (
    finishedEl
  ) : (
    <svg
      viewBox="0 0 40 40"
      style={{ width: fill, height: fill, flexShrink: 0, ...rotationStyle }}
      className={cn(token.available && "drop-shadow-[0_0_10px_rgba(253,224,71,1)]")}
    >
      <defs>
        <radialGradient id={`shell-${gid}`} cx="35%" cy="24%" r="76%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="34%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#c7d2df" />
        </radialGradient>
        <radialGradient id={`core-${gid}`} cx="34%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="16%" stopColor="#ffffff" stopOpacity="0.86" />
          <stop offset="28%" stopColor={hex} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`base-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.62)" />
        </linearGradient>
      </defs>

      <ellipse cx="20.4" cy="37.1" rx="8.9" ry="2.8" fill="rgba(15,23,42,0.2)" />
      <path d={pinPath} fill={`url(#shell-${gid})`} stroke={shellDark} strokeWidth="1.45" />
      <path d={innerPinPath} fill="rgba(255,255,255,0.86)" />
      <path d={tokenBasePath} fill={`url(#base-${gid})`} stroke="rgba(148,163,184,0.52)" strokeWidth="0.86" strokeLinecap="round" />
      <ellipse cx="20" cy="31" rx="5.7" ry="1.55" fill="rgba(15,23,42,0.16)" />
      <circle cx="20" cy="17.2" r="8.95" fill="white" stroke="rgba(15,23,42,0.76)" strokeWidth="0.95" />
      <circle cx="20" cy="17.2" r="7.5" fill={`url(#core-${gid})`} stroke={dark} strokeWidth="1.06" />
      <circle cx="20" cy="17.2" r="3.55" fill="rgba(255,255,255,0.14)" />
      <ellipse cx="16.9" cy="12.8" rx="3.35" ry="2" fill="rgba(255,255,255,0.66)" transform="rotate(-22 16.9 12.8)" />
      {token.available && (
        <path d={pinPath} fill="none" stroke="#fbbf24" strokeWidth="2.2" opacity="0.98" />
      )}
    </svg>
  );

  const tokenContent = (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{ width: fill, height: fill }}
    >
      {!token.finished && (
        <>
          {token.available ? (
            <>
              <span
                className="absolute left-1/2 top-[44%] z-0 rounded-full animate-[ludo-available-aura_1.6s_ease-in-out_infinite]"
                style={{
                  width: "144%",
                  height: "144%",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, ${hex}5e 0%, ${hex}30 42%, transparent 74%)`,
                  filter: `blur(1.8px) drop-shadow(0 0 14px ${hex}aa)`,
                }}
              />
              <span
                className="absolute left-1/2 top-[44%] z-0 rounded-full animate-[ludo-available-spin_1s_linear_infinite]"
                style={{
                  width: "123%",
                  height: "123%",
                  transform: "translate(-50%, -50%)",
                  background: `conic-gradient(
                    from 0deg,
                    rgba(255,255,255,0.03) 0deg 18deg,
                    ${hex} 18deg 34deg,
                    #ffffff 34deg 42deg,
                    transparent 42deg 45deg,
                    rgba(255,255,255,0.03) 45deg 63deg,
                    ${hex} 63deg 79deg,
                    #ffffff 79deg 87deg,
                    transparent 87deg 90deg,
                    rgba(255,255,255,0.03) 90deg 108deg,
                    ${hex} 108deg 124deg,
                    #ffffff 124deg 132deg,
                    transparent 132deg 135deg,
                    rgba(255,255,255,0.03) 135deg 153deg,
                    ${hex} 153deg 169deg,
                    #ffffff 169deg 177deg,
                    transparent 177deg 180deg,
                    rgba(255,255,255,0.03) 180deg 198deg,
                    ${hex} 198deg 214deg,
                    #ffffff 214deg 222deg,
                    transparent 222deg 225deg,
                    rgba(255,255,255,0.03) 225deg 243deg,
                    ${hex} 243deg 259deg,
                    #ffffff 259deg 267deg,
                    transparent 267deg 270deg,
                    rgba(255,255,255,0.03) 270deg 288deg,
                    ${hex} 288deg 304deg,
                    #ffffff 304deg 312deg,
                    transparent 312deg 315deg,
                    rgba(255,255,255,0.03) 315deg 333deg,
                    ${hex} 333deg 349deg,
                    #ffffff 349deg 357deg,
                    transparent 357deg 360deg
                  )`,
                  boxShadow: `0 0 0 2px rgba(255,255,255,0.95), 0 0 18px ${hex}bb`,
                  WebkitMask:
                    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 6px))",
                  mask:
                    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 6px))",
                }}
              />
              <span
                className="absolute left-1/2 top-[73%] z-0 rounded-full"
                style={{
                  width: "56%",
                  height: "16%",
                  transform: "translateX(-50%)",
                  background: `radial-gradient(ellipse at center, ${hex}77 0%, ${hex}24 70%, transparent 100%)`,
                  filter: `blur(0.5px) drop-shadow(0 0 6px ${hex}77)`,
                }}
              />
            </>
          ) : (
            <>
              <span
                className="absolute left-1/2 top-[71%] z-0 rounded-full"
                style={{
                  width: "62%",
                  height: "20%",
                  transform: "translateX(-50%)",
                  background: `radial-gradient(ellipse at center, ${hex}66 0%, ${hex}20 72%, transparent 100%)`,
                  filter: `drop-shadow(0 0 6px ${hex}88)`,
                }}
              />
              <span
                className="absolute left-1/2 top-[68%] z-0 rounded-full border-[3px]"
                style={{
                  width: "48%",
                  height: "15%",
                  transform: "translateX(-50%)",
                  borderColor: hex,
                  boxShadow: `0 0 0 2px rgba(255,255,255,0.94), 0 0 10px ${hex}77`,
                  background: "rgba(255,255,255,0.18)",
                }}
              />
            </>
          )}
        </>
      )}
      <span
        className={cn(
          "relative z-10 flex h-full w-full items-center justify-center overflow-visible transition-transform duration-200",
          token.available && "group-hover:-translate-y-1 group-hover:scale-[1.05] group-active:translate-y-0 group-active:scale-100",
        )}
        style={
          token.available
            ? {
                filter: `drop-shadow(0 0 8px ${hex}66)`,
                transform: "scale(1.18)",
              }
            : undefined
        }
      >
        {svgEl}
      </span>
    </div>
  );

  if (!onMove) {
    return (
      <div
        data-testid="each-token"
        data-token-id={token.id}
        className="relative z-20 flex items-center justify-center overflow-visible"
        style={{ width: fill, height: fill }}
      >
        {tokenContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={() => onMove(token.id)}
      onKeyDown={(event) => event.key === "Enter" && onMove(token.id)}
      data-testid="each-token"
      data-token-id={token.id}
      className="group absolute inset-0 z-20 flex items-center justify-center overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      {tokenContent}
    </button>
  );
}

function DirectionArrowIcon({
  direction,
  color,
}: {
  direction: string;
  color: string;
}) {
  const path =
    direction === "down"
      ? "M10 4 V14 M6 10 L10 14 L14 10"
      : direction === "up"
        ? "M10 16 V6 M6 10 L10 6 L14 10"
        : direction === "left"
          ? "M16 10 H6 M10 6 L6 10 L10 14"
          : "M4 10 H14 M10 6 L14 10 L10 14";

  return (
    <svg
      viewBox="0 0 20 20"
      className="pointer-events-none h-[62%] w-[62%]"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      opacity="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

function TrackTokenSlot({
  token,
  onMove,
}: {
  token: LudoToken;
  onMove?: (id: string) => void;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-visible">
      <div className="flex h-full w-full -translate-y-[10%] scale-[1.42] items-center justify-center animate-[ludo-token-hop_.22s_cubic-bezier(.2,.8,.28,1)] sm:scale-[1.28]">
        <ClassicTokenPin
          token={token}
          fill="100%"
          onMove={token.available ? onMove : undefined}
        />
      </div>
    </div>
  );
}

function BoardCell({
  kind,
  tokens,
  onMove,
}: {
  kind: CellKind;
  tokens: LudoToken[];
  onMove?: (id: string) => void;
}) {
  const first = tokens[0];
  const multi = tokens.length > 1;
  const boardLine = "#b7b7b7";
  const trackCellClassName =
    "relative z-20 flex h-full w-full items-center justify-center overflow-visible border bg-white";
  const classicWhiteCellStyle = {
    borderColor: boardLine,
    backgroundColor: "#ffffff",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.02)",
  };
  const classicColoredCellStyle = (color: string) => ({
    borderColor: boardLine,
    backgroundColor: color,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  });

  if (kind.t === "home-outer") {
    return (
      <div
        className="h-full w-full"
        style={{
          backgroundColor: PALETTE[kind.color].main,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      />
    );
  }

  if (kind.t === "home-inner") {
    return (
      <div
        className="h-full w-full bg-white"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
      />
    );
  }

  if (kind.t === "home-circle") {
    const hex = PALETTE[kind.color].main;
    const ring = darkenHex(hex, 0.14);

    return (
      <div className="relative z-20 flex h-full w-full items-center justify-center overflow-visible bg-white p-[8%] sm:p-[10%]">
        <div
          className="relative z-10 flex h-full w-full items-center justify-center overflow-visible rounded-full"
          style={{
            background: hex,
            boxShadow: first
              ? `0 2px 5px rgba(0,0,0,.22), 0 0 0 3px #ffffff, 0 0 0 5px ${ring}`
              : `inset 0 2px 0 rgba(255,255,255,0.26), inset 0 -2px 0 rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.14)`,
          }}
        >
          {!first && (
            <span
              className="absolute rounded-full"
              style={{
                inset: "15%",
                background: "rgba(255,255,255,0.18)",
              }}
            />
          )}
          {first && (
            <div className="absolute -inset-x-[40%] -inset-y-[32%] -translate-y-[12%] z-20 overflow-visible sm:-inset-x-[38%] sm:-inset-y-[31%] sm:-translate-y-[12%]">
              <ClassicTokenPin
                token={first}
                fill="100%"
                onMove={first.available ? onMove : undefined}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (kind.t === "center") {
    return <div className="h-full w-full bg-transparent" />;
  }

  if (kind.t === "run-up" || kind.t === "start") {
    return (
      <div
        className={trackCellClassName}
        style={classicColoredCellStyle(PALETTE[kind.color].tint)}
      >
        {!multi && first ? <TrackTokenSlot token={first} onMove={onMove} /> : null}
        {multi && (
          <MultiTokens
            tokens={tokens}
            onMove={onMove}
          />
        )}
      </div>
    );
  }

  if (kind.t === "safe") {
    const hex = PALETTE[kind.color].main;
    const softHex = darkenHex(hex, 0.18);
    return (
      <div className={trackCellClassName} style={classicWhiteCellStyle}>
        {!multi && first && <TrackTokenSlot token={first} onMove={onMove} />}
        {!first && (
          <svg
            viewBox="0 0 20 20"
            className="h-[74%] w-[74%]"
            fill="none"
            stroke={softHex}
            strokeWidth="1.15"
            strokeLinejoin="round"
            opacity="0.95"
          >
            <polygon points="10,2 12.4,7.8 18.5,8.5 14,12.8 15.3,19 10,15.8 4.7,19 6,12.8 1.5,8.5 7.6,7.8" />
          </svg>
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  if (kind.t === "direction") {
    return (
      <div className={trackCellClassName} style={classicWhiteCellStyle}>
        {!multi && first && <TrackTokenSlot token={first} onMove={onMove} />}
        {!first && (
          <DirectionArrowIcon direction={kind.arrow} color={PALETTE[kind.color].main} />
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  return (
    <div className={trackCellClassName} style={classicWhiteCellStyle}>
      {!multi && first && <TrackTokenSlot token={first} onMove={onMove} />}
      {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
    </div>
  );
}

function ClassicCenterOverlay({
  seatColors,
}: {
  seatColors: Record<Seat, LudoColor>;
}) {
  const topColor = PALETTE[seatColors["top-right"]].main;
  const rightColor = PALETTE[seatColors["bottom-right"]].main;
  const bottomColor = PALETTE[seatColors["bottom-left"]].main;
  const leftColor = PALETTE[seatColors["top-left"]].main;

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{ top: "40%", left: "40%", width: "20%", height: "20%" }}
    >
      <svg
        viewBox="0 0 3 3"
        className="block h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <polygon points="0,0 3,0 1.5,1.5" fill={topColor} />
        <polygon points="3,0 3,3 1.5,1.5" fill={rightColor} />
        <polygon points="3,3 0,3 1.5,1.5" fill={bottomColor} />
        <polygon points="0,3 0,0 1.5,1.5" fill={leftColor} />
        <line x1="0" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.34)" strokeWidth="0.03" />
        <line x1="3" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.34)" strokeWidth="0.03" />
        <line x1="3" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.34)" strokeWidth="0.03" />
        <line x1="0" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.34)" strokeWidth="0.03" />
      </svg>
    </div>
  );
}

function ClassicCenterWinTokens({
  tokens,
  seatColors,
}: {
  tokens: LudoToken[];
  seatColors: Record<Seat, LudoColor>;
}) {
  if (tokens.length === 0) return null;

  const byColor = tokens.reduce<Record<LudoColor, LudoToken[]>>(
    (acc, token) => {
      acc[token.color].push(token);
      return acc;
    },
    { RED: [], GREEN: [], BLUE: [], YELLOW: [] },
  );

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ top: "40%", left: "40%", width: "20%", height: "20%" }}
    >
      {(Object.keys(byColor) as LudoColor[]).flatMap((color) =>
        byColor[color].slice(0, 4).map((token, index) => {
          const displaySeat = getDisplaySeatForColor(color, seatColors);
          const pos = DISPLAY_SEAT_TO_WIN_ANCHORS[displaySeat][index];
          return (
            <div
              key={token.id}
              className="absolute flex items-center justify-center"
              style={{
                left: pos.left,
                top: pos.top,
                width: "30%",
                height: "30%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <ClassicTokenPin token={{ ...token, finished: true, home: false }} fill="100%" />
            </div>
          );
        }),
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Center overlay — 4 perfectly aligned triangles + white circle
//
// Covers rows 6-8, cols 6-8 → top: 6/15=40%, left: 6/15=40%, size: 3/15=20%.
// SVG viewBox 0 0 3 3 (one unit = one cell) for sub-pixel precision.
// ─────────────────────────────────────────────────────────────────────────────
function CenterOverlay() {
  const R = PALETTE.RED.main;
  const G = PALETTE.GREEN.main;
  const B = PALETTE.BLUE.main;
  const Y = PALETTE.YELLOW.main;

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{ top: "40%", left: "40%", width: "20%", height: "20%" }}
    >
      <svg
        viewBox="0 0 3 3"
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        {/* Top triangle → RED (tokens enter from top via col 7) */}
        <polygon points="0,0 3,0 1.5,1.5" fill={R} />
        {/* Right triangle → GREEN */}
        <polygon points="3,0 3,3 1.5,1.5" fill={G} />
        {/* Bottom triangle → YELLOW */}
        <polygon points="3,3 0,3 1.5,1.5" fill={Y} />
        {/* Left triangle → BLUE */}
        <polygon points="0,3 0,0 1.5,1.5" fill={B} />
        {/* Dividers — hairline separators between triangles */}
        <line x1="0" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.35)" strokeWidth="0.04" />
        <line x1="3" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.35)" strokeWidth="0.04" />
        <line x1="3" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.35)" strokeWidth="0.04" />
        <line x1="0" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.35)" strokeWidth="0.04" />
      </svg>
    </div>
  );
}

const WIN_TOKEN_POSITIONS: Record<LudoColor, Array<{ left: string; top: string }>> = {
  RED: [
    { left: "50%", top: "30%" },
    { left: "42%", top: "38%" },
    { left: "58%", top: "38%" },
    { left: "50%", top: "46%" },
  ],
  GREEN: [
    { left: "70%", top: "50%" },
    { left: "62%", top: "42%" },
    { left: "62%", top: "58%" },
    { left: "54%", top: "50%" },
  ],
  YELLOW: [
    { left: "50%", top: "70%" },
    { left: "42%", top: "62%" },
    { left: "58%", top: "62%" },
    { left: "50%", top: "54%" },
  ],
  BLUE: [
    { left: "30%", top: "50%" },
    { left: "38%", top: "42%" },
    { left: "38%", top: "58%" },
    { left: "46%", top: "50%" },
  ],
};

function CenterWinTokens({
  tokens,
}: {
  tokens: LudoToken[];
}) {
  if (tokens.length === 0) return null;

  const byColor = tokens.reduce<Record<LudoColor, LudoToken[]>>(
    (acc, token) => {
      acc[token.color].push(token);
      return acc;
    },
    { RED: [], GREEN: [], BLUE: [], YELLOW: [] },
  );

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ top: "40%", left: "40%", width: "20%", height: "20%" }}
    >
      {(Object.keys(byColor) as LudoColor[]).flatMap((color) =>
        byColor[color].slice(0, 4).map((token, index) => {
          const pos = WIN_TOKEN_POSITIONS[color][index];
          return (
            <div
              key={token.id}
              className="absolute flex items-center justify-center"
              style={{
                left: pos.left,
                top: pos.top,
                width: "24%",
                height: "24%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <TokenPin token={{ ...token, finished: true, home: false }} fill="100%" />
            </div>
          );
        }),
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LudoBoard — main export
// ─────────────────────────────────────────────────────────────────────────────
export function LudoBoard({
  tokenPositions = new Map(),
  onMoveToken,
  viewerColor,
  opponentColor,
}: LudoBoardProps) {
  const GRID = 15;
  const seatColors = useMemo(
    () => getDisplaySeatColors(viewerColor, opponentColor),
    [viewerColor, opponentColor],
  );
  const centerWinTokens = useMemo(
    () =>
      Array.from(tokenPositions.values())
        .flat()
        .filter((token) => token.finished),
    [tokenPositions],
  );

  const cells = useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, i) => {
        const row = Math.floor(i / GRID);
        const col = i % GRID;
        // The board itself is rendered in viewer-relative colors, so tokens and
        // lane/home ownership stay aligned without a CSS rotation pass.
        const kind = remapKindForView(classify(row, col), seatColors);

        return {
          row,
          col,
          displayKey: `${row}-${col}`,
          kind,
        };
      }),
    [seatColors],
  );
  return (
    <BoardRotationContext.Provider value={0}>
      <div
        data-testid="board"
        className="relative aspect-square w-full select-none overflow-hidden rounded-[18px]"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.78)",
        }}
      >
        {/* ── 15×15 CSS Grid ──────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 z-10 grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID}, minmax(0, 1fr))`,
          }}
        >
          {cells.map(({ row, col, displayKey, kind }) => (
            <BoardCell
              key={`${row}-${col}`}
              kind={kind}
              tokens={tokenPositions.get(displayKey) ?? []}
              onMove={onMoveToken}
            />
          ))}
        </div>

        {/* ── Center triangle overlay ──────────────────────────────────────── */}
        <ClassicCenterOverlay seatColors={seatColors} />
        <ClassicCenterWinTokens tokens={centerWinTokens} seatColors={seatColors} />

        {/* ── Board outer border ───────────────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-30 rounded-[18px] border border-[#9d9d9d]" />

        <style jsx global>{`
          @keyframes ludo-token-hop {
            0% { transform: translateY(10%) scale(0.92); filter: brightness(0.96); }
            45% { transform: translateY(-16%) scale(1.06); filter: brightness(1.05); }
            72% { transform: translateY(-6%) scale(0.985); filter: brightness(1.02); }
            100% { transform: translateY(0) scale(1); filter: brightness(1); }
          }

          @keyframes ludo-available-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }

          @keyframes ludo-available-aura {
            0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.72; }
            50% { transform: translate(-50%, -50%) scale(1.04); opacity: 1; }
          }
        `}</style>
      </div>
    </BoardRotationContext.Provider>
  );
}
