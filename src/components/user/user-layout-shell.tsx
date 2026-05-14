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

  return (
    <>
      {!isLudoRoomRoute ? (
        <TopHeader initialIsAuthenticated={initialIsAuthenticated} />
      ) : null}
      <main
        className={
          isLudoRoomRoute
            ? "flex-1 w-full"
            : "flex-1 max-w-lg w-full mx-auto px-4 pt-4 pb-24"
        }
      >
        {children}
      </main>
      {!isLudoRoomRoute ? <BottomNav /> : null}
    </>
  );
}
