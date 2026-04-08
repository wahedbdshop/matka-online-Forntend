/* eslint-disable @typescript-eslint/no-explicit-any */
// admin/users/notify-all/page.tsx
"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function NotifyAllPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => AdminService.sendNotificationToAll({ title, message }),
    onSuccess: () => {
      toast.success("Notification sent to all users");
      setTitle("");
      setMessage("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
          <Bell className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Notification to All</h1>
          <p className="text-xs text-slate-400">
            Send a notification to all users at once
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message..."
            rows={5}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-400/80">
          Warning: this notification will be sent to every registered user.
        </div>

        <button
          onClick={() => send()}
          disabled={isPending || !title.trim() || !message.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPending ? "Sending..." : "Send to All Users"}
        </button>
      </div>
    </div>
  );
}
