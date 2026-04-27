"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Gamepad2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/providers/language-provider";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "home" as const },
  { href: "/deposit", icon: ArrowDownToLine, key: "deposit" as const },
  { href: "/withdrawal", icon: ArrowUpFromLine, key: "withdraw" as const },
  { href: "/transfer", icon: ArrowLeftRight, key: "transfer" as const },
  { href: "/games", icon: Gamepad2, key: "games" as const },
  { href: "/profile", icon: User, key: "profile" as const },
];

export const BottomNav = () => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const isBanned = useAuthStore((state) => state.user?.status === "BANNED");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isProfileItem = item.href === "/profile";
          const disabled = isBanned && !isProfileItem;

          return (
            <Link
              key={item.href}
              href={disabled ? "#" : item.href}
              aria-disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                disabled
                  ? "opacity-50 pointer-events-none cursor-not-allowed"
                  : isActive
                    ? "text-purple-500"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.nav[item.key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
