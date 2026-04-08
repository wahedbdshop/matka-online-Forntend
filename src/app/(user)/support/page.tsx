/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  HelpCircle,
  MessageCircle,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  ANSWERED: "bg-green-500/15  text-green-400  border-green-500/30",
  CLOSED: "bg-slate-500/15  text-slate-300  border-slate-500/30",
};

export default function SupportPage() {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => api.get("/support/my-tickets").then((r) => r.data?.data),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api
        .post("/support/tickets", { subject, message, type: "SUPPORT" })
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Ticket submitted successfully");
      setSubject("");
      setMessage("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: () => toast.error("Failed to submit ticket"),
  });

  const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Support</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Get help from our team
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Ticket
        </button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Submit a Ticket</h2>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
              disabled={isPending || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-10 text-center">
          <HelpCircle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No support tickets yet</p>
          <p className="text-slate-500 text-xs mt-1">
            Click New Ticket to get help
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === ticket.id ? null : ticket.id)
                }
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-orange-500/10">
                    <MessageCircle className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      STATUS_STYLE[ticket.status] ?? "",
                    )}
                  >
                    {ticket.status}
                  </span>
                  {expanded === ticket.id ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {expanded === ticket.id && (
                <div className="border-t border-slate-700/50 px-4 py-3 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 mb-1">
                      Your Message
                    </p>
                    <p className="text-sm text-slate-300">{ticket.message}</p>
                  </div>

                  {ticket.adminReply && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-[10px] uppercase text-green-400 mb-1">
                        Admin Reply
                      </p>
                      <p className="text-sm text-slate-300">
                        {ticket.adminReply}
                      </p>
                      {ticket.repliedAt && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(ticket.repliedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
