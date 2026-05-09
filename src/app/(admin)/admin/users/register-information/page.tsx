"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Globe,
  Loader2,
  LogOut,
  MapPin,
  Monitor,
  MoreHorizontal,
  Search,
  ShieldBan,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AdminService,
  type AdminUserRegisterInfo,
} from "@/services/admin.service";

const LIMIT = 20;

const STATUS_OPTIONS = [
  { label: "All Status", value: "ALL" },
  { label: "Online", value: "ONLINE" },
  { label: "Offline", value: "OFFLINE" },
  { label: "Blocked", value: "BLOCKED" },
  { label: "Suspended", value: "SUSPENDED" },
] as const;

const DEVICE_OPTIONS = [
  { label: "All Devices", value: "ALL" },
  { label: "Desktop", value: "Desktop" },
  { label: "Mobile", value: "Mobile" },
  { label: "Tablet", value: "Tablet" },
] as const;

const statusClassNames: Record<string, string> = {
  ONLINE:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  OFFLINE:
    "border-slate-300 bg-slate-200/70 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  BLOCKED:
    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  SUSPENDED:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getLocalDateInputValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getUserInitials(user: AdminUserRegisterInfo) {
  const source = user.name?.trim() || user.username?.trim() || "U";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function ActionMenu({
  user,
  isActing,
  onToggleBlock,
  onForceLogout,
}: {
  user: AdminUserRegisterInfo;
  isActing: boolean;
  onToggleBlock: () => void;
  onForceLogout: () => void;
}) {
  const isBlocked = user.status === "BLOCKED";

  return (
    <details className="group relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white">
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
        <Link
          href={`/admin/users/${user.id}`}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Link>
        <Link
          href={`/admin/users/${user.id}/login-history`}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Globe className="h-3.5 w-3.5" />
          View Login History
        </Link>
        <button
          type="button"
          disabled={isActing}
          onClick={onForceLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-amber-600 transition hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Force Logout
        </button>
        <button
          type="button"
          disabled={isActing}
          onClick={onToggleBlock}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          {isBlocked ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <ShieldBan className="h-3.5 w-3.5" />
          )}
          {isBlocked ? "Unblock User" : "Block User"}
        </button>
      </div>
    </details>
  );
}

export default function UserRegisterInformationPage() {
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateInputValue());
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("ALL");
  const [deviceType, setDeviceType] =
    useState<(typeof DEVICE_OPTIONS)[number]["value"]>("ALL");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const deferredCountry = useDeferredValue(country);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: [
      "admin-user-register-information",
      selectedDate,
      deferredSearch,
      deferredCountry,
      status,
      page,
    ],
    queryFn: () =>
      AdminService.getUserRegisterInformation({
        page,
        limit: LIMIT,
        search: deferredSearch || undefined,
        country: deferredCountry || undefined,
        status: status === "ALL" ? undefined : status,
        date: selectedDate,
      }),
  });

  const refreshQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-register-information"],
    });
    void queryClient.invalidateQueries({ queryKey: ["admin-users-all"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-users-active"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-users-banned"] });
  };

  const { mutate: banUser, isPending: isBanning } = useMutation({
    mutationFn: (userId: string) => AdminService.banUser(userId),
    onSuccess: () => {
      toast.success("User blocked successfully");
      refreshQueries();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to block user"),
  });

  const { mutate: unbanUser, isPending: isUnbanning } = useMutation({
    mutationFn: (userId: string) => AdminService.unbanUser(userId),
    onSuccess: () => {
      toast.success("User unblocked successfully");
      refreshQueries();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to unblock user"),
  });

  const { mutate: forceLogoutUser, isPending: isForceLoggingOut } = useMutation({
    mutationFn: (userId: string) => AdminService.forceLogoutUser(userId),
    onSuccess: () => {
      toast.success("User logged out from all devices");
      refreshQueries();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to force logout user"),
  });

  const serverUsers = data?.data?.users ?? [];
  const users = useMemo(() => {
    if (deviceType === "ALL") return serverUsers;
    return serverUsers.filter((user) => user.deviceType === deviceType);
  }, [deviceType, serverUsers]);

  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const summary = data?.data?.summary;
  const errorMessage =
    (error as any)?.response?.data?.message ||
    (error as Error | undefined)?.message ||
    "Failed to load user register information";

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,210px)_minmax(0,180px)_minmax(0,180px)]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, username, phone, IP, browser..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by country"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-900 outline-none transition [color-scheme:light] focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:relative [&::-webkit-calendar-picker-indicator]:z-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          />
          <button
            type="button"
            onClick={openDatePicker}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Open date picker"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </label>

        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]["value"]);
              setPage(1);
            }}
            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <Monitor className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={deviceType}
            onChange={(e) =>
              setDeviceType(
                e.target.value as (typeof DEVICE_OPTIONS)[number]["value"],
              )
            }
            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            {DEVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              User Register Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary?.selectedDate || selectedDate} date-e total {total} users found
            </p>
          </div>
          {isFetching && !isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Refreshing
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/70">
                {[
                  "SI No",
                  "User Name",
                  "Email",
                  "Phone Number",
                  "Country",
                  "Device Type",
                  "Device Name",
                  "IP Address",
                  "Account Created At",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-900">
                    {Array.from({ length: 11 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-rose-500">
                    {errorMessage}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No matching user register information found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const rowNumber = (page - 1) * LIMIT + index + 1;
                  const isActing =
                    isBanning || isUnbanning || isForceLoggingOut;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-900 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {rowNumber}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                            <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {user.phone || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {user.country || "-"}
                        </p>
                        <p className="max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-400">
                          {user.location || "Location unavailable"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                          {user.deviceType}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {user.deviceName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {user.browser || "Unknown browser"} / {user.os || "Unknown OS"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-cyan-300">
                          {user.ipAddress || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatDateTime(user.accountCreatedAt)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Last login: {formatDateTime(user.latestLoginAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[user.status]}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ActionMenu
                          user={user}
                          isActing={isActing}
                          onToggleBlock={() => {
                            const ok = window.confirm(
                              user.status === "BLOCKED"
                                ? "Unblock this user?"
                                : "Block this user?",
                            );
                            if (!ok) return;
                            if (user.status === "BLOCKED") unbanUser(user.id);
                            else banUser(user.id);
                          }}
                        onForceLogout={() => {
                          const ok = window.confirm(
                            "Force logout this user from all active devices?",
                          );
                          if (!ok) return;
                          forceLogoutUser(user.id);
                        }}
                      />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            : null}

          {!isLoading && isError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !isError && users.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No matching user register information found
            </div>
          ) : null}

          {!isLoading && !isError
            ? users.map((user, index) => {
                const rowNumber = (page - 1) * LIMIT + index + 1;
                const isActing =
                  isBanning || isUnbanning || isForceLoggingOut;

                return (
                  <div
                    key={user.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-12 w-12 border border-slate-200 dark:border-slate-700">
                          <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">
                            {rowNumber}. {user.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            @{user.username} • {user.email}
                          </p>
                        </div>
                      </div>
                      <ActionMenu
                        user={user}
                        isActing={isActing}
                        onToggleBlock={() => {
                          const ok = window.confirm(
                            user.status === "BLOCKED"
                              ? "Unblock this user?"
                              : "Block this user?",
                          );
                          if (!ok) return;
                          if (user.status === "BLOCKED") unbanUser(user.id);
                          else banUser(user.id);
                        }}
                        onForceLogout={() => {
                          const ok = window.confirm(
                            "Force logout this user from all active devices?",
                          );
                          if (!ok) return;
                          forceLogoutUser(user.id);
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Phone Number", user.phone || "-"],
                        ["Country", user.country || "-"],
                        ["Location", user.location || "Location unavailable"],
                        ["Device Type", user.deviceType],
                        ["Device Name", user.deviceName],
                        [
                          "Browser / OS",
                          `${user.browser || "Unknown browser"} / ${user.os || "Unknown OS"}`,
                        ],
                        ["IP Address", user.ipAddress || "-"],
                        ["Account Created At", formatDateTime(user.accountCreatedAt)],
                        ["Latest Login", formatDateTime(user.latestLoginAt)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {label}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassNames[user.status]}`}
                      >
                        {user.status}
                      </span>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
                      >
                        Open full profile
                      </Link>
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
