"use client";

/**
 * Pixel-perfect 15×15 Ludo board.
 *
 * Grid layout (0-indexed):
 *   Rows 0-5 , cols 0-5  → RED home    (top-left)
 *   Rows 0-5 , cols 9-14 → GREEN home  (top-right)
 *   Rows 9-14, cols 0-5  → BLUE home   (bottom-left)
 *   Rows 9-14, cols 9-14 → YELLOW home (bottom-right)
 *   Cols 6-8 (all rows)  → vertical path arm
 *   Rows 6-8 (all cols)  → horizontal path arm
 *   Rows 6-8, cols 6-8   → center (3×3)
 *
 * All positions satisfy: mirror(r,c) = (14-r, 14-c) for 4-fold symmetry.
 */

import { useMemo } from "react";
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
};

export type LudoBoardProps = {
  /** Map keyed by "row-col" (e.g. "6-1") → tokens on that cell. */
  tokenPositions?: Map<string, LudoToken[]>;
  onMoveToken?: (tokenId: string) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Color palette
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
  RED:    { main: "#e8192c", dark: "#8a000f", tint: "#ffe3e5" },
  GREEN:  { main: "#00a650", dark: "#005c2a", tint: "#d4f5e2" },
  BLUE:   { main: "#3DB8D8", dark: "#1a6e82", tint: "#d0f0f8" },
  YELLOW: { main: "#C8A200", dark: "#705a00", tint: "#fff0c0" },
} satisfies Record<LudoColor, { main: string; dark: string; tint: string }>;

// ─────────────────────────────────────────────────────────────────────────────
// Mathematical layout
// ─────────────────────────────────────────────────────────────────────────────

// Home inner white zone bounds [r1, r2, c1, c2] (inclusive).
// All four are derived from RED = [1,4,1,4] by applying (r→14-r) and/or (c→14-c).
const HOME_INNER_BOUNDS: Record<LudoColor, readonly [number, number, number, number]> = {
  RED:    [1,  4,  1,  4],
  GREEN:  [1,  4,  10, 13],  // c → 14-c: 1→13, 4→10
  BLUE:   [10, 13, 1,  4],   // r → 14-r: 1→13, 4→10
  YELLOW: [10, 13, 10, 13],  // both
};

/**
 * Home-circle positions.
 * RED base: (1,1),(1,3),(3,1),(3,3)
 * GREEN:  c → 14-c  → (1,13),(1,11),(3,13),(3,11)
 * BLUE:   r → 14-r  → (13,1),(13,3),(11,1),(11,3)
 * YELLOW: both      → (13,13),(13,11),(11,13),(11,11)
 */
