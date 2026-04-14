/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BannerSlider({ banners }: { banners: any[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const visibleBanners = useMemo(
    () => banners.filter((banner) => banner?.imageUrl),
    [banners],
  );

  useEffect(() => {
    if (visibleBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % visibleBanners.length);
    }, 4200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visibleBanners.length]);

  if (!visibleBanners.length) return null;

  const total = visibleBanners.length;

  const goTo = (index: number) => {
    setCurrent((index + total) % total);
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-[#223258] bg-[#0d1426] p-2 shadow-[0_18px_40px_rgba(3,8,20,0.45)]">
      <div className="relative h-[188px] overflow-hidden rounded-lg bg-[#0f172a] sm:h-55">
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${current * (100 / total)}%)`,
          }}
        >
          {visibleBanners.map((banner: any, index: number) => {
            const isActive = index === current;
            const isLcpBanner = index === 0;
            const content = (
              <div className="group relative h-full w-full overflow-hidden">
                <Image
                  src={banner.imageUrl}
                  alt={banner.title ?? `Banner ${index + 1}`}
                  fill
                  unoptimized
                  priority={isLcpBanner}
                  loading={isLcpBanner ? "eager" : "lazy"}
                  sizes="(max-width: 640px) 100vw, 640px"
                  className={cn(
                    "block h-full w-full object-cover object-center transition-transform duration-[1400ms]",
                    isActive ? "scale-100" : "scale-[1.03]",
                  )}
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,22,0.32)_0%,rgba(4,10,22,0.08)_38%,rgba(4,10,22,0.18)_100%)]" />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#09111f] to-transparent opacity-60" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#09111f] to-transparent opacity-50" />
              </div>
            );

            return (
              <div
                key={banner.id ?? `banner-${index}`}
                className="h-full shrink-0"
                style={{ width: `${100 / total}%` }}
              >
                {banner.linkUrl ? (
                  <Link href={banner.linkUrl} className="block h-full">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#9c6f24]/30 bg-[#6a4317]/45 px-3 py-1.5 backdrop-blur">
              {visibleBanners.map((_: any, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300 overflow-hidden",
                    index === current
                      ? "h-2.5 w-6 bg-white/25"
                      : "h-2.5 w-2.5 bg-white/45 hover:bg-white/70",
                  )}
                >
                  {index === current && (
                    <span
                      key={current}
                      className="block h-full rounded-full bg-[#f3c74d]"
                      style={{
                        animation: "banner-progress 4.2s linear forwards",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            <style>{`
              @keyframes banner-progress {
                from { width: 0% }
                to   { width: 100% }
              }
            `}</style>
          </>
        )}
      </div>
    </section>
  );
}
