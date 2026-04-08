"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, IndianRupee, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import { NotificationService } from "@/services/notification.service";
import { SITE_LOGO_SRC } from "@/lib/branding";
import { useProfileQuery } from "@/hooks/use-profile-query";
import { useAuthStore } from "@/store/auth.store";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { useEffect, useState } from "react";

const protectedUserRoutes = [
  "/dashboard",
  "/deposit",
  "/withdrawal",
  "/transfer",
  "/games",
  "/profile",
  "/notifications",
  "/referral",
  "/support",
  "/kyc",
  "/thai-lottery",
  "/kalyan",
  "/chat",
];

export const TopHeader = ({
  initialIsAuthenticated = false,
}: {
  initialIsAuthenticated?: boolean;
}) => {
  const pathname = usePathname();
  const isAuthStore = useAuthStore((s) => s.isAuthenticated);
  const [hasCookie, setHasCookie] = useState(initialIsAuthenticated);

  useEffect(() => {
    setHasCookie(hasClientAuthCookie());
  }, []);

  const isProtectedRoute = protectedUserRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  const isAuthenticated = isAuthStore || hasCookie || isProtectedRoute;

  const {
    data: profileData,
    refetch: refetchProfile,
    isFetching,
  } = useProfileQuery({
    enabled: isAuthenticated,
    silent: true,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationService.getAll(1, 20),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const profile = profileData?.data;
  const unreadCount = notifData?.data?.unreadCount || 0;
  const balance = Number(profile?.balance ?? 0);
  const displayBalance = balance.toLocaleString("en-BD");

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700">
      <div className="relative max-w-lg mx-auto flex items-center justify-between px-4 h-[58px]">
        {isAuthenticated ? (
          <Link href="/profile" className="min-w-0 max-w-[calc(50%-52px)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0 rounded-xl border border-slate-700 bg-slate-800/80 px-2 py-1.5">
                <IndianRupee className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <p className="truncate text-sm font-bold leading-tight text-white">
                  {displayBalance}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    refetchProfile();
                  }}
                  className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                  aria-label="Refresh balance"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            Log In
          </Link>
        )}

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 z-10 flex items-center justify-center header-logo-shell"
        >
          <Image
            src={SITE_LOGO_SRC}
            alt="Matka Online 24"
            width={142}
            height={42}
            priority
            className="header-logo-image h-9 w-auto object-contain sm:h-10"
          />
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <ThemeToggle />

          {isAuthenticated ? (
            <Link href="/notifications" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-purple-600 text-[10px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          ) : (
            <Link
              href="/register"
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Register
            </Link>
          )}
        </div>
      </div>

    </header>
  );
};
