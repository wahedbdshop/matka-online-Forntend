"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ServerTimePayload = {
  nowIso: string;
  nowUnixMs: number;
  timezone: string;
  bangladeshDate: string;
  bangladeshTime: string;
};

type TimeBaseline = {
  perfNow: number;
  serverUnixMs: number;
};

const CLOCK_TICK_MS = 1000;
const RESYNC_INTERVAL_MS = 60_000;

export function useServerTime() {
  const [snapshot, setSnapshot] = useState<ServerTimePayload | null>(null);
  const [serverNow, setServerNow] = useState<Date | null>(null);
  const baselineRef = useRef<TimeBaseline | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncServerTime = async (signal?: AbortSignal) => {
      const response = await fetch("/api/server-time", {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Unable to sync server time");
      }

      const payload = (await response.json()) as ServerTimePayload;
      const nextBaseline = {
        perfNow: performance.now(),
        serverUnixMs: Number(payload.nowUnixMs),
      };

      baselineRef.current = nextBaseline;

      if (!mounted) return;

      setSnapshot(payload);
      setServerNow(new Date(nextBaseline.serverUnixMs));
    };

    const controller = new AbortController();

    void syncServerTime(controller.signal).catch(() => {
      if (!mounted) return;
      setSnapshot(null);
      setServerNow(null);
    });

    const tickInterval = window.setInterval(() => {
      const baseline = baselineRef.current;
      if (!mounted || !baseline) return;

      const elapsedMs = performance.now() - baseline.perfNow;
      setServerNow(new Date(baseline.serverUnixMs + elapsedMs));
    }, CLOCK_TICK_MS);

    const resyncInterval = window.setInterval(() => {
      void syncServerTime().catch(() => {});
    }, RESYNC_INTERVAL_MS);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(tickInterval);
      window.clearInterval(resyncInterval);
    };
  }, []);

  const bangladeshTimeLabel = useMemo(() => {
    if (!snapshot) return null;
    return `${snapshot.bangladeshDate} ${snapshot.bangladeshTime}`;
  }, [snapshot]);

  return {
    serverNow,
    serverTimeReady: serverNow !== null,
    bangladeshTimeLabel,
    timezone: snapshot?.timezone ?? "Asia/Dhaka",
  };
}
