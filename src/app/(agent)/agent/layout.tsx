"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  ChevronDown,
  Clock,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeProvider } from "@/providers/theme-provider";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";
import { clearClientAuthCookies } from "@/lib/auth-cookie";
import { api } from "@/lib/axios";
import { NotificationPopup } from "@/components/user/notification-popup";
import { FloatingSupportChatButton } from "@/components/agent/floating-support-chat-button";

type NavChild = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
};

type NavItem = {
  href?: string;
  icon: typeof LayoutDashboard;
  label: string;
  exact?: boolean;
  children?: NavChild[];
  section?: string;
};

const navItems: NavItem[] = [
  {
    href: "/agent/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },
  {
    icon: Gamepad2,
    label: "Thai Lottery",
    section: "Games",
    children: [
      { href: "/agent/thai-lottery", icon: Gamepad2, label: "All Rounds" },
      {
        href: "/agent/thai-lottery/rounds/create",
        icon: Plus,
        label: "Create Round",
      },
      {
        href: "/agent/thai-lottery/win-history",
        icon: ShieldCheck,
        label: "Win History",
      },
      {
        href: "/agent/thai-lottery/play-history",
        icon: Clock,
        label: "Play History",
      },
    ],
  },
  {
    icon: Gamepad2,
    label: "Kalyan",
    children: [
      { href: "/agent/kalyan", icon: LayoutDashboard, label: "Dashboard" },
      {
        href: "/agent/kalyan/add-results",
        icon: Plus,
        label: "Add Result",
      },
      {
        href: "/agent/kalyan/win-history",
        icon: ShieldCheck,
        label: "Win History",
      },
      {
        href: "/agent/kalyan/play-history",
        icon: Clock,
        label: "Play History",
      },
    ],
  },
  {
    href: "/agent/deposits",
    icon: ArrowDownToLine,
    label: "Deposit Manage",
    section: "Finance",
  },
  {
    href: "/agent/withdrawals",
    icon: ArrowUpFromLine,
    label: "Withdraw Manage",
  },
  {
    href: "/agent/transfers",
    icon: ArrowLeftRight,
    label: "Transfer Manage",
  },
  {
    href: "/agent/transactions",
    icon: ReceiptText,
    label: "Transactions",
  },
  {
    href: "/agent/tickets",
    icon: ShieldCheck,
    label: "Tickets",
    section: "Support",
  },
  {
    href: "/agent/chat",
    icon: MessageCircle,
    label: "Live Chat",
  },
  {
    href: "/agent/profile",
    icon: UserCircle,
    label: "Profile",
  },
];

function NavItemRow({
  item,
  pathname,
  onClose,
  badge,
}: {
  item: NavItem;
  pathname: string;
  onClose?: () => void;
  badge?: number;
}) {
  const isParentActive = item.href
    ? item.exact
      ? pathname === item.href
      : pathname.startsWith(item.href)
    : (item.children?.some((child) =>
        child.href === "/agent/thai-lottery" || child.href === "/agent/kalyan"
          ? pathname === child.href
          : pathname.startsWith(child.href),
      ) ?? false);

  const [open, setOpen] = useState(isParentActive);

  if (item.children) {
    return (
      <div>
        <div
          className={cn(
            "flex rounded-lg border transition-colors",
            isParentActive
              ? "border-cyan-300 bg-cyan-50 dark:border-cyan-500/30 dark:bg-cyan-500/10"
              : "border-transparent",
          )}
        >
          <button
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "flex flex-1 items-center gap-3 px-3 py-2.5 text-sm rounded-l-lg transition-colors",
              isParentActive
                ? "text-cyan-700 dark:text-cyan-300"
                : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </button>
          <button
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "flex items-center px-2.5 rounded-r-lg border-l border-slate-200 transition-colors dark:border-slate-700/40",
              isParentActive
                ? "text-cyan-700 dark:text-cyan-300"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
            )}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </div>

        {open ? (
          <div className="ml-3 mt-1 space-y-0.5 border-l border-cyan-200 pl-3 dark:border-cyan-500/20">
            {item.children.map((child) => {
              const isChildActive =
                child.href === "/agent/thai-lottery" || child.href === "/agent/kalyan"
                  ? pathname === child.href
                  : pathname.startsWith(child.href);

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                    isChildActive
                      ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300",
                  )}
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        isParentActive
          ? "border border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {!!badge && badge > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: waitingData } = useQuery({
    queryKey: ["agent-waiting-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data;
    },
    refetchInterval: 10000,
  });

  const chatBadge: number = (waitingData?.data ?? []).filter(
    (session: { status?: string }) => session.status === "WAITING_AGENT",
  ).length;

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      clearClientAuthCookies();
      queryClient.clear();
      useAuthStore.getState().clearAuth();
      router.push("/agent/login");
    },
  });

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 text-sm font-extrabold text-white shadow-lg shadow-cyan-900/40">
            S
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight dark:text-white">Support Agent</p>
            <p className="text-[10px] text-cyan-400 font-medium tracking-wide uppercase">
              Backoffice
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item, index) => (
          <div key={item.href ?? index}>
            {item.section ? (
              <div className="mt-3 mb-1 flex items-center gap-2 px-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
                <p className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {item.section}
                </p>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/60" />
              </div>
            ) : null}
            <NavItemRow
              item={item}
              pathname={pathname}
              onClose={onClose}
              badge={item.href === "/agent/chat" ? chatBadge : undefined}
            />
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-700/60">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700/40">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-linear-to-br from-cyan-600 to-blue-600 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Support Agent</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="h-7 w-7 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-400 dark:hover:bg-red-400/10 dark:hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SupportAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname.startsWith("/agent/kalyan")) return;

    const allowedKalyanRoutes = new Set([
      "/agent/kalyan",
      "/agent/kalyan/add-results",
      "/agent/kalyan/win-history",
      "/agent/kalyan/play-history",
    ]);

    if (!allowedKalyanRoutes.has(pathname)) {
      router.replace("/agent/kalyan");
    }
  }, [pathname, router]);

  const titleMap: Record<string, string> = {
    "/agent/dashboard": "Dashboard",
    "/agent/deposits": "Deposit Manage",
    "/agent/withdrawals": "Withdraw Manage",
    "/agent/transfers": "Transfer Manage",
    "/agent/transactions": "Transactions",
    "/agent/tickets": "Support Tickets",
    "/agent/chat": "Live Chat",
    "/agent/profile": "Profile",
    "/agent/profile/change-password": "Change Password",
    "/agent/thai-lottery": "Thai Lottery",
    "/agent/kalyan": "Kalyan",
  };

  const currentLabel =
    Object.entries(titleMap).find(
      ([key]) => pathname === key || pathname.startsWith(`${key}/`),
    )?.[1] ?? "Support Agent";

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="hidden w-64 shrink-0 lg:flex">
          <div className="w-full">
            <Sidebar />
          </div>
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-64 border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-900"
          >
            <SheetTitle className="sr-only">Support agent navigation menu</SheetTitle>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-500 dark:text-slate-400"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{currentLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
          <NotificationPopup />
          <FloatingSupportChatButton />
        </div>
      </div>
    </ThemeProvider>
  );
}
