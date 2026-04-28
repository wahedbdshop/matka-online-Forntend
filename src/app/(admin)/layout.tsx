/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import {
  LayoutDashboard,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gamepad2,
  Dices,
  Settings,
  Shield,
  HelpCircle,
  ClipboardList,
  Menu,
  LogOut,
  Bell,
  MessageCircle,
  ChevronDown,
  Trophy,
  History,
  Pencil,
  XCircle,
  Eye,
  ListChecks,
  Plus,
  Percent,
  BellRing,
  MessageSquare,
  UserCog,
  HandCoins,
  BadgeDollarSign,
  CreditCard,
  ArrowLeftRight,
  Gift,
  Clock,
  Lock,
  Trash2,
  Smartphone,
  UserCircle,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ThemeProvider } from "@/providers/theme-provider";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { FloatingAdminChatButton } from "@/components/admin/floating-admin-chat-button";
import { AdminChatNotificationPopup } from "@/components/admin/admin-chat-notification-popup";
import { AuthService } from "@/services/auth.service";
import { clearClientAuthCookies } from "@/lib/auth-cookie";
import {
  ADMIN_CHAT_SEEN_MESSAGES_EVENT,
  getAdminUnreadChatCount,
} from "@/lib/admin-chat-unread";

// ─── Types ────────────────────────────────────────────────────
interface NavChild {
  href?: string;
  icon: any;
  label: string;
  isDynamic?: boolean;
}

interface NavItem {
  href?: string;
  icon: any;
  label: string;
  exact?: boolean;
  children?: NavChild[];
  section?: string; // section divider label above this item
  color?: "purple" | "blue"; // accent color override
}

