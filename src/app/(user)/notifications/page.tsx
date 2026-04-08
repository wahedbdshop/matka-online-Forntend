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

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [pendingReadIds, setPendingReadIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationService.getAll(1, 50),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: NotificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
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
      return "bg-green-500/20 text-green-400";
    if (type.includes("REJECTED") || type.includes("LOST"))
      return "bg-red-500/20 text-red-400";
    if (type.includes("PENDING")) return "bg-yellow-500/20 text-yellow-400";
    return "bg-purple-500/20 text-purple-400";
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
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            className="text-purple-400 hover:text-purple-300"
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-slate-700" />
        ))
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Bell className="h-12 w-12 mb-3 opacity-50" />
          <p>No notifications yet</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const isRead = notification.isRead || pendingReadIds.includes(notification.id);

          return (
            <Card
              key={notification.id}
              className={cn(
                "border-slate-700 cursor-pointer transition-all",
                isRead
                  ? "bg-slate-800/30"
                  : "bg-slate-800/70 border-purple-500/30",
              )}
              onClick={() => void handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-2 h-2 w-2 flex-shrink-0 rounded-full",
                      isRead ? "bg-slate-600" : "bg-purple-500",
                    )}
                  />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-medium text-sm">
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
                  <p className="text-slate-400 text-xs mt-1">
                    {notification.message}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-1">
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
