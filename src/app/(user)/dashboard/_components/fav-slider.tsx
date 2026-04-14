/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function FavSlider({ slides }: { slides: any[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(
      () => setCurrent((p) => (p + 1) % slides.length),
      4000,
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div>
      <p className="text-white font-semibold text-sm mb-3">Favourites </p>
      <div className="relative aspect-[3/1] overflow-hidden rounded-2xl">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 overflow-hidden transition-opacity duration-700",
              i === current ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {s.linkUrl ? (
              <Link
                href={s.linkUrl}
                className="relative block h-full w-full overflow-hidden"
              >
                <Image
                  src={s.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-cover object-center"
                />
              </Link>
            ) : (
              <Image
                src={s.imageUrl}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="object-cover object-center"
              />
            )}
          </div>
        ))}
        {slides.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === current
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/40",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
