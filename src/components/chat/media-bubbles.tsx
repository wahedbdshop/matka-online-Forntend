"use client";

import { useState, useRef } from "react";
import { Play, Pause, X } from "lucide-react";

function fmtTime(sec: number) {
  if (!isFinite(sec) || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioBubble({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="flex min-w-[170px] items-center gap-2.5">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5 translate-x-px" />}
      </button>
      <div className="flex-1 space-y-0.5">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={(e) => {
            const t = Number(e.target.value);
            setCurrentTime(t);
            if (audioRef.current) audioRef.current.currentTime = t;
          }}
          className="w-full cursor-pointer accent-cyan-400"
          style={{ height: "4px" }}
        />
        <div className="flex justify-between text-[10px] text-white/50">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export function ImageBubble({
  url,
  onPreview,
}: {
  url: string;
  onPreview: (url: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPreview(url)}
      className="block overflow-hidden rounded-xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Sent image"
        className="max-h-52 max-w-[220px] rounded-xl object-cover transition-opacity hover:opacity-90"
      />
    </button>
  );
}

export function ImagePreviewModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Full preview"
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
