"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Menu,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CoinTossService,
  type CoinTossLeaderboardPlayer,
  type CoinTossLobby,
  type CoinTossOutcome,
  type CoinTossRoadmapCell,
} from "@/services/coin-toss.service";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";

const maxRoadmapRows = 4;
const presenceStorageKey = "coin_toss_presence_session_id";
const resultRevealMs = 2400;

type PlacedBetState = {
  id: string;
  roundId: string;
  outcome: CoinTossOutcome;
  stake: number;
};

const liveChipPositions = [
  { left: "10%", top: "18%" },
  { left: "24%", top: "10%" },
  { left: "39%", top: "22%" },
  { left: "55%", top: "12%" },
  { left: "69%", top: "24%" },
  { left: "18%", top: "32%" },
  { left: "47%", top: "34%" },
  { left: "77%", top: "16%" },
];

const formatAmount = (value: number | string) =>
  Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const buildChipOptions = (minBet: number, maxBet: number) => {
  const min = Math.max(1, Math.floor(minBet || 5));
  const max = Math.max(min, Math.floor(maxBet || 100));
  const preferred = [5, 10, 20, 30, 60, 90, 100, 200, 500, 1000];
  const options = preferred.filter((amount) => amount >= min && amount <= max);

  if (!options.includes(min)) {
    options.unshift(min);
  }

  if (options.length < 6 && !options.includes(max)) {
    options.push(max);
  }

  if (options.length < 6) {
    const step = Math.max(1, Math.floor((max - min) / 5));
    for (let amount = min; options.length < 6 && amount <= max; amount += step) {
      if (!options.includes(amount)) {
        options.push(amount);
      }
    }
  }

  return Array.from(new Set(options))
    .sort((left, right) => left - right)
    .slice(0, 6);
};

const getSecondsLeft = (locksAt?: string) => {
  if (!locksAt) return 0;
  return Math.max(0, Math.ceil((new Date(locksAt).getTime() - Date.now()) / 1000));
};

const getMaskedName = (value?: string | null) => {
  const normalized = value?.trim() || "player";
  if (normalized.length <= 10) return normalized;
  return `${normalized.slice(0, 10)}...`;
};

