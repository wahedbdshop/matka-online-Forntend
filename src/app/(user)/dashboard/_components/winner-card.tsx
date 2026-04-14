/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";

import { Trophy } from "lucide-react";
import { PLAY_TYPE_LABEL, type PlayType } from "@/types/kalyan";

type WinnerCardTheme = "thai" | "kalyan";

const MIN_SCROLL_ITEMS = 12;

function formatWinnerAmount(value: unknown, theme: WinnerCardTheme) {
  const amount = Number(value ?? 0);
  const symbol = theme === "thai" ? "$" : "\u20b9";

  return `${symbol}${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function getUserLabel(winner: any) {
  const username = String(
    winner?.user?.username ?? winner?.user?.name ?? winner?.username ?? "User",
  ).trim();

  if (!username) return "User***";

  return `@${username.slice(0, 6)}***`;
}

function getAvatarLabel(winner: any) {
  const value = String(
    winner?.user?.name ?? winner?.user?.username ?? winner?.username ?? "U",
  ).trim();

  return value.charAt(0).toUpperCase() || "U";
}

function getThaiMeta(winner: any) {
  return String(winner?.playType ?? winner?.lotteryType ?? "")
    .replace(/\s*\+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getKalyanPlayTypeLabel(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized in PLAY_TYPE_LABEL) {
    return PLAY_TYPE_LABEL[normalized as PlayType];
  }

  return normalized
    ? normalized
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Kalyan";
}

function getMainGameLabel(winner: any, theme: WinnerCardTheme) {
  const fallback = theme === "kalyan" ? "Kalyan Lottery" : "Thai Lottery";

  return String(winner?.gameName ?? winner?.lotteryName ?? fallback).trim() || fallback;
}

function getKalyanMeta(winner: any) {
  const marketName = String(
    winner?.marketDisplayName ?? winner?.marketName ?? winner?.market?.name ?? "",
  ).trim();
  const playType = getKalyanPlayTypeLabel(winner?.playType);
  const sessionType = String(
    winner?.sessionType ?? winner?.session ?? winner?.market?.sessionType ?? "",
  )
    .trim()
    .toUpperCase();
  const sessionLabel =
    sessionType === "OPEN" || sessionType === "CLOSE" ? ` ${sessionType}` : "";

  return [marketName && `${marketName}${sessionLabel}`, playType]
    .filter(Boolean)
    .join(" * ");
}

export function WinnerCard({
  title,
  bets,
  theme = "thai",
}: {
  title: string;
  bets: any[];
  theme?: WinnerCardTheme;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !bets?.length) {
      if (el) el.scrollTop = 0;
      return;
    }

    let animFrame: number;
    let pos = 0;
    const speed = 0.5;

    const scroll = () => {
      pos += speed;
      if (pos >= el.scrollHeight / 2) pos = 0;
      el.scrollTop = pos;
      animFrame = requestAnimationFrame(scroll);
    };

    animFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animFrame);
  }, [bets]);

  const repeatCount = bets.length
    ? Math.max(2, Math.ceil(MIN_SCROLL_ITEMS / bets.length))
    : 0;
  const visibleBets = Array.from({ length: repeatCount }, () => bets).flat();
  const styles =
    theme === "kalyan"
      ? {
          wrapper:
            "border-[#4f4672] bg-[linear-gradient(180deg,#2a3155_0%,#212946_100%)]",
          headerBorder: "border-[#4e5783]",
          headerBg: "bg-[linear-gradient(90deg,#f0bf38_0%,#e4a900_100%)]",
          headerIcon: "bg-[#202743] text-[#f5c548]",
          headerText: "text-[#1b2037]",
          liveBg: "bg-[#1d2645]/12",
          liveText: "text-[#1b2037]",
          divider: "divide-[#40496f]",
          avatarBorder: "border-[#65511a]",
          avatarBg: "bg-[#2a2437]",
          avatarText: "text-[#f5c548]",
          amountBorder: "border-emerald-500/20",
          amountBg: "bg-emerald-500/10",
          amountText: "text-emerald-300",
        }
      : {
          wrapper:
            "border-[#4f4672] bg-[linear-gradient(180deg,#2a3155_0%,#212946_100%)]",
          headerBorder: "border-[#4e5783]",
          headerBg: "bg-[linear-gradient(90deg,#f0bf38_0%,#e4a900_100%)]",
          headerIcon: "bg-[#202743] text-[#f5c548]",
          headerText: "text-[#1b2037]",
          liveBg: "bg-[#1d2645]/12",
          liveText: "text-[#1b2037]",
          divider: "divide-[#40496f]",
          avatarBorder: "border-[#65511a]",
          avatarBg: "bg-[#2a2437]",
          avatarText: "text-[#f5c548]",
          amountBorder: "border-emerald-500/20",
          amountBg: "bg-emerald-500/10",
          amountText: "text-emerald-300",
        };

  return (
    <div
      className={`overflow-hidden rounded-[24px] border shadow-[0_18px_40px_rgba(8,12,26,0.35)] ${styles.wrapper}`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3 py-1.5 ${styles.headerBorder} ${styles.headerBg}`}
      >
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-lg ${styles.headerIcon}`}
        >
          <Trophy className="h-3 w-3" />
        </div>
        <div>
          <p className={`text-[11px] font-bold leading-none ${styles.headerText}`}>
            {title}
          </p>
        </div>
        <span
          className={`ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 ${styles.liveBg}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              bets?.length ? "animate-pulse bg-emerald-500" : "bg-slate-400"
            }`}
          />
          <span className={`text-[9px] font-bold ${styles.liveText}`}>
            {bets?.length ? "Live" : "Waiting"}
          </span>
        </span>
      </div>

      {bets?.length ? (
        <div
          ref={scrollRef}
          className="h-[250px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_48%)]"
          style={{ scrollBehavior: "auto" }}
        >
          <div className={`divide-y ${styles.divider}`}>
            {visibleBets.map((b: any, i: number) => {
              const amount =
                b.actualWin ?? b.winningAmount ?? b.winAmount ?? b.payoutAmount ?? 0;
              const username = getUserLabel(b);
              const mainLabel = getMainGameLabel(b, theme);
              const meta = theme === "kalyan" ? getKalyanMeta(b) : getThaiMeta(b);

              return (
                <div
                  key={`${b.id ?? i}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${styles.avatarBorder} ${styles.avatarBg} ${styles.avatarText}`}
                    >
                      {getAvatarLabel(b)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{username}</p>
                      <p className="max-w-[190px] truncate text-[10px] font-semibold text-slate-300">
                        {mainLabel}
                      </p>
                      {meta ? (
                        <p className="max-w-[190px] truncate text-[10px] text-slate-400">
                          {meta}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-2.5 py-1 text-right ${styles.amountBorder} ${styles.amountBg}`}
                  >
                    <p className={`font-mono text-xs font-bold ${styles.amountText}`}>
                      {formatWinnerAmount(amount, theme)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_48%)] px-4 text-center">
          <div className="space-y-2">
            <p className="text-sm font-bold text-white">No live winners yet</p>
            <p className="text-xs text-slate-400">
              Latest winner updates will appear here automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
