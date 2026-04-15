/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

export function BannerSlider({ banners }: { banners: any[] }) {
  const visible = banners.filter((b) => b?.imageUrl);

  if (!visible.length) return null;

  return (
    <section className="relative">
      <Swiper
        modules={[EffectCoverflow, Autoplay, Pagination]}
        effect="coverflow"
        grabCursor
        centeredSlides
        slidesPerView="auto"
        loop={visible.length > 1}
        autoplay={visible.length > 1 ? { delay: 4000, disableOnInteraction: false } : false}
        coverflowEffect={{
          rotate: 40,
          stretch: 0,
          depth: 120,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={visible.length > 1 ? { clickable: true } : false}
        className="banner-coverflow"
      >
        {visible.map((banner: any, i: number) => {
          const img = (
            <div className="relative overflow-hidden rounded-lg border border-white/25" style={{ height: "188px" }}>
              <Image
                src={banner.imageUrl}
                alt={banner.title ?? `Banner ${i + 1}`}
                fill
                unoptimized
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                sizes="80vw"
                className="object-cover object-center"
              />
            </div>
          );

          return (
            <SwiperSlide key={banner.id ?? i} style={{ width: "80vw", maxWidth: "420px" }}>
              {banner.linkUrl
                ? <Link href={banner.linkUrl} className="block">{img}</Link>
                : img
              }
            </SwiperSlide>
          );
        })}
      </Swiper>

      <style>{`
        .banner-coverflow .swiper-pagination {
          position: relative;
          margin-top: 12px;
        }
        .banner-coverflow .swiper-pagination-bullet {
          background: rgba(255,255,255,0.35);
          opacity: 1;
          width: 8px;
          height: 8px;
        }
        .banner-coverflow .swiper-pagination-bullet-active {
          background: #fbbf24;
          width: 20px;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}
