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

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/deposit", icon: ArrowDownToLine, label: "Deposit" },
  { href: "/withdrawal", icon: ArrowUpFromLine, label: "Withdraw" },
  { href: "/transfer", icon: ArrowLeftRight, label: "Transfer" },
  { href: "/games", icon: Gamepad2, label: "Games" },
  { href: "/profile", icon: User, label: "Profile" },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 dark:bg-slate-900 light:bg-white border-t border-slate-700 dark:border-slate-700 light:border-slate-200">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-purple-500"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
