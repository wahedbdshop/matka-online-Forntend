"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth.store";

interface NotificationPayload {
  title?: string;
  message?: string;
  body?: string;
}

function shouldSuppressNotificationPopup(title: string, message: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedMessage = message.trim().toLowerCase();

  return (
    normalizedTitle.includes("bet placed successfully") ||
    (normalizedMessage.includes("your kalyan bet") &&
      normalizedMessage.includes("has been placed")) ||
    normalizedMessage.includes("bet has been placed")
  );
}

export function NotificationPopup() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const { isConnected, onEvent, emitEvent } = useSocket();

  useEffect(() => {
    if (!isConnected || !user?.id) return;
    emitEvent("join_notification_room", { userId: user.id });
  }, [isConnected, user?.id, emitEvent]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = onEvent("new_notification", (data: NotificationPayload) => {
      const title = data.title ?? "নতুন বার্তা";
      const message = data.message ?? data.body ?? "";
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (shouldSuppressNotificationPopup(title, message)) {
        return;
      }
    });

    return unsub;
  }, [onEvent, isAuthenticated, queryClient]);

  return null;
}