// ─── Nav Data ─────────────────────────────────────────────────
const navItems: NavItem[] = [
  {
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },

  {
    icon: Users,
    label: "Manage Users",
    children: [
      { href: "/admin/users", icon: Users, label: "All Users" },
      { href: "/admin/users/active", icon: Users, label: "Active Users" },
      { href: "/admin/users/banned", icon: XCircle, label: "Banned Users" },
      {
        href: "/admin/users/email-unverified",
        icon: Shield,
        label: "Email Unverified",
      },
      {
        href: "/admin/users/mobile-unverified",
        icon: Shield,
        label: "Mobile Unverified",
      },
      {
        href: "/admin/users/kyc-unverified",
        icon: Shield,
        label: "KYC Unverified",
      },
      { href: "/admin/users/kyc-pending", icon: Shield, label: "KYC Pending" },
      { href: "/admin/users/with-balance", icon: Users, label: "With Balance" },
      {
        href: "/admin/users/notify-all",
        icon: BellRing,
        label: "Notification to All",
      },
      {
        href: "/admin/users/individual-msg",
        icon: MessageSquare,
        label: "Individual MSG",
      },
    ],
  },

  {
    icon: ArrowDownToLine,
    label: "Deposits",
    children: [
      { href: "/admin/deposits", icon: ListChecks, label: "Deposit Requests" },
      {
        href: "/admin/manual-deposit",
        icon: HandCoins,
        label: "Manual Deposit",
      },
      { href: "/admin/agents", icon: UserCog, label: "Agent Management" },
      {
        href: "/admin/commission",
        icon: BadgeDollarSign,
        label: "Commission Settings",
      },
      {
        href: "/admin/deposits/controls",
        icon: Settings,
        label: "Deposit Controls",
      },
      {
        href: "/admin/sms-auto-deposit",
        icon: Smartphone,
        label: "SMS Auto Deposit",
      },
    ],
  },

  {
    icon: ArrowUpFromLine,
    label: "Withdrawals",
    children: [
      {
        href: "/admin/withdrawals",
        icon: ListChecks,
        label: "Withdrawal Requests",
      },
      {
        href: "/admin/payment-methods",
        icon: CreditCard,
        label: "Payment Methods",
      },
      {
        href: "/admin/withdrawals/controls",
        icon: Settings,
        label: "Withdraw Controls",
      },
    ],
  },

  {
    href: "/admin/user-transactions",
    icon: ReceiptText,
    label: "User Transactions",
    section: "Transfers",
    color: "blue",
    exact: true,
  },

  {
    icon: ArrowLeftRight,
    label: "Transfers",
    color: "blue",
    children: [
      { href: "/admin/transfers", icon: ListChecks, label: "All Transfers" },
      {
        href: "/admin/transfers/charge",
        icon: Percent,
        label: "Charge Settings",
      },
      {
        href: "/admin/transfers/controls",
        icon: Settings,
        label: "Transfer Controls",
      },
    ],
  },

  // ── Kalyan Lottery ───────────────────────────────────────
  {
    icon: Gamepad2,
    label: "Kalyan Lottery",
    section: "Games",
    children: [
      { href: "/admin/kalyan", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/kalyan/lottery-games", icon: ListChecks, label: "Lottery Games" },
      { href: "/admin/kalyan/game-time", icon: Clock, label: "Game Time" },
      { href: "/admin/kalyan/games-rate", icon: Percent, label: "Games Rate" },
      { href: "/admin/kalyan/discount", icon: Percent, label: "Discount" },
      { href: "/admin/kalyan/view-results", icon: Eye, label: "View Results" },
      { href: "/admin/kalyan/add-results", icon: Plus, label: "Add Result" },
      { href: "/admin/kalyan/result-update", icon: Pencil, label: "Result Update" },
      { href: "/admin/kalyan/games-cancel", icon: XCircle, label: "Games Cancel" },
      { href: "/admin/kalyan/win-history", icon: Trophy, label: "Win History" },
      { href: "/admin/kalyan/play-history", icon: History, label: "Play History" },
      { href: "/admin/kalyan/play-remove-history", icon: Trash2, label: "Remove History" },
      { href: "/admin/kalyan/play-cancel-history", icon: XCircle, label: "Cancel History" },
      { href: "/admin/kalyan/games-edit-history", icon: History, label: "Edit History" },
    ],
  },

  // ── Thai Lottery — href আছে তাই label click = All Rounds ──
  {
    icon: Gamepad2,
    label: "Thai Lottery",
    children: [
      {
        href: "/admin/thai-lottery",
        icon: Plus,
        label: "All Rounds",
      },
      {
        href: "/admin/thai-lottery/rounds/create",
        icon: Plus,
        label: "Create Round",
      },
      { isDynamic: true, icon: Gamepad2, label: "Round Pages" },
      {
        href: "/admin/thai-lottery/game-result",
        icon: Trophy,
        label: "Game Result",
      },
      {
        href: "/admin/thai-lottery/public-result",
        icon: Eye,
        label: "Public Result",
      },
      {
        href: "/admin/thai-lottery/win-history",
        icon: Trophy,
        label: "Win History",
      },
      {
        href: "/admin/thai-lottery/play-history",
        icon: History,
        label: "Play History",
      },
      {
        href: "/admin/thai-lottery/removed-history",
        icon: XCircle,
        label: "Removed Bets",
      },
      {
        href: "/admin/thai-lottery/edit-history",
        icon: History,
        label: "Edit History",
      },
      {
        href: "/admin/thai-lottery/edit-number",
        icon: Pencil,
        label: "Edit Number",
      },
      {
        href: "/admin/thai-lottery/bulk-cancel",
        icon: XCircle,
        label: "Cancel Bets",
      },
      {
        href: "/admin/thai-lottery/discount",
        icon: Percent,
        label: "Discount",
      },
    ],
  },

  // ── Ludo Bet ─────────────────────────────────────────────
  {
    icon: Dices,
    label: "Ludo Bet",
    children: [
      { href: "/admin/ludo", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/ludo/matches", icon: ListChecks, label: "All Matches" },
    ],
  },

  {
    icon: Gift,
    label: "Referral",
    section: "Finance",
    children: [
      { href: "/admin/referral", icon: Percent, label: "Commission Settings" },
    ],
  },

      { href: "/admin/kyc", icon: Shield, label: "KYC", section: "Support" },
      { href: "/admin/tickets", icon: HelpCircle, label: "Support" },
      { href: "/admin/support-agents", icon: UserCog, label: "Support Agents" },
      { href: "/admin/audit-logs", icon: ClipboardList, label: "Audit Logs" },
      {
        icon: MessageCircle,
        label: "Live Chat",
        children: [
          { href: "/admin/chat", icon: MessageSquare, label: "Inbox" },
          { href: "/admin/live-chat", icon: Settings, label: "Settings" },
        ],
      },

  {
    icon: Settings,
    label: "Settings",
    children: [
      { href: "/admin/settings", icon: Settings, label: "Site Settings" },
      {
        href: "/admin/home-settings",
        icon: LayoutDashboard,
        label: "Home Settings",
      },
    ],
  },
];

// ─── Admin Profile Dropdown ───────────────────────────────────
function AdminProfileMenu() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      clearClientAuthCookies();
      queryClient.clear();
      useAuthStore.getState().clearAuth();
      router.push("/admin/login");
    },
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
      >
        <Avatar className="h-6 w-6 shrink-0">
          {user?.image && (
            <img
              src={user.image}
              alt="avatar"
              className="h-full w-full object-cover rounded-full"
            />
          )}
          <AvatarFallback className="bg-linear-to-br from-purple-600 to-indigo-600 text-[10px] font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-20 truncate text-xs font-medium text-slate-700 dark:text-slate-300 sm:block">
          {user?.name}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-slate-400 transition-transform duration-200 dark:text-slate-500",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
            {/* user info */}
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700/60">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
              <span className="mt-1 inline-block rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-400 capitalize">
                {user?.role}
              </span>
            </div>

            {/* actions */}
            <div className="space-y-0.5 p-1.5">
              <Link
                href="/admin/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <UserCircle className="h-3.5 w-3.5 text-purple-400" />
                Edit Profile
              </Link>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isLoggingOut ? "Logging out…" : "Logout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dynamic Round Sub-pages ──────────────────────────────────
function DynamicRoundGroup({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose?: () => void;
}) {
  const match = pathname.match(/\/admin\/thai-lottery\/rounds\/([^/]+)/);
  const roundId = match?.[1];

  if (!roundId || roundId === "create") return null;

  const roundPages = [
    {
      href: `/admin/thai-lottery/rounds/${roundId}`,
      icon: Gamepad2,
      label: "Overview",
    },
    {
      href: `/admin/thai-lottery/rounds/${roundId}/close`,
      icon: Clock,
      label: "Close Time",
    },
    {
      href: `/admin/thai-lottery/rounds/${roundId}/control`,
      icon: Lock,
      label: "Control",
    },
    {
      href: `/admin/thai-lottery/rounds/${roundId}/result`,
      icon: Trophy,
      label: "Result",
    },
    {
      href: `/admin/thai-lottery/rounds/${roundId}/bets`,
      icon: ListChecks,
      label: "Bets",
    },
  ];

  return (
    <div className="space-y-0.5">
      <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-600">
        Round Pages
      </p>
      <div className="ml-1 space-y-0.5 border-l border-violet-200 pl-3 dark:border-purple-500/20">
        {roundPages.map((page) => {
          const isActive = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-600 dark:bg-purple-600/15 dark:text-purple-400"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300",
              )}
            >
              <page.icon className="h-3 w-3 shrink-0" />
              <span>{page.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Nav Item Row ─────────────────────────────────────────────
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
  const color = item.color ?? "purple";

  const activeParentBg   = color === "blue" ? "bg-blue-50 border-blue-200 dark:bg-blue-600/20 dark:border-blue-500/30"   : "bg-violet-50 border-violet-200 dark:bg-purple-600/20 dark:border-purple-500/30";
  const activeParentText = color === "blue" ? "text-blue-600 dark:text-blue-400"                        : "text-violet-600 dark:text-purple-400";
  const activeChildBg    = color === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-600/15 dark:text-blue-400"         : "bg-violet-50 text-violet-600 dark:bg-purple-600/15 dark:text-purple-400";
  const borderL          = color === "blue" ? "border-blue-200 dark:border-blue-500/30"                   : "border-slate-200 dark:border-slate-700";

  const isParentActive = item.href
    ? item.exact
      ? pathname === item.href
      : pathname.startsWith(item.href)
    : (item.children?.some((c) =>
        c.href
          ? c.href === "/admin/thai-lottery" || c.href === "/admin/kalyan"
            ? pathname === c.href
            : pathname.startsWith(c.href)
          : c.isDynamic
            ? /\/admin\/thai-lottery\/rounds\/([^/]+)/.test(pathname)
            : false,
      ) ?? false);

  const [open, setOpen] = useState(isParentActive);

  // ── Has children ──────────────────────────────────────────
  if (item.children) {
    return (
      <div>
        {/* Header row */}
        <div
          className={cn(
            "flex rounded-lg border transition-colors",
            isParentActive ? `${activeParentBg}` : "border-transparent",
          )}
        >
          {/* Label: link if href, button otherwise */}
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "flex flex-1 items-center gap-3 px-3 py-2.5 text-sm rounded-l-lg transition-colors",
                isParentActive ? activeParentText : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ) : (
            <button
              onClick={() => setOpen((p) => !p)}
              className={cn(
                "flex flex-1 items-center gap-3 px-3 py-2.5 text-sm rounded-l-lg transition-colors",
                isParentActive ? activeParentText : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )}

          {/* Chevron */}
          <button
            onClick={() => setOpen((p) => !p)}
            className={cn(
              "flex items-center rounded-r-lg border-l border-slate-200 px-2.5 transition-colors dark:border-slate-700/40",
              isParentActive ? activeParentText : "text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white",
            )}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                open ? "rotate-180" : "",
              )}
            />
          </button>
        </div>

        {/* Children */}
        {open && (
          <div className={cn("ml-3 mt-1 space-y-0.5 border-l pl-3", borderL)}>
            {item.children.map((child, idx) => {
              if (child.isDynamic) {
                return (
                  <DynamicRoundGroup
                    key={idx}
                    pathname={pathname}
                    onClose={onClose}
                  />
                );
              }

              const isChildActive =
                child.href !== undefined &&
                (child.href === "/admin/thai-lottery" ||
                child.href === "/admin/kalyan" ||
                child.href === "/admin/ludo"
                  ? pathname === child.href
                  : pathname.startsWith(child.href!));
              const childBadge = child.href === "/admin/chat" ? badge : undefined;

              return (
                <Link
                  key={child.href}
                  href={child.href!}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                    isChildActive
                      ? activeChildBg
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300",
                  )}
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{child.label}</span>
                  {!!childBadge && childBadge > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {childBadge > 99 ? "99+" : childBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Simple link ───────────────────────────────────────────
  return (
    <Link
      href={item.href!}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        isParentActive
          ? `${activeParentBg} border ${activeParentText}`
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const { data: waitingData } = useQuery({
    queryKey: ["waiting-sessions"],
    queryFn: async () => {
      const res = await api.get("/chat/agent/waiting");
      return res.data;
    },
    refetchInterval: 10000,
  });
  const [, refreshUnreadCount] = useReducer((value: number) => value + 1, 0);
  const chatBadge: number = getAdminUnreadChatCount(waitingData?.data ?? []);

  useEffect(() => {
    const refreshCount = () => refreshUnreadCount();

    window.addEventListener(ADMIN_CHAT_SEEN_MESSAGES_EVENT, refreshCount);
    window.addEventListener("storage", refreshCount);

    return () => {
      window.removeEventListener(ADMIN_CHAT_SEEN_MESSAGES_EVENT, refreshCount);
      window.removeEventListener("storage", refreshCount);
    };
  }, []);

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: AuthService.logout,
    onSettled: () => {
      clearAuth();
      router.push("/admin/login");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to log out");
    },
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900">
      {/* ── Logo ── */}
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-900/40">
            M
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">Matka Online</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-600 dark:text-purple-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="hide-scrollbar flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item, idx) => (
          <div key={item.href ?? idx}>
            {item.section && (
              <div className="mt-3 mb-1 flex items-center gap-2 px-2">
                <div className={cn(
                  "h-px flex-1",
                  item.color === "blue" ? "bg-blue-200/70 dark:bg-blue-500/20" : "bg-slate-200 dark:bg-slate-700/60",
                )} />
                <p className={cn(
                  "text-[9px] font-bold uppercase tracking-widest shrink-0",
                  item.color === "blue" ? "text-blue-600/80 dark:text-blue-500/70" : "text-slate-500",
                )}>
                  {item.section}
                </p>
                <div className={cn(
                  "h-px flex-1",
                  item.color === "blue" ? "bg-blue-200/70 dark:bg-blue-500/20" : "bg-slate-200 dark:bg-slate-700/60",
                )} />
              </div>
            )}
            <NavItemRow
              item={item}
              pathname={pathname}
              onClose={onClose}
              badge={
                item.href === "/admin/chat" ||
                item.children?.some((child) => child.href === "/admin/chat")
                  ? chatBadge
                  : undefined
              }
            />
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-700/60">
        <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700/40">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-linear-to-br from-purple-600 to-indigo-600 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {user?.name}
            </p>
            <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-7 w-7 text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const currentLabel = (() => {
    // Round sub-pages
    const roundMatch = pathname.match(
      /\/admin\/thai-lottery\/rounds\/([^/]+)(?:\/(.+))?/,
    );
    if (roundMatch && roundMatch[1] !== "create") {
      const sub = roundMatch[2];
      const subLabel = sub
        ? sub.charAt(0).toUpperCase() + sub.slice(1)
        : "Overview";
      return `Thai Lottery — Round ${subLabel}`;
    }

    for (const item of navItems) {
      if (item.children) {
        for (const child of item.children) {
          if (!child.href || child.isDynamic) continue;
          if (pathname === child.href) return `${item.label} — ${child.label}`;
          if (
            child.href !== "/admin/thai-lottery" &&
            child.href !== "/admin/kalyan" &&
            pathname.startsWith(child.href)
          ) {
            return `${item.label} — ${child.label}`;
          }
        }
        if (item.href && pathname.startsWith(item.href)) return item.label;
      } else {
        const match =
          item.href &&
          (item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href));
        if (match) return item.label;
      }
    }
    return "Admin";
  })();

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
        <div className="hidden w-56 shrink-0 lg:flex">
          <div className="w-full">
            <Sidebar />
          </div>
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="left"
            className="w-56 border-slate-200 bg-slate-50 p-0 dark:border-slate-700 dark:bg-slate-900"
          >
            <SheetTitle className="sr-only">Admin navigation menu</SheetTitle>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-slate-500 dark:text-slate-400 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
                {currentLabel}
              </h1>
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
              <AdminProfileMenu />
            </div>
          </header>

          <main
            className={cn(
              "hide-scrollbar flex-1 overflow-y-auto",
              pathname === "/admin/chat" ? "bg-slate-50 p-2 dark:bg-slate-950 lg:p-3" : "bg-slate-100 p-4 dark:bg-slate-950 lg:p-6",
            )}
          >
            {children}
          </main>
          <AdminChatNotificationPopup />
          {pathname !== "/admin/chat" && <FloatingAdminChatButton />}
        </div>
      </div>
    </ThemeProvider>
  );
}
