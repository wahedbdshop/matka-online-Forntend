"use client";

import { useQuery } from "@tanstack/react-query";
import { HomeService } from "@/services/home.service";
import { MarqueeText } from "@/app/(user)/dashboard/_components/marquee-text";

const FALLBACK_MARQUEE_TEXT =
  "Welcome to Matka Online 24 - Thailand Lottery, PCSO & more! Fast withdrawal - 24/7 Support - Safe & Trusted";

export function GlobalNoticeBar() {
  const { data: homeData } = useQuery({
    queryKey: ["global-home-marquee"],
    queryFn: () => HomeService.getHomeData(),
    staleTime: 60_000,
  });

  const marqueeText = homeData?.data?.marquees?.[0]?.text ?? FALLBACK_MARQUEE_TEXT;

  return (
    <div className="w-full">
      <MarqueeText text={marqueeText} />
    </div>
  );
}
