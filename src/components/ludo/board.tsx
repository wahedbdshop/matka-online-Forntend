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
  RED:    { main: "#ef1d26", dark: "#98121a", tint: "#ef1d26" },
  GREEN:  { main: "#08ae4d", dark: "#067039", tint: "#08ae4d" },
  BLUE:   { main: "#2ba8ef", dark: "#175f9a", tint: "#2ba8ef" },
  YELLOW: { main: "#ffd61f", dark: "#b48700", tint: "#ffd61f" },
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
  | { t: "safe" }
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
  if (SAFE_SET.has(key)) return { t: "safe" };

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
  const boardRotation = useContext(BoardRotationContext);
  const hex  = PALETTE[token.color].main;
  const dark = PALETTE[token.color].dark;
  const gid  = token.color.toLowerCase();
  const rotationStyle =
    boardRotation !== 0
      ? {
          transform: `rotate(${-boardRotation}deg)`,
          transformOrigin: "center",
        }
      : undefined;

  const finishedEl = (
    <svg
      viewBox="0 0 40 40"
      style={{
        width: fill,
        height: fill,
        flexShrink: 0,
        ...rotationStyle,
      }}
      className="drop-shadow-[0_0_7px_rgba(250,204,21,0.75)]"
    >
      <circle cx="20" cy="20" r="15" fill={hex} />
      <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <circle cx="20" cy="20" r="11" fill="rgba(255,255,255,0.16)" />
      <path
        d="M20 8.5 22.8 15.6 30.4 16.1 24.5 20.9 26.4 28.3 20 24.2 13.6 28.3 15.5 20.9 9.6 16.1 17.2 15.6 20 8.5Z"
        fill="#facc15"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Teardrop path — arc flag 0,1 = clockwise → upper semicircle via top ✓
  const pinPath = "M20 36 C15 29 9 24 9 16 C9 9.4 13.9 4.5 20 4.5 C26.1 4.5 31 9.4 31 16 C31 24 25 29 20 36 Z";
  // Slightly enlarged dark rim path for depth/outline
  const rimPath = "M20 38.5 C14.2 30.7 6.5 25.6 6.5 16 C6.5 8 12.5 2 20 2 C27.5 2 33.5 8 33.5 16 C33.5 25.6 25.8 30.7 20 38.5 Z";

  const svgEl = token.finished ? finishedEl : (
    <svg
      viewBox="0 0 40 40"
      style={{
        width: fill,
        height: fill,
        flexShrink: 0,
        // Counter-rotate so the pin tip always points downward toward the player
        ...rotationStyle,
      }}
      className={cn(token.available && "drop-shadow-[0_0_10px_rgba(253,224,71,1)]")}
    >
      <defs>
        {/* 3-D radial gradient: bright white top-left → full colour → dark bottom-right */}
        <radialGradient id={`pg-${gid}`} cx="36%" cy="27%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="55%" stopColor="#f8fafc" stopOpacity="1" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`cg-${gid}`} cx="36%" cy="27%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.72" />
          <stop offset="35%" stopColor={hex} stopOpacity="1" />
          <stop offset="100%" stopColor={dark} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Ground shadow at pin tip */}
      <ellipse cx="22" cy="36" rx="8.5" ry="3" fill="rgba(0,0,0,0.28)" />

      {/* Dark outer rim — creates depth and outline */}
      <path d={rimPath} fill="rgba(15,23,42,0.42)" />

      {/* Main coloured body with 3-D gradient */}
      <path d={pinPath} fill={`url(#pg-${gid})`} stroke="rgba(15,23,42,0.28)" strokeWidth="1.2" />

      {/* Ambient shadow on the lower half of the body */}
      <circle cx="20" cy="16" r="11.8" fill={hex} opacity="0.24" />

      {/* White outline stroke — makes pin visible on same-coloured backgrounds */}
      <circle cx="20" cy="16" r="10.2" fill="none" stroke={hex} strokeWidth="2.5" />

      {/* White rim around the circular head */}
      <circle cx="20" cy="16" r="7" fill={`url(#cg-${gid})`} />

      {/* Inner white ring — Ludo King style detail */}
      <ellipse cx="16" cy="11" rx="3.2" ry="2.1" fill="rgba(255,255,255,0.7)" transform="rotate(-22 16 11)" />

      {/* Specular highlight — large soft zone, top-left */}
      <path d="M11 23 C14 28 17 31 20 35 C23 31 26 28 29 23" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2" strokeLinecap="round" />
      {/* Specular core — tiny bright spot */}
      

      {/* Available glow ring */}
      {token.available && (
        <path d={pinPath} fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.98" />
      )}
    </svg>
  );

  const tokenContent = (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{ width: fill, height: fill }}
    >
      {token.available && (
        <>
          <span className="absolute -inset-[18%] rounded-full border-2 border-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.95)]" />
          <span className="absolute -inset-[26%] animate-ping rounded-full border-2 border-yellow-200/80" />
        </>
      )}
      <span className="relative z-10 flex h-full w-full items-center justify-center overflow-visible">
        {svgEl}
      </span>
    </div>
  );

  if (!onMove) {
    return (
      <div
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
      onKeyDown={(e) => e.key === "Enter" && onMove(token.id)}
      className="absolute inset-0 z-20 flex items-center justify-center overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
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
                fill="100%"
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
            fill="100%"
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
          <TokenPin token={first} fill="100%" onMove={first.available ? onMove : undefined} />
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
    return (
      <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible border border-[#b7b7b7] bg-white">
        {!multi && first && (
          <TokenPin token={first} fill="100%" onMove={first.available ? onMove : undefined} />
        )}
        {!first && (
          <svg viewBox="0 0 20 20" className="w-[68%] h-[68%] opacity-70" fill="none" stroke="#777" strokeWidth="1.25">
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
          <TokenPin token={first} fill="100%" onMove={first.available ? onMove : undefined} />
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
        <TokenPin token={first} fill="100%" onMove={first.available ? onMove : undefined} />
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
      { left: "40%", top: "50%", size: "62%" },
      { left: "60%", top: "50%", size: "62%" },
    ],
    3: [
      { left: "50%", top: "38%", size: "58%" },
      { left: "38%", top: "62%", size: "58%" },
      { left: "62%", top: "62%", size: "58%" },
    ],
    4: [
      { left: "39%", top: "39%", size: "52%" },
      { left: "61%", top: "39%", size: "52%" },
      { left: "39%", top: "61%", size: "52%" },
      { left: "61%", top: "61%", size: "52%" },
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
            className="absolute flex items-center justify-center overflow-visible"
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
  const shellDark = "rgba(71,85,105,0.9)";
  const rotationStyle =
    boardRotation !== 0
      ? {
          transform: `rotate(${-boardRotation}deg)`,
          transformOrigin: "center",
        }
      : undefined;

  const finishedEl = (
    <svg
      viewBox="0 0 40 40"
      style={{ width: fill, height: fill, flexShrink: 0, ...rotationStyle }}
      className="drop-shadow-[0_0_7px_rgba(250,204,21,0.75)]"
    >
      <circle cx="20" cy="20" r="15" fill="#ffffff" stroke={shellDark} strokeWidth="1.4" />
      <circle cx="20" cy="20" r="11.5" fill={hex} opacity="0.16" />
      <path
        d="M20 8.5 22.8 15.6 30.4 16.1 24.5 20.9 26.4 28.3 20 24.2 13.6 28.3 15.5 20.9 9.6 16.1 17.2 15.6 20 8.5Z"
        fill="#facc15"
        stroke="rgba(146,64,14,0.7)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );

  const pinPath =
    "M20 37 C16.1 32 10 26.1 10 17.5 C10 10.1 14.5 5 20 5 C25.5 5 30 10.1 30 17.5 C30 26.1 23.9 32 20 37 Z";
  const innerPinPath =
    "M20 34.4 C17.1 30.5 13 25.6 13 18.1 C13 12.2 16.2 8.6 20 8.6 C23.8 8.6 27 12.2 27 18.1 C27 25.6 22.9 30.5 20 34.4 Z";

  const svgEl = token.finished ? (
    finishedEl
  ) : (
    <svg
      viewBox="0 0 40 40"
      style={{ width: fill, height: fill, flexShrink: 0, ...rotationStyle }}
      className={cn(token.available && "drop-shadow-[0_0_10px_rgba(253,224,71,1)]")}
    >
      <defs>
        <radialGradient id={`shell-${gid}`} cx="35%" cy="24%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cfd8e3" />
        </radialGradient>
        <radialGradient id={`core-${gid}`} cx="35%" cy="26%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="22%" stopColor={hex} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
      </defs>

      <ellipse cx="20.3" cy="36.6" rx="7.8" ry="2.4" fill="rgba(15,23,42,0.18)" />
      <path d={pinPath} fill={`url(#shell-${gid})`} stroke={shellDark} strokeWidth="1.45" />
      <path d={innerPinPath} fill="rgba(255,255,255,0.86)" />
      <circle cx="20" cy="17.4" r="8.2" fill="white" stroke="rgba(148,163,184,0.78)" strokeWidth="0.95" />
      <circle cx="20" cy="17.4" r="6.75" fill={`url(#core-${gid})`} stroke={dark} strokeWidth="1.1" />
      <ellipse cx="17.1" cy="13.1" rx="3.2" ry="1.95" fill="rgba(255,255,255,0.62)" transform="rotate(-22 17.1 13.1)" />
      <path d="M16 29.6 C17.5 31.6 18.7 33 20 34.7 C21.3 33 22.5 31.6 24 29.6" fill="none" stroke="rgba(255,255,255,0.84)" strokeWidth="1.15" strokeLinecap="round" />
      <ellipse cx="20" cy="31.4" rx="3.5" ry="1.1" fill="rgba(51,65,85,0.26)" />
      {token.available && (
        <path d={pinPath} fill="none" stroke="#fbbf24" strokeWidth="2.6" opacity="0.98" />
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
                  background: `radial-gradient(ellipse at center, ${hex}66 0%, ${hex}22 72%, transparent 100%)`,
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
        className="relative z-10 flex h-full w-full items-center justify-center overflow-visible"
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
      className="absolute inset-0 z-20 flex items-center justify-center overflow-visible focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
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
      className="pointer-events-none h-[74%] w-[74%]"
      fill="none"
      stroke={color}
      strokeWidth="2.35"
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
    <div className="relative flex h-[80%] w-[80%] items-center justify-center overflow-visible">
      <ClassicTokenPin
        token={token}
        fill="100%"
        onMove={token.available ? onMove : undefined}
      />
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
  const boardLine = "#a8a8a8";
  const trackCellClassName =
    "relative z-20 flex aspect-square items-center justify-center overflow-visible border bg-white";
  const premiumWhiteCellStyle = {
    borderColor: boardLine,
    background: "linear-gradient(180deg, #ffffff 0%, #fbfbfb 55%, #ececec 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(0,0,0,0.08), inset 1px 0 0 rgba(255,255,255,0.7), inset -1px 0 0 rgba(0,0,0,0.04)",
  };
  const premiumColoredCellStyle = (color: string) => ({
    borderColor: boardLine,
    backgroundColor: color,
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.08) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.1), inset 1px 0 0 rgba(255,255,255,0.14), inset -1px 0 0 rgba(0,0,0,0.04)",
  });

  if (kind.t === "home-outer") {
    return <div className="aspect-square" style={{ backgroundColor: PALETTE[kind.color].main }} />;
  }

  if (kind.t === "home-inner") {
    return <div className="aspect-square bg-white" />;
  }

  if (kind.t === "home-circle") {
    const hex = PALETTE[kind.color].main;

    return (
      <div className="relative z-20 flex aspect-square items-center justify-center overflow-visible bg-white p-[10%]">
        <div
          className="relative z-10 flex h-full w-full items-center justify-center overflow-visible rounded-full"
          style={{
            background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 18%, ${hex} 20%, ${hex} 74%, ${darkenHex(hex, 0.18)} 100%)`,
            boxShadow: "0 1px 3px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.28)",
          }}
        >
          {first && (
            <div className="absolute -inset-[70%] z-20 overflow-visible">
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
    return <div className="aspect-square bg-transparent" />;
  }

  if (kind.t === "run-up" || kind.t === "start") {
    return (
      <div
        className={trackCellClassName}
        style={premiumColoredCellStyle(PALETTE[kind.color].tint)}
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
    return (
      <div className={trackCellClassName} style={premiumWhiteCellStyle}>
        {!multi && first && <TrackTokenSlot token={first} onMove={onMove} />}
        {!first && (
          <svg viewBox="0 0 20 20" className="h-[78%] w-[78%] opacity-85" fill="none" stroke="#7a7a7a" strokeWidth="1.35">
            <polygon points="10,2 12.4,7.8 18.5,8.5 14,12.8 15.3,19 10,15.8 4.7,19 6,12.8 1.5,8.5 7.6,7.8" />
          </svg>
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  if (kind.t === "direction") {
    return (
      <div className={trackCellClassName} style={premiumWhiteCellStyle}>
        {!multi && first && <TrackTokenSlot token={first} onMove={onMove} />}
        {!first && (
          <DirectionArrowIcon direction={kind.arrow} color={PALETTE[kind.color].main} />
        )}
        {multi && <MultiTokens tokens={tokens} onMove={onMove} />}
      </div>
    );
  }

  return (
    <div className={trackCellClassName} style={premiumWhiteCellStyle}>
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
        <line x1="0" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.42)" strokeWidth="0.04" />
        <line x1="3" y1="0" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.42)" strokeWidth="0.04" />
        <line x1="3" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.42)" strokeWidth="0.04" />
        <line x1="0" y1="3" x2="1.5" y2="1.5" stroke="rgba(255,255,255,.42)" strokeWidth="0.04" />
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
        className="relative w-full aspect-square select-none"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.78)",
        }}
      >
        {/* ── 15×15 CSS Grid ──────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 z-10 grid"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
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
        <div className="pointer-events-none absolute inset-0 z-30 border-[2px] border-[#8a8a8a]" />

        <style jsx global>{`
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