const getPresenceSessionId = () => {
  const existing = window.localStorage.getItem(presenceStorageKey);
  if (existing) return existing;

  const generated =
    window.crypto?.randomUUID?.() ??
    `coin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(presenceStorageKey, generated);
  return generated;
};

function PlayerRail({
  title,
  players,
}: {
  title: string;
  players: CoinTossLeaderboardPlayer[];
}) {
  return (
    <div className="flex w-[52px] shrink-0 flex-col items-center gap-1 sm:w-[72px]">
      <div className="text-center text-[10px] font-black uppercase leading-3 text-[#ffe77a] [writing-mode:vertical-rl]">
        {title}
      </div>
      {players.slice(0, 3).map((player, index) => (
        <div key={player.name} className="relative">
          <div className="h-10 w-10 overflow-hidden rounded-lg border-2 border-[#f0bf38] bg-gradient-to-br from-amber-300 to-rose-500 shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:h-12 sm:w-12">
            {player.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image}
                alt={player.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-end justify-center rounded-md bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.65),transparent_28%)] pb-1 text-lg font-black text-white">
                {(player.name || player.username || "U")[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 w-12 -translate-x-1/2 rounded-sm bg-[#0d332a] px-1 text-center text-[8px] font-bold text-white sm:w-14 sm:text-[9px]">
            {getMaskedName(player.username || player.name)}
          </div>
          <div className="absolute -right-1 -top-1 rounded-sm bg-[#111827] px-1 text-[9px] font-black text-[#f0bf38]">
            No.{index + 1}
          </div>
          <div className="absolute -left-1 top-7 rounded-sm bg-[#f0bf38] px-1 text-[7px] font-black text-[#3f2614] sm:top-8 sm:text-[8px]">
            {formatAmount(player.amount)}
          </div>
        </div>
      ))}
      {players.length === 0 ? (
        <div className="mt-2 rounded-md border border-[#f0bf38]/40 bg-black/20 px-2 py-3 text-center text-[9px] font-black text-[#ffe77a]">
          0
        </div>
      ) : null}
    </div>
  );
}

function CoinScene({
  outcome,
  phase,
}: {
  outcome?: CoinTossOutcome | null;
  phase: "idle" | "cover" | "reveal";
}) {
  const isReveal = phase === "reveal" && outcome;
  const label = isReveal ? (outcome === "TAIL" ? "T" : "H") : "?";
  const title = isReveal ? outcome : phase === "cover" ? "LOCKED" : "READY";

  return (
    <div className="relative flex h-28 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#5c8d70] bg-[linear-gradient(135deg,#286653,#79b28d)] sm:h-40">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.06)_75%,transparent_75%)] bg-[length:34px_34px]" />
      <div className="absolute top-2 rounded-full bg-black/28 px-2.5 py-1 text-[9px] font-black tracking-[0.18em] text-[#ffe77a] sm:px-3 sm:text-[10px]">
        {title}
      </div>

      <div
        className={`absolute z-20 h-20 w-28 rounded-[40px_40px_32px_32px] bg-[#f5d2bd] shadow-[0_10px_22px_rgba(55,31,13,0.22)] transition-transform duration-700 ease-out sm:h-24 sm:w-36 sm:rounded-[48px_48px_38px_38px] ${
          phase === "reveal"
            ? "-translate-x-14 -translate-y-6 -rotate-[18deg] sm:-translate-x-20 sm:-translate-y-8"
            : "-translate-x-7 translate-y-2 rotate-[8deg] sm:-translate-x-10"
        }`}
      >
        <span className="absolute bottom-2 left-4 h-7 w-4 rounded-full bg-[#f9dccd] sm:left-5 sm:h-9 sm:w-5" />
        <span className="absolute bottom-1 left-9 h-9 w-4 rounded-full bg-[#f9dccd] sm:left-11 sm:h-11 sm:w-5" />
        <span className="absolute bottom-2 left-[56px] h-8 w-4 rounded-full bg-[#f9dccd] sm:left-[70px] sm:h-10 sm:w-5" />
        <span className="absolute bottom-3 left-[77px] h-6 w-4 rounded-full bg-[#f9dccd] sm:left-[98px] sm:h-8 sm:w-5" />
      </div>

      <div
        className={`absolute z-30 h-20 w-28 rounded-[40px_40px_32px_32px] bg-[#f2c7b0] shadow-[0_10px_22px_rgba(55,31,13,0.24)] transition-transform duration-700 ease-out sm:h-24 sm:w-36 sm:rounded-[48px_48px_38px_38px] ${
          phase === "reveal"
            ? "translate-x-14 -translate-y-6 rotate-[18deg] sm:translate-x-20 sm:-translate-y-8"
            : "translate-x-7 translate-y-2 -rotate-[8deg] sm:translate-x-10"
        }`}
      >
        <span className="absolute bottom-2 right-4 h-7 w-4 rounded-full bg-[#f8d7c5] sm:right-5 sm:h-9 sm:w-5" />
        <span className="absolute bottom-1 right-9 h-9 w-4 rounded-full bg-[#f8d7c5] sm:right-11 sm:h-11 sm:w-5" />
        <span className="absolute bottom-2 right-[56px] h-8 w-4 rounded-full bg-[#f8d7c5] sm:right-[70px] sm:h-10 sm:w-5" />
        <span className="absolute bottom-3 right-[77px] h-6 w-4 rounded-full bg-[#f8d7c5] sm:right-[98px] sm:h-8 sm:w-5" />
      </div>

      <div
        className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[#8b4d16] bg-[radial-gradient(circle_at_35%_28%,#fff2a8_0%,#f0bf38_42%,#b86b13_100%)] shadow-[0_12px_18px_rgba(15,23,42,0.35)] transition-all duration-500 sm:h-24 sm:w-24 sm:border-[6px] ${
          phase === "cover" ? "scale-90 opacity-80" : "scale-100 opacity-100"
        } ${phase === "reveal" ? "animate-[coin-pop_650ms_ease-out]" : ""}`}
      >
        <span className="text-3xl font-black text-[#7c2d12] sm:text-4xl">
          {label}
        </span>
      </div>

      <style jsx>{`
        @keyframes coin-pop {
          0% {
            transform: scale(0.88) rotateY(0deg);
          }
          55% {
            transform: scale(1.14) rotateY(180deg);
          }
          100% {
            transform: scale(1) rotateY(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function Lightning({
  hue = 48,
  xOffset = 0,
  speed = 1,
  intensity = 1,
  size = 1,
}: {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      window.removeEventListener("resize", resizeCanvas);
      return undefined;
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;

      #define OCTAVE_COUNT 10

      vec3 hsv2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
      }

      float hash11(float p) {
        p = fract(p * .1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      mat2 rotate2d(float theta) {
        float c = cos(theta);
        float s = sin(theta);
        return mat2(c, -s, s, c);
      }

      float noise(vec2 p) {
        vec2 ip = floor(p);
        vec2 fp = fract(p);
        float a = hash12(ip);
        float b = hash12(ip + vec2(1.0, 0.0));
        float c = hash12(ip + vec2(0.0, 1.0));
        float d = hash12(ip + vec2(1.0, 1.0));
        vec2 t = smoothstep(0.0, 1.0, fp);
        return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < OCTAVE_COUNT; ++i) {
          value += amplitude * noise(p);
          p *= rotate2d(0.45);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord / iResolution.xy;
        uv = 2.0 * uv - 1.0;
        uv.x *= iResolution.x / iResolution.y;
        uv.x += uXOffset;
        uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
        float dist = abs(uv.x);
        vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.9));
        vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
        float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
        fragColor = vec4(col, a);
      }

      void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      window.removeEventListener("resize", resizeCanvas);
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      window.removeEventListener("resize", resizeCanvas);
      return undefined;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      window.removeEventListener("resize", resizeCanvas);
      return undefined;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const uHueLocation = gl.getUniformLocation(program, "uHue");
    const uXOffsetLocation = gl.getUniformLocation(program, "uXOffset");
    const uSpeedLocation = gl.getUniformLocation(program, "uSpeed");
    const uIntensityLocation = gl.getUniformLocation(program, "uIntensity");
    const uSizeLocation = gl.getUniformLocation(program, "uSize");

    const startTime = performance.now();
    let frameId = 0;
    const render = () => {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(iTimeLocation, (performance.now() - startTime) / 1000);
      gl.uniform1f(uHueLocation, hue);
      gl.uniform1f(uXOffsetLocation, xOffset);
      gl.uniform1f(uSpeedLocation, speed);
      gl.uniform1f(uIntensityLocation, intensity);
      gl.uniform1f(uSizeLocation, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [hue, intensity, size, speed, xOffset]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

function BetPanel({
  outcome,
  selected,
  onSelect,
  disabled,
  overlayMessage,
  payoutMultiplier,
  stake,
  liveBetCount,
  liveStakeTotal,
  winningOutcome,
  isReveal,
  showWinPayout,
  powerMultiplier,
}: {
  outcome: CoinTossOutcome;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  overlayMessage?: string | null;
  payoutMultiplier: string;
  stake: number;
  liveBetCount: number;
  liveStakeTotal: string;
  winningOutcome?: CoinTossOutcome | null;
  isReveal: boolean;
  showWinPayout: boolean;
  powerMultiplier?: string | null;
}) {
  const isHead = outcome === "HEAD";
  const isWinner = isReveal && winningOutcome === outcome;
  const isLoser = isReveal && winningOutcome !== outcome;
  const hasPower = Boolean(powerMultiplier);
  const showPowerLight = hasPower && !isReveal;
  const powerLevel = Math.max(0, Math.floor(Number(powerMultiplier) || 0));
  const sparkCount = powerLevel >= 4 ? 8 : powerLevel >= 2 ? 5 : 0;
  const powerAnimationMs = Math.max(1800, (powerLevel + 1) * 650);
  const visibleChipCount = Math.min(liveBetCount, liveChipPositions.length);
  const overflowChipCount = Math.max(0, liveBetCount - visibleChipCount);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`relative min-h-[142px] overflow-hidden rounded-lg border-2 text-left shadow-[0_8px_12px_rgba(67,36,14,0.25)] transition active:scale-[0.99] sm:min-h-[190px] ${
        isWinner
          ? "border-[#fef08a] bg-[#fff2bd] shadow-[0_0_0_4px_rgba(250,204,21,0.35),0_0_28px_rgba(250,204,21,0.6)]"
          : showPowerLight
          ? "border-[#fff176] bg-[#ffe9a8] shadow-[0_0_0_4px_rgba(250,204,21,0.20),0_0_24px_rgba(250,204,21,0.55),inset_0_0_32px_rgba(255,241,118,0.35)]"
          : selected
          ? "border-[#f7d154] bg-[#f8e4bd]"
          : "border-[#6b3f1c] bg-[#d8b487]"
      } ${isLoser ? "opacity-55" : ""} ${disabled ? "cursor-not-allowed" : ""}`}
    >
      {overlayMessage ? (
        <div className="absolute inset-x-2 top-2 z-30 rounded-md bg-[linear-gradient(180deg,#b91c1c,#7f1d1d)] px-2 py-1 text-center text-[10px] font-black text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] sm:text-xs">
          {overlayMessage}
        </div>
      ) : null}
      {showPowerLight ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 opacity-90 mix-blend-screen">
            <Lightning
              hue={powerLevel >= 4 ? 52 : 190}
              xOffset={isHead ? -0.22 : 0.22}
              speed={1.35}
              intensity={powerLevel >= 4 ? 1.25 : 0.95}
              size={1.15}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,210,0.86)_0%,rgba(250,204,21,0.38)_24%,rgba(250,204,21,0.16)_52%,transparent_78%)]"
            style={{
              animation: `power-card-light ${powerAnimationMs}ms ease-in-out forwards`,
            }}
          />
          <div
            className="pointer-events-none absolute -inset-x-12 top-0 z-10 h-full -rotate-12 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.0)_22%,rgba(255,255,255,0.86)_48%,rgba(255,255,255,0.0)_76%,transparent_100%)] blur-[1px]"
            style={{
              animation: `power-sweep ${powerAnimationMs}ms ease-in-out forwards`,
            }}
          />
          {Array.from({ length: sparkCount }, (_, index) => (
            <span
              key={index}
              className="pointer-events-none absolute z-20 h-[3px] w-12 origin-left rounded-full bg-[#fff7ad] shadow-[0_0_10px_#facc15,0_0_18px_#f59e0b]"
              style={{
                right: `${12 + (index % 4) * 18}px`,
                bottom: `${22 + Math.floor(index / 4) * 30}px`,
                transform: `rotate(${-35 + index * 14}deg)`,
                animation: `power-spark 520ms ease-in-out ${index * 90}ms ${Math.max(3, powerLevel + 1)}`,
              }}
            />
          ))}
        </>
      ) : null}
      {isWinner ? (
        <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-[#fff7ad] bg-[linear-gradient(180deg,#22c55e,#15803d)] px-3 py-1 text-xs font-black text-white shadow-[0_4px_12px_rgba(21,128,61,0.45)] sm:px-4 sm:text-sm">
          WIN
        </div>
      ) : null}
      <div
        className={`flex h-10 items-center justify-center text-xl font-black text-[#f5e1bc] sm:h-16 sm:text-3xl ${
          isHead ? "bg-[#bb7a34]" : "bg-[#829554]"
        }`}
      >
        {outcome}
      </div>
      <div className="flex h-[96px] flex-col items-center justify-center bg-[#d8b487] sm:h-[126px]">
        {visibleChipCount > 0 ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-8 top-12 z-10 sm:inset-x-5 sm:bottom-10 sm:top-16">
            {liveChipPositions.slice(0, visibleChipCount).map((position, index) => (
              <div
                key={`${outcome}-live-chip-${index}`}
                className="absolute flex h-6 min-w-6 items-center justify-center rounded-full border-[3px] border-slate-200 bg-white px-1 text-[7px] font-black text-slate-500 shadow-[0_3px_8px_rgba(0,0,0,0.28)] sm:h-7 sm:min-w-7 sm:text-[8px]"
                style={position}
              >
                {index === 0 ? formatAmount(liveStakeTotal) : liveBetCount}
              </div>
            ))}
            {overflowChipCount > 0 ? (
              <div className="absolute right-[8%] top-[18%] flex h-6 min-w-6 items-center justify-center rounded-full border-[3px] border-[#fff7ad] bg-[#7c2d12] px-1 text-[8px] font-black text-[#fff7ad] shadow-[0_3px_8px_rgba(0,0,0,0.28)] sm:h-7 sm:min-w-7 sm:text-[9px]">
                +{overflowChipCount}
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={`relative z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 sm:h-20 sm:w-20 ${
            isWinner
              ? "border-[#fef08a] bg-[#f8d370] text-[#15803d] shadow-[0_0_18px_rgba(250,204,21,0.75)]"
              : selected
              ? "border-[#9f5b32] bg-[#d3aa72] text-[#b91c1c]"
              : "border-[#9f5b32]/45 bg-[#d3aa72]/60 text-[#9f5b32]/35"
          }`}
        >
          <span className="text-2xl font-black sm:text-4xl">{isHead ? "H" : "T"}</span>
        </div>
        <div className="mt-1 text-base font-black text-[#6b3f1c] sm:mt-2 sm:text-xl">
          1 : {payoutMultiplier}
        </div>
      </div>
      {selected ? (
        <div className="absolute left-4 top-[58px] flex h-7 w-7 items-center justify-center rounded-full border-4 border-slate-100 bg-white text-[9px] font-black text-slate-600 shadow-[0_2px_5px_rgba(0,0,0,0.35)] sm:left-12 sm:top-[92px] sm:h-9 sm:w-9 sm:text-[11px]">
          {stake}
        </div>
      ) : null}
      {showWinPayout ? (
        <>
          <div className="absolute left-[52px] top-[56px] flex h-7 w-7 animate-[win-chip-float_900ms_ease-out_infinite_alternate] items-center justify-center rounded-full border-4 border-[#fef08a] bg-white text-[8px] font-black text-emerald-700 shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:left-[88px] sm:top-[82px] sm:h-9 sm:w-9 sm:text-[10px]">
            +{formatAmount(stake * Number(payoutMultiplier))}
          </div>
          <div className="absolute left-[76px] top-[72px] flex h-7 w-7 animate-[win-chip-float_900ms_ease-out_160ms_infinite_alternate] items-center justify-center rounded-full border-4 border-[#86efac] bg-white text-[8px] font-black text-emerald-700 shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:left-[122px] sm:top-[112px] sm:h-9 sm:w-9 sm:text-[10px]">
            WIN
          </div>
        </>
      ) : null}
      {powerMultiplier && !isReveal ? (
        <div className="absolute bottom-3 right-4 z-20 rounded-md border border-[#fff7ad] bg-[linear-gradient(180deg,#fff176,#f59e0b)] px-2 py-0.5 text-xs font-black text-[#78350f] shadow-[0_4px_10px_rgba(245,158,11,0.45)] sm:right-9 sm:text-sm">
          <PowerMultiplierText multiplier={powerMultiplier} />
        </div>
      ) : null}
      {isWinner ? (
        <div className="absolute inset-x-4 bottom-3 rounded-md bg-[#15803d] px-2 py-1 text-center text-xs font-black text-white">
          {outcome} WINNER
        </div>
      ) : null}
      {showPowerLight ? (
        <Zap className="absolute bottom-2 right-2 z-20 h-9 w-9 animate-pulse fill-[#fff176] text-[#6b3f1c] drop-shadow-[0_0_12px_rgba(255,241,118,0.95)]" />
      ) : null}
      <style jsx>{`
        @keyframes win-chip-float {
          from {
            transform: translateY(0) scale(1);
          }
          to {
            transform: translateY(-12px) scale(1.08);
          }
        }
        @keyframes power-spark {
          0%,
          100% {
            opacity: 0;
            filter: brightness(1);
            transform: scaleX(0.2) translateX(0);
          }
          35% {
            opacity: 1;
            filter: brightness(1.9);
            transform: scaleX(1) translateX(-8px);
          }
          60% {
            opacity: 0.55;
            transform: scaleX(0.62) translateX(5px);
          }
        }
        @keyframes power-card-light {
          0% {
            opacity: 0;
            filter: brightness(1);
          }
          18% {
            opacity: 1;
            filter: brightness(1.45);
          }
          38% {
            opacity: 0.55;
            filter: brightness(1.15);
          }
          58% {
            opacity: 0.95;
            filter: brightness(1.65);
          }
          78% {
            opacity: 0.45;
            filter: brightness(1.2);
          }
          100% {
            opacity: 0.28;
            filter: brightness(1.08);
          }
        }
        @keyframes power-sweep {
          0% {
            opacity: 0;
            transform: translateX(-70%) rotate(-12deg);
          }
          18% {
            opacity: 0.9;
          }
          55% {
            opacity: 0.75;
            transform: translateX(18%) rotate(-12deg);
          }
          100% {
            opacity: 0;
            transform: translateX(76%) rotate(-12deg);
          }
        }
      `}</style>
    </button>
  );
}

function PowerMultiplierText({ multiplier }: { multiplier: string }) {
  const target = Math.max(0, Math.floor(Number(multiplier) || 0));
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);

    if (target <= 0) return undefined;

    const timer = window.setInterval(() => {
      setValue((current) => {
        if (current >= target) {
          window.clearInterval(timer);
          return current;
        }

        return current + 1;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [target]);

  return <span>{value}x</span>;
}

function ChipButton({
  amount,
  selected,
  onClick,
  tone = "cyan",
  className = "",
}: {
  amount: number;
  selected?: boolean;
  onClick: () => void;
  tone?: "pink" | "blue" | "gold" | "cyan" | "green";
  className?: string;
}) {
  const toneClass = {
    pink: "border-[#e85d9a] text-[#8f164f]",
    blue: "border-[#29348f] text-[#1d2b7a]",
    gold: "border-[#e5a900] text-[#6b3f00]",
    cyan: "border-[#23a4bd] text-[#155e75]",
    green: "border-[#7aa52b] text-[#365314]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full border-[6px] bg-white text-sm font-black shadow-[0_7px_12px_rgba(0,0,0,0.42),inset_0_2px_0_rgba(255,255,255,0.95)] transition hover:scale-105 active:scale-95 ${
        selected
          ? "border-[#f0bf38] text-[#3f2614] shadow-[0_0_0_4px_rgba(240,191,56,0.22),0_9px_16px_rgba(0,0,0,0.45)]"
          : toneClass
      } ${className}`}
    >
      <span className="absolute inset-[5px] rounded-full border-2 border-dashed border-current opacity-65" />
      <span className="absolute inset-[13px] rounded-full bg-[radial-gradient(circle_at_35%_28%,#ffffff_0%,#f8fafc_48%,#d7dee8_100%)]" />
      <span className="relative z-10">{amount}</span>
    </button>
  );
}