const HOME_CIRCLE_MAP = new Map<string, LudoColor>([
  // RED
  ["1-1", "RED"],  ["1-3", "RED"],  ["3-1", "RED"],  ["3-3", "RED"],
  // GREEN  (c → 14-c)
  ["1-11","GREEN"],["1-13","GREEN"],["3-11","GREEN"],["3-13","GREEN"],
  // BLUE   (r → 14-r)
  ["11-1","BLUE"], ["11-3","BLUE"], ["13-1","BLUE"], ["13-3","BLUE"],
  // YELLOW (r → 14-r, c → 14-c)
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
 *   RED    → col 7, rows 1-5   (enters center from top)
 *   YELLOW → col 7, rows 9-13  (enters center from bottom) ← mirror RED
 *   BLUE   → row 7, cols 1-5   (enters center from left)
 *   GREEN  → row 7, cols 9-13  (enters center from right)  ← mirror BLUE
 */
const RUN_UP_MAP = ((): Map<string, LudoColor> => {
  const m = new Map<string, LudoColor>();
  for (let r = 1; r <= 5;  r++) m.set(`${r}-7`, "RED");
  for (let r = 9; r <= 13; r++) m.set(`${r}-7`, "YELLOW");
  for (let c = 1; c <= 5;  c++) m.set(`7-${c}`, "BLUE");
  for (let c = 9; c <= 13; c++) m.set(`7-${c}`, "GREEN");
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
  ["0-7",  { arrow: "↓", color: "GREEN" }],
  ["6-0",  { arrow: "→", color: "RED" }],
  ["8-14", { arrow: "←", color: "YELLOW" }],
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
  if (dir) return { t: "direction", color: dir.color, arrow: dir.arrow };

  // ── Regular path ─────────────────────────────────────────────────────────
  return { t: "path" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token pin (SVG, Ludo-King style)
//
// Interactive tokens: button covers the full parent (absolute inset-0) so the
// entire cell is tappable on mobile; the SVG is centred at `fill` size inside.
// Non-interactive tokens: simple centred div at `fill` size.
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
  const hex  = PALETTE[token.color].main;
  const dark = PALETTE[token.color].dark;
  const gid  = token.color.toLowerCase(); // unique per color, safe as SVG id prefix

  const svgEl = (
    <svg
      viewBox="0 0 40 60"
      style={{ width: fill, height: fill, flexShrink: 0 }}
      className={cn(
        token.available &&
          "drop-shadow-[0_0_8px_rgba(253,224,71,1)] animate-bounce",
      )}
    >
      <defs>
        {/* Sphere gradient — light from top-left → dark bottom-right */}
        <radialGradient id={`sp-${gid}`} cx="30%" cy="25%" r="75%">
          <stop offset="0%"   stopColor="white"   stopOpacity="0.65" />
          <stop offset="35%"  stopColor={hex}     stopOpacity="1" />
          <stop offset="100%" stopColor={dark}    stopOpacity="1" />
        </radialGradient>
        {/* Neck gradient — dark left, light right */}
        <linearGradient id={`nk-${gid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={dark} />
          <stop offset="40%"  stopColor={hex} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="20" cy="58" rx="10" ry="3" fill="rgba(0,0,0,.40)" />

      {/* ── Neck / stem ── */}
      <path d="M15,35 Q13,47 12,57 L20,53 L28,57 Q27,47 25,35 Z"
            fill={`url(#nk-${gid})`} />
      {/* Neck left-edge highlight */}
      <path d="M16,36 Q15,46 15,54 L20,52 Z"
            fill="rgba(255,255,255,.22)" />

      {/* ── Head — dark rim (gives depth) ── */}
      <circle cx="20" cy="19" r="19" fill={dark} />

      {/* ── Head — main sphere with 3-D radial gradient ── */}
      <circle cx="20" cy="19" r="17" fill={`url(#sp-${gid})`} />

      {/* Bottom ambient shadow on sphere */}
      <ellipse cx="22" cy="28" rx="13" ry="8"
               fill="rgba(0,0,0,.18)" />

      {/* White rim (separates head from rim) */}
      <circle cx="20" cy="19" r="17"
              fill="none" stroke="rgba(255,255,255,.70)" strokeWidth="1.8" />

      {/* ── Specular highlight — large soft zone ── */}
      <ellipse cx="13" cy="11" rx="7" ry="5"
               fill="rgba(255,255,255,.55)"
               transform="rotate(-20,13,11)" />
      {/* Specular core — tiny bright spot */}
      <ellipse cx="11" cy="9"  rx="3" ry="2"
               fill="white" opacity="0.92"
               transform="rotate(-20,11,9)" />

      {/* ── Inner circle (Ludo King style dot) ── */}
      <circle cx="20" cy="19" r="5.5" fill="rgba(255,255,255,.30)" />

      {/* Available glow ring */}
      {token.available && (
        <circle cx="20" cy="19" r="19"
                fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.95" />
      )}
    </svg>
  );

  if (!onMove) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: fill, height: fill }}
      >
        {svgEl}
      </div>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={() => onMove(token.id)}
      onKeyDown={(e) => e.key === "Enter" && onMove(token.id)}
      className="absolute inset-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    >
      {svgEl}
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
    return <div className="aspect-square bg-white" />;
  }

  // ── HOME CIRCLE — token starting position ─────────────────────────────────
  if (kind.t === "home-circle") {
    const hex = PALETTE[kind.color].main;
    return (
      <div className="aspect-square bg-white flex items-center justify-center p-[5%]">
        {/* Decorative circle — shows under token if occupied */}
        <div
          className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: `radial-gradient(circle at 36% 30%, ${hex}cc, ${hex})`,
            boxShadow: `inset 0 3px 8px rgba(0,0,0,.28), 0 0 0 3px white, 0 0 0 4px ${hex}55`,
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
            <div className="absolute inset-[1%]">
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
        className="aspect-square border border-[#c8c8c8] flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: PALETTE[kind.color].tint }}
      >
        {!multi && first ? (
          <TokenPin
            token={first}
            fill="100%"
            onMove={first.available ? onMove : undefined}
          />
        ) : (
          /* Subtle lane dot when empty */
          <span
            className="rounded-full opacity-30"
            style={{
              width: "24%", height: "24%",
              backgroundColor: PALETTE[kind.color].main,
            }}
          />
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
        className="aspect-square border border-[#c8c8c8] flex items-center justify-center relative overflow-hidden bg-white"
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
      <div className="aspect-square border border-[#c8c8c8] bg-white flex items-center justify-center relative overflow-hidden">
        {!multi && first && (
          <TokenPin token={first} fill="100%" onMove={first.available ? onMove : undefined} />
        )}
        {!first && (
          <svg viewBox="0 0 20 20" className="w-[55%] h-[55%] opacity-40" fill="none" stroke="#666" strokeWidth="1.4">
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
      <div className="aspect-square border border-[#c8c8c8] bg-white flex items-center justify-center relative overflow-hidden">
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
    <div className="aspect-square border border-[#c8c8c8] bg-white flex items-center justify-center relative overflow-hidden">
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
  return (
    <div className="absolute inset-[4%] grid grid-cols-2 grid-rows-2 gap-px">
      {tokens.slice(0, 4).map((t) => (
        // relative + overflow-hidden makes each sub-cell a positioning context
        // so the button's absolute inset-0 stays within its own quadrant.
        <div key={t.id} className="relative overflow-hidden flex items-center justify-center">
          <TokenPin
            token={t}
            fill="100%"
            onMove={t.available ? onMove : undefined}
          />
        </div>
      ))}
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
        {/* White center circle */}
        <circle cx="1.5" cy="1.5" r="0.52" fill="white" />
        {/* Subtle shine on center circle */}
        <ellipse cx="1.28" cy="1.28" rx="0.18" ry="0.12" fill="rgba(255,255,255,.55)" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LudoBoard — main export
// ─────────────────────────────────────────────────────────────────────────────
export function LudoBoard({
  tokenPositions = new Map(),
  onMoveToken,
}: LudoBoardProps) {
  const GRID = 15;

  // Pre-compute all 225 cell classifications once (never changes).
  const cells = useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, i) => {
        const row = Math.floor(i / GRID);
        const col = i % GRID;
        return { row, col, kind: classify(row, col) };
      }),
    [],
  );

  return (
    <div className="relative w-full aspect-square select-none">
      {/* ── 15×15 CSS Grid ──────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
      >
        {cells.map(({ row, col, kind }) => (
          <Cell
            key={`${row}-${col}`}
            kind={kind}
            tokens={tokenPositions.get(`${row}-${col}`) ?? []}
            onMove={onMoveToken}
          />
        ))}
      </div>

      {/* ── Center triangle overlay ──────────────────────────────────────── */}
      <CenterOverlay />

      {/* ── Board outer border ───────────────────────────────────────────── */}
      <div className="absolute inset-0 border-2 border-[#888] pointer-events-none" />
    </div>
  );
}
