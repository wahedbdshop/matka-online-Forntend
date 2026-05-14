"use client";

import { cn } from "@/lib/utils";
import type { LudoRoomPlayer } from "@/services/ludo.service";

export const COLOR_HEX: Record<string, string> = {
  RED: "#ef1d26",
  GREEN: "#08ae4d",
  BLUE: "#2ba8ef",
  YELLOW: "#ffd61f",
};

export function DiceSVG({
  value,
  size = 56,
  tint = "#39b5ff",
}: {
  value?: number | null;
  size?: number;
  tint?: string;
}) {
  const dots: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  };
  const safeValue = typeof value === "number" && value in dots ? value : 1;
  const pts = dots[safeValue];
  const diceId =
    `${safeValue}-${tint.replace(/[^a-z0-9]/gi, "").toLowerCase() || "dice"}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={`dice-body-${diceId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="18%" stopColor={tint} stopOpacity="0.98" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id={`dice-gloss-${diceId}`} cx="30%" cy="24%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="52" cy="90" rx="28" ry="8" fill="rgba(8,15,37,0.18)" />
      <rect x={8} y={12} width={84} height={82} rx={23} fill="rgba(7,12,30,0.2)" />
      <rect
        x={5}
        y={5}
        width={84}
        height={84}
        rx={23}
        fill={`url(#dice-body-${diceId})`}
        stroke="rgba(255,255,255,0.42)"
        strokeWidth="2.4"
      />
      <rect x={5} y={5} width={84} height={84} rx={23} fill={`url(#dice-gloss-${diceId})`} />
      <path
        d="M18 20 C28 11, 52 8, 70 16"
        fill="none"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {pts.map(([cx, cy], index) => (
        <g key={index}>
          <circle cx={cx} cy={cy + 1.8} r={8.5} fill="rgba(5,10,24,0.16)" />
          <circle cx={cx} cy={cy} r={8.2} fill="#f8fafc" />
          <circle cx={cx - 1.6} cy={cy - 1.8} r={2.1} fill="rgba(255,255,255,0.52)" />
        </g>
      ))}
    </svg>
  );
}

export function AutoMoveDots({ count = 0 }: { count?: number }) {
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

export function getPlayerLabel(
  player?: LudoRoomPlayer | null,
  fallback = "Player",
) {
  return player?.username?.trim() || player?.name?.trim() || fallback;
}

export function getPlayerSubLabel(
  player?: LudoRoomPlayer | null,
  fallback = "Player",
) {
  return player?.name?.trim() || player?.username?.trim() || fallback;
}

function getPlayerInitials(player?: LudoRoomPlayer | null, fallback = "P") {
  const source = player?.name?.trim() || player?.username?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function PlayerAvatarBadge({
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
          style={{
            borderColor: danger
              ? "rgba(255,91,87,0.85)"
              : "rgba(255,240,168,0.8)",
          }}
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