function ChipSelector({
  stake,
  chipOptions,
  isOpen,
  isVisible,
  onToggle,
  onSelect,
}: {
  stake: number;
  chipOptions: number[];
  isOpen: boolean;
  isVisible: boolean;
  onToggle: () => void;
  onSelect: (amount: number) => void;
}) {
  const chips = [
    { x: -104, y: 4, tone: "pink" as const },
    { x: -86, y: -70, tone: "blue" as const },
    { x: -34, y: -110, tone: "gold" as const },
    { x: 34, y: -110, tone: "cyan" as const },
    { x: 86, y: -70, tone: "green" as const },
    { x: 104, y: 4, tone: "green" as const },
  ].flatMap((position, index) => {
    const amount = chipOptions[index];
    return amount === undefined ? [] : [{ ...position, amount }];
  });

  return (
    <div
      className={`pointer-events-none absolute bottom-[-118px] left-1/2 z-30 h-40 w-40 -translate-x-1/2 transition-all duration-500 ease-out ${
        isVisible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-16 scale-90 opacity-0"
      }`}
    >
      <div
        className={`absolute left-1/2 top-1/2 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(240,191,56,0.30)_0%,rgba(240,191,56,0.14)_42%,transparent_72%)] blur-md transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      {chips.map((chip) => (
            <div
              key={chip.amount}
              className="pointer-events-auto absolute left-1/2 top-1/2 transition-all duration-300 ease-out"
              style={{
                transform: isOpen
                  ? `translate(calc(-50% + ${chip.x}px), calc(-50% + ${chip.y}px)) scale(1)`
                  : "translate(-50%, -50%) scale(0.45)",
                opacity: isOpen ? 1 : 0,
              }}
            >
              <ChipButton
                amount={chip.amount}
                selected={stake === chip.amount}
                tone={chip.tone}
                onClick={() => onSelect(chip.amount)}
              />
            </div>
          ))}

      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <ChipButton
          amount={stake}
          selected
          onClick={onToggle}
          tone="gold"
          className="h-16 w-16 text-lg"
        />
      </div>
    </div>
  );
}

function Roadmap({ cells }: { cells: CoinTossRoadmapCell[] }) {
  const columns = Math.max(14, ...cells.map((cell) => cell.column + 1), 1);
  const visibleColumns = Math.min(columns, 8);
  const startColumn = Math.max(0, columns - visibleColumns);
  const lookup = new Map(cells.map((cell) => [`${cell.column}-${cell.row}`, cell]));

  return (
    <div className="border-t border-[#70401f] bg-[radial-gradient(circle_at_50%_0%,rgba(255,231,122,0.16),transparent_32%),linear-gradient(180deg,#fff6df_0%,#f8e1b8_100%)] px-1.5 py-1.5">
      <div
        className="grid overflow-hidden rounded-md border border-[#b7834a] bg-[linear-gradient(135deg,rgba(111,69,35,0.09)_25%,transparent_25%,transparent_50%,rgba(111,69,35,0.09)_50%,rgba(111,69,35,0.09)_75%,transparent_75%),#fffaf0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),inset_0_0_18px_rgba(111,63,28,0.12)] bg-[length:18px_18px]"
        style={{
          gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${maxRoadmapRows}, minmax(0, 30px))`,
        }}
      >
        {Array.from({ length: visibleColumns * maxRoadmapRows }, (_, index) => {
          const column = startColumn + Math.floor(index / maxRoadmapRows);
          const row = index % maxRoadmapRows;
          const cell = lookup.get(`${column}-${row}`);

          return (
            <div
              key={`${column}-${row}`}
              className="relative flex items-center justify-center border-b border-r border-[#d7bb8d]/70"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.42)_0%,transparent_58%)] opacity-45" />
              {cell ? (
                <span
                  className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/80 sm:h-6 sm:w-6 ${
                    cell.outcome === "HEAD"
                      ? "bg-[radial-gradient(circle_at_32%_28%,#ffe39a_0%,#f0a400_44%,#9f5b00_100%)] shadow-[0_0_0_2px_rgba(240,164,0,0.18),0_4px_8px_rgba(159,91,0,0.28),inset_0_2px_0_rgba(255,255,255,0.48)]"
                      : "bg-[radial-gradient(circle_at_32%_28%,#a7f3c0_0%,#24914a_46%,#0f5f32_100%)] shadow-[0_0_0_2px_rgba(36,145,74,0.18),0_4px_8px_rgba(15,95,50,0.28),inset_0_2px_0_rgba(255,255,255,0.45)]"
                  }`}
                  title={`${cell.roundCode} ${cell.outcome}`}
                >
                  {cell.powerMultiplier ? (
                    <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#fff7ad] bg-[linear-gradient(180deg,#7c2d12,#3f1608)] px-1 text-[7px] font-black leading-3 text-[#fff7ad] shadow-[0_0_8px_rgba(250,204,21,0.95)] sm:-top-2.5 sm:px-1.5 sm:text-[8px]">
                      {Number(cell.powerMultiplier).toFixed(0)}x
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopBar({
  lobby,
  secondsLeft,
  isLocked,
}: {
  lobby?: CoinTossLobby;
  secondsLeft: number;
  isLocked: boolean;
}) {
  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-[#322218] px-2 py-2 text-white">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-[#f0bf38]" />
        <span className="text-xl font-black sm:text-2xl">
          {lobby?.activeViewerCount ?? lobby?.activePlayerCount ?? 0}
        </span>
      </div>
      <div
        className={`min-w-[118px] rounded-b-[32px] border-x border-b px-3 pb-2 pt-1 text-center shadow-[0_6px_12px_rgba(0,0,0,0.35)] sm:min-w-[145px] sm:rounded-b-[42px] sm:px-4 ${
          isLocked
            ? "border-[#ff8dbb] bg-[linear-gradient(180deg,#d82f79,#8e164f)]"
            : "border-[#96dfc4] bg-[linear-gradient(180deg,#119472,#0d6954)]"
        }`}
      >
        <div
          className={`text-[10px] font-bold text-[#d8fff0] ${
            isLocked ? "animate-pulse text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.75)]" : ""
          }`}
        >
          {isLocked ? "BET LOCK" : "Place bet now"}
        </div>
        <div className="text-2xl font-black leading-6 text-[#f0bf38] sm:text-3xl sm:leading-7">
          {secondsLeft}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="text-right text-[10px] font-bold text-[#f0bf38]">
          <div>{formatAmount(lobby?.settings.minBet ?? 300)} Min</div>
          <div>{formatAmount(lobby?.settings.maxBet ?? 6315)} Max</div>
        </div>
        <Menu className="h-6 w-6 text-[#f0bf38] sm:h-7 sm:w-7" />
      </div>
    </div>
  );
}

export default function CoinTossPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [selectedOutcome, setSelectedOutcome] =
    useState<CoinTossOutcome | null>(null);
  const [stake, setStake] = useState(5);
  const [now, setNow] = useState(Date.now());
  const [isChipSelectorOpen, setIsChipSelectorOpen] = useState(false);
  const [revealedOutcome, setRevealedOutcome] =
    useState<CoinTossOutcome | null>(null);
  const [revealUntil, setRevealUntil] = useState(0);
  const [placedBet, setPlacedBet] = useState<PlacedBetState | null>(null);
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null);
  const [cardErrorOutcome, setCardErrorOutcome] = useState<CoinTossOutcome | null>(null);
  const [activePowerRoundCode, setActivePowerRoundCode] = useState<string | null>(
    null,
  );
  const lastRevealedRoundRef = useRef<string | null>(null);
  const revealDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const clearBetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: lobbyData, isLoading, refetch } = useQuery({
    queryKey: ["coin-toss-lobby"],
    queryFn: () => CoinTossService.getLobby(),
    refetchInterval: 1000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sessionId = getPresenceSessionId();
    const sendPresence = async () => {
      try {
        await CoinTossService.trackPresence(sessionId);
        void refetch();
      } catch {
        // Best-effort live viewer count.
      }
    };

    void sendPresence();
    const timer = window.setInterval(() => {
      void sendPresence();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [refetch]);

  const lobby = lobbyData?.data;
  const minBet = Number(lobby?.settings.minBet ?? 5);
  const maxBet = Number(lobby?.settings.maxBet ?? 100);
  const chipOptions = useMemo(
    () => buildChipOptions(minBet, maxBet),
    [minBet, maxBet],
  );
  const secondsLeft = getSecondsLeft(lobby?.currentRound.locksAt);
  const isLocked = secondsLeft <= 0 || lobby?.currentRound.status !== "BETTING";
  const payoutMultiplier = lobby?.settings.payoutMultiplier ?? "0.70";
  const placeBetMutation = useMutation({
    mutationFn: (outcome: CoinTossOutcome) =>
      CoinTossService.placeBet({
        outcome,
        stake,
      }),
    onSuccess: async (response) => {
      const bet = response.data.bet;
      const nextPlacedBet = {
        id: bet.id,
        roundId: bet.roundId,
        outcome: bet.outcome,
        stake: Number(bet.stake),
      };

      setPlacedBet(nextPlacedBet);
      setCardErrorMessage(null);
      setCardErrorOutcome(null);
      updateUser({ balance: Number(response.data.balance) });
      toast.success("Bet placed");
      await refetch();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!
              .data!.message!
          : "Failed to place bet";
      setCardErrorMessage(
        message.toLowerCase().includes("insufficient balance")
          ? "Insufficient balance"
          : null,
      );
      if (message.toLowerCase().includes("insufficient balance")) {
        setCardErrorOutcome(selectedOutcome);
      }
      toast.error(message);
    },
  });

  const headPct = lobby?.percentage.head ?? 0;
  const tailPct = lobby?.percentage.tail ?? 0;
  const displayName = getMaskedName(currentUser?.username ?? currentUser?.name);
  const displayBalance = Number(currentUser?.balance ?? 0);
  const latestHistoryRound = lobby?.history.at(-1);
  const coinPhase =
    now < revealUntil ? "reveal" : secondsLeft <= 2 ? "cover" : "idle";
  const isResultReveal = coinPhase === "reveal" && Boolean(revealedOutcome);
  const displaySelectedOutcome = placedBet?.outcome ?? selectedOutcome;
  const displayStake = placedBet?.stake ?? stake;
  const headPower =
    activePowerRoundCode === latestHistoryRound?.roundCode &&
    lobby?.currentRound.powerOutcome === "HEAD"
      ? lobby.currentRound.powerMultiplier
      : null;
  const tailPower =
    activePowerRoundCode === latestHistoryRound?.roundCode &&
    lobby?.currentRound.powerOutcome === "TAIL"
      ? lobby.currentRound.powerMultiplier
      : null;
  const isUserWinReveal =
    isResultReveal && Boolean(placedBet) && placedBet?.outcome === revealedOutcome;
  const isUserLossReveal =
    isResultReveal && Boolean(placedBet) && placedBet?.outcome !== revealedOutcome;
  const hasPlacedBetInCurrentRound = placedBet?.roundId === lobby?.currentRound.id;
  const headOwnPlacedStake =
    hasPlacedBetInCurrentRound && placedBet?.outcome === "HEAD" ? placedBet.stake : 0;
  const tailOwnPlacedStake =
    hasPlacedBetInCurrentRound && placedBet?.outcome === "TAIL" ? placedBet.stake : 0;
  const headLiveBetCount = Math.max(
    0,
    (lobby?.liveBetStats.head.betCount ?? 0) - (headOwnPlacedStake > 0 ? 1 : 0),
  );
  const tailLiveBetCount = Math.max(
    0,
    (lobby?.liveBetStats.tail.betCount ?? 0) - (tailOwnPlacedStake > 0 ? 1 : 0),
  );
  const headLiveStakeTotal = Math.max(
    0,
    Number(lobby?.currentRound.totalHeadStake ?? 0) - headOwnPlacedStake,
  ).toString();
  const tailLiveStakeTotal = Math.max(
    0,
    Number(lobby?.currentRound.totalTailStake ?? 0) - tailOwnPlacedStake,
  ).toString();

  const selectOutcomeAndBet = (outcome: CoinTossOutcome) => {
    if (isLocked || isLoading || placeBetMutation.isPending) return;
    if (displayBalance < stake) {
      setCardErrorMessage("Insufficient balance");
      setCardErrorOutcome(outcome);
      return;
    }

    setCardErrorMessage(null);
    setCardErrorOutcome(null);
    setSelectedOutcome(outcome);
    setIsChipSelectorOpen(false);
    placeBetMutation.mutate(outcome);
  };

  useEffect(() => {
    if (isLocked) {
      setIsChipSelectorOpen(false);
      setSelectedOutcome(null);
      setCardErrorMessage(null);
      setCardErrorOutcome(null);
    }
  }, [isLocked]);

  useEffect(() => {
    if (!Number.isFinite(minBet) || !Number.isFinite(maxBet)) return;
    setStake((current) => {
      if (current < minBet) return minBet;
      if (current > maxBet) return maxBet;
      return current;
    });
  }, [minBet, maxBet]);

  useEffect(() => {
    if (!latestHistoryRound?.roundCode || !latestHistoryRound.outcome) return;
    if (lastRevealedRoundRef.current === latestHistoryRound.roundCode) return;

    lastRevealedRoundRef.current = latestHistoryRound.roundCode;
    setRevealUntil(0);
    void UserService.getProfile({ silent: true })
      .then((profileResponse) => {
        const balance = Number(profileResponse?.data?.balance);
        if (Number.isFinite(balance)) {
          updateUser({ balance });
        }
      })
      .catch(() => {
        // Balance refresh is best-effort; the next profile refresh will recover it.
      });
    setActivePowerRoundCode(
      latestHistoryRound.powerMultiplier ? latestHistoryRound.roundCode : null,
    );

    if (revealDelayTimerRef.current) {
      clearTimeout(revealDelayTimerRef.current);
    }

    const powerLevel = Math.max(
      0,
      Math.floor(Number(latestHistoryRound.powerMultiplier) || 0),
    );
    const powerAnimationMs = Math.max(1800, (powerLevel + 1) * 650);
    const revealDelayMs = latestHistoryRound.powerMultiplier
      ? powerAnimationMs + 800
      : 4000;

    revealDelayTimerRef.current = setTimeout(() => {
      setActivePowerRoundCode(null);
      setRevealedOutcome(latestHistoryRound.outcome);
      setRevealUntil(Date.now() + resultRevealMs);

      if (clearBetTimerRef.current) {
        clearTimeout(clearBetTimerRef.current);
      }

      clearBetTimerRef.current = setTimeout(() => {
        setSelectedOutcome(null);
        setPlacedBet(null);
        setCardErrorMessage(null);
        setCardErrorOutcome(null);
      }, resultRevealMs);
    }, revealDelayMs);
  }, [latestHistoryRound?.outcome, latestHistoryRound?.roundCode, updateUser]);

  useEffect(
    () => () => {
      if (revealDelayTimerRef.current) {
        clearTimeout(revealDelayTimerRef.current);
      }
      if (clearBetTimerRef.current) {
        clearTimeout(clearBetTimerRef.current);
      }
    },
    [],
  );

  return (
    <div className="h-[100svh] w-full overflow-hidden bg-[#241a14] text-[#3f2614]">
      <div className="mx-auto flex h-full w-full max-w-[540px] flex-col overflow-hidden bg-[#b8794b] shadow-[0_0_0_1px_rgba(0,0,0,0.25)]">
        <div className="flex shrink-0 items-center justify-between bg-[#695f53] px-2.5 py-1 text-[10px] font-bold text-white sm:px-3 sm:text-[11px]">
          <span>Min. Bet : 🪙 {formatAmount(lobby?.settings.minBet ?? 300)}</span>
          <div className="flex items-center gap-2">
            <span>ID : {displayName}</span>
            <button
              type="button"
              onClick={() => router.push("/games")}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition hover:bg-black/35"
              aria-label="Close Coin Toss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-1.5 bg-[#6b5646] p-1.5 sm:gap-2 sm:p-2">
          <PlayerRail title="Richest" players={lobby?.richestPlayers ?? []} />
          <CoinScene outcome={revealedOutcome} phase={coinPhase} />
          <PlayerRail title="Big Winners" players={lobby?.bigWinners ?? []} />
        </div>

        <TopBar lobby={lobby} secondsLeft={secondsLeft} isLocked={isLocked} />

        <div className="flex min-h-0 flex-1 flex-col bg-[#b8794b] p-1.5 sm:p-3">
          <div className="relative shrink-0 rounded-lg border-2 border-[#603719] bg-[#a9633b] p-2 pb-9 shadow-[inset_0_2px_0_rgba(255,255,255,0.15)] sm:p-4 sm:pb-12">
            <div className="grid grid-cols-2 gap-2 sm:gap-8">
              <BetPanel
                outcome="HEAD"
                selected={displaySelectedOutcome === "HEAD" && !isUserLossReveal}
                onSelect={() => selectOutcomeAndBet("HEAD")}
                disabled={isLocked || isLoading || placeBetMutation.isPending}
                overlayMessage={
                  cardErrorMessage && cardErrorOutcome === "HEAD"
                    ? cardErrorMessage
                    : null
                }
                payoutMultiplier={payoutMultiplier}
                stake={displayStake}
                liveBetCount={headLiveBetCount}
                liveStakeTotal={headLiveStakeTotal}
                winningOutcome={revealedOutcome}
                isReveal={isResultReveal}
                showWinPayout={isUserWinReveal && placedBet?.outcome === "HEAD"}
                powerMultiplier={headPower}
              />
              <BetPanel
                outcome="TAIL"
                selected={displaySelectedOutcome === "TAIL" && !isUserLossReveal}
                onSelect={() => selectOutcomeAndBet("TAIL")}
                disabled={isLocked || isLoading || placeBetMutation.isPending}
                overlayMessage={
                  cardErrorMessage && cardErrorOutcome === "TAIL"
                    ? cardErrorMessage
                    : null
                }
                payoutMultiplier={payoutMultiplier}
                stake={displayStake}
                liveBetCount={tailLiveBetCount}
                liveStakeTotal={tailLiveStakeTotal}
                winningOutcome={revealedOutcome}
                isReveal={isResultReveal}
                showWinPayout={isUserWinReveal && placedBet?.outcome === "TAIL"}
                powerMultiplier={tailPower}
              />
            </div>

            <ChipSelector
              stake={stake}
              chipOptions={chipOptions}
              isOpen={isChipSelectorOpen}
              isVisible={!isLocked}
              onToggle={() => setIsChipSelectorOpen((current) => !current)}
              onSelect={(amount) => {
                setStake(amount);
                setIsChipSelectorOpen(false);
              }}
            />
          </div>

          <div className="mt-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#70401f] bg-[#f3d5ac] sm:mt-3">
            <div className="flex shrink-0 items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
              <div className="h-9 w-9 rounded-lg border-2 border-[#f0bf38] bg-gradient-to-br from-pink-300 to-rose-500 sm:h-12 sm:w-12" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black text-[#5c3217] sm:text-sm">
                  {displayName}
                </div>
                <div className="text-[11px] font-black text-[#7c5b3a] sm:text-xs">
                  Balance: {formatAmount(displayBalance)}
                </div>
              </div>
              {isUserWinReveal ? (
                <div className="flex items-center gap-1">
                  <div className="flex h-9 w-9 animate-bounce items-center justify-center rounded-full border-4 border-[#fef08a] bg-white text-[10px] font-black text-emerald-700 shadow-[0_3px_8px_rgba(0,0,0,0.3)]">
                    +{formatAmount(placedBet!.stake * Number(payoutMultiplier))}
                  </div>
                  <div className="flex h-9 w-9 animate-bounce items-center justify-center rounded-full border-4 border-[#86efac] bg-white text-[10px] font-black text-emerald-700 shadow-[0_3px_8px_rgba(0,0,0,0.3)] [animation-delay:150ms]">
                    WIN
                  </div>
                </div>
              ) : null}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#2f86a6] bg-white text-base font-black sm:h-14 sm:w-14 sm:text-xl">
                {stake}
              </div>
            </div>
            <Roadmap cells={lobby?.roadmap ?? []} />
            <div className="grid shrink-0 grid-cols-[1fr_1fr_auto] items-end gap-2 border-t border-[#b9b9b9] bg-[#e5e5e5] px-2.5 py-1 text-[10px] font-black sm:px-3 sm:text-sm">
              <div className="text-[#b96917]">
                <div className="flex items-center gap-1">
                  <span>HEAD</span>
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#d7d7d7] bg-[radial-gradient(circle_at_35%_28%,#ffffff_0%,#f6dde5_44%,#d1a7b5_100%)] text-[7px] font-black text-[#b96917] sm:h-4 sm:w-4 sm:text-[8px]">
                    H
                  </span>
                  <span>{headPct.toFixed(0)}%</span>
                </div>
                <div className="text-[8px] leading-3 text-[#8c5a25] sm:text-[9px]">
                  {headLiveBetCount} bet
                </div>
              </div>
              <div className="text-center text-[#278b45]">
                <div className="flex items-center justify-center gap-1">
                  <span>TAIL</span>
                  <span className="h-3.5 w-3.5 rounded-full border border-[#bdbdbd] bg-white/70 sm:h-4 sm:w-4" />
                  <span>{tailPct.toFixed(0)}%</span>
                </div>
                <div className="text-[8px] leading-3 text-[#2e7a44] sm:text-[9px]">
                  {tailLiveBetCount} bet
                </div>
              </div>
              <div className="text-right text-[8px] leading-3 text-[#7c7c7c] sm:text-[10px]">
                Calculated from
                <br />
                last 60 rounds
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
