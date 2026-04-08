/* eslint-disable @typescript-eslint/no-explicit-any */
// admin/users/individual-msg/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Search, Send } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function IndividualMsgPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-search", search],
    queryFn: () =>
      AdminService.getUsers({ search: search || undefined, limit: 10 }),
    enabled: search.length > 1,
  });

  const users = usersData?.data?.users ?? [];
  const selectedUser = users.find((u: any) => u.id === selectedId);

  const { mutate: send, isPending } = useMutation({
    mutationFn: () =>
      AdminService.sendNotificationToUser(selectedId, { title, message }),
    onSuccess: () => {
      toast.success("Message sent");
      setTitle("");
      setMessage("");
      setSelectedId("");
      setSearch("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
          <MessageSquare className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Individual Message</h1>
          <p className="text-xs text-slate-400">
            Send a notification to a specific user
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
        {/* User Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Select User
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId("");
              }}
              placeholder="Search by name, email, username..."
              className="w-full rounded-lg border border-slate-600 bg-slate-700 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
            />
          </div>

          {/* Search Results */}
          {users.length > 0 && !selectedId && (
            <div className="rounded-lg border border-slate-600 bg-slate-900 divide-y divide-slate-700 max-h-48 overflow-y-auto">
              {users.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedId(u.id);
                    setSearch(u.name);
                  }}
                  className="w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors"
                >
                  <p className="text-xs font-medium text-white">{u.name}</p>
                  <p className="text-[10px] text-slate-500">
                    @{u.username} · {u.email}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUser && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">
                  {selectedUser.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  @{selectedUser.username}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedId("");
                  setSearch("");
                }}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Message title..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message content..."
            rows={4}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <button
          onClick={() => send()}
          disabled={
            isPending || !selectedId || !title.trim() || !message.trim()
          }
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}
