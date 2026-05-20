"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import { TopHeader } from "@/components/user/top-header";
import { BottomNav } from "@/components/user/bottom-nav";

export function UserLayoutShell({
  children,
  initialIsAuthenticated = false,
}: {
  children: React.ReactNode;
  initialIsAuthenticated?: boolean;
}) {
  const segments = useSelectedLayoutSegments();
  const isLudoRoute = segments[0] === "games" && segments[1] === "ludo";
  const isLudoRoomRoute = isLudoRoute && segments[2] === "room";
  const isCoinTossRoute = segments[0] === "games" && segments[1] === "coin-toss";
  const isSevenUpDownRoute =
    segments[0] === "games" && segments[1] === "seven-up-down";
  const isFullScreenGameRoute =
    isLudoRoomRoute || isCoinTossRoute || isSevenUpDownRoute;
  const isSupportHubRoute =
    segments[0] === "support" && segments[1] === "live";

  return (
    <>
      {!isFullScreenGameRoute && (
        <TopHeader initialIsAuthenticated={initialIsAuthenticated} />
      )}
      <main
        className={
          isLudoRoomRoute
            ? "flex min-h-dvh w-full overflow-hidden"
            : isCoinTossRoute
            ? "block min-h-dvh w-full overflow-x-hidden overflow-y-auto"
            : isSevenUpDownRoute
            ? "block min-h-dvh w-full overflow-x-hidden overflow-y-auto"
            : `flex-1 max-w-lg w-full mx-auto px-4 pt-4 ${
                isSupportHubRoute ? "pb-6" : "pb-24"
              }`
        }
        style={
          isLudoRoomRoute
            ? {
                background:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0), radial-gradient(circle at top center, rgba(54,104,255,0.34), transparent 30%), linear-gradient(180deg,#173aa7 0%,#153596 42%,#08133b 100%)",
                backgroundSize: "22px 22px, auto, auto",
              }
            : undefined
        }
      >
        {children}
      </main>
      {!isSupportHubRoute && !isFullScreenGameRoute && <BottomNav />}
    </>
  );
}
