"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationService } from "@/services/notification.service";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { toast } from "sonner";
import { useLanguage } from "@/providers/language-provider";

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export default function NotificationsPage() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);
  const text = {
    en: {
      title: "Notifications",
      markAllRead: "Mark all read",
      markedAllRead: "All notifications marked as read",
      empty: "No notifications yet",
    },
    bn: {
      title: "নোটিফিকেশন",
      markAllRead: "সব রিড করুন",
      markedAllRead: "সব নোটিফিকেশন রিড করা হয়েছে",
      empty: "এখনও কোনো নোটিফিকেশন নেই",
    },
    hi: {
      title: "नोटिफिकेशन",
      markAllRead: "सभी पढ़ें",
      markedAllRead: "सभी नोटिफिकेशन पढ़े गए",
      empty: "अभी कोई नोटिफिकेशन नहीं है",
    },
  }[language];

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationService.getAll(1, 50),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: NotificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(text.markedAllRead);
    },
  });

  const { mutateAsync: markRead } = useMutation({
    mutationFn: NotificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notificationsData = data?.data as NotificationsResponse | undefined;
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notificationsData?.unreadCount ?? 0;

  const getNotificationColor = (type: string) => {
    if (type.includes("APPROVED") || type.includes("WON"))
      return "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-green-500/20 dark:text-green-400";
    if (type.includes("REJECTED") || type.includes("LOST"))
      return "border border-red-200 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/20 dark:text-red-400";
    if (type.includes("PENDING"))
      return "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/20 dark:bg-yellow-500/20 dark:text-yellow-400";
    return "border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/20 dark:bg-purple-500/20 dark:text-purple-400";
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.isRead || pendingReadIds.includes(notification.id)) {
      return;
    }

    setPendingReadIds((current) => [...current, notification.id]);

    try {
      await markRead(notification.id);
    } finally {
      setPendingReadIds((current) =>
        current.filter((id) => id !== notification.id),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-slate-950 text-xl font-bold dark:text-white">{text.title}</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            className="text-violet-600 hover:text-violet-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            {text.markAllRead}
          </Button>
        )}
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-200 dark:bg-slate-700" />
        ))
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Bell className="h-12 w-12 mb-3 opacity-50" />
          <p>{text.empty}</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const isRead = notification.isRead || pendingReadIds.includes(notification.id);

          return (
            <Card
              key={notification.id}
              className={cn(
                "cursor-pointer overflow-hidden rounded-2xl border transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)] dark:shadow-none",
                isRead
                  ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/30"
                  : "border-violet-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 dark:border-purple-500/30 dark:from-slate-800/70 dark:via-slate-800/70 dark:to-slate-900/70",
              )}
              onClick={() => void handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-2 h-2 w-2 flex-shrink-0 rounded-full",
                      isRead ? "bg-slate-300 dark:bg-slate-600" : "bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)] dark:bg-purple-500",
                    )}
                  />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-950 font-semibold text-sm dark:text-white">
                      {notification.title}
                    </p>
                    <Badge
                      className={cn(
                        "text-[10px] flex-shrink-0",
                        getNotificationColor(notification.type),
                      )}
                    >
                      {notification.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 dark:text-slate-400">
                    {notification.message}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-1 dark:text-slate-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
