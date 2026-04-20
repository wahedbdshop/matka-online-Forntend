/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [replyDialog, setReplyDialog] = useState<{
    open: boolean;
    id: string;
    subject: string;
    message: string;
    user: string;
  }>({ open: false, id: "", subject: "", message: "", user: "" });
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", activeTab],
    queryFn: () =>
      AdminService.getTickets({
        status: activeTab === "ALL" ? undefined : activeTab,
      }),
  });

  const { mutate: replyTicket, isPending: isReplying } = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      AdminService.replyTicket(id, reply),
    onSuccess: () => {
      toast.success("Reply sent");
      setReplyDialog((prev) => ({ ...prev, open: false }));
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reply");
    },
  });

  const { mutate: closeTicket } = useMutation({
    mutationFn: AdminService.closeTicket,
    onSuccess: () => {
      toast.success("Ticket closed");
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  const tickets = data?.data?.tickets || [];

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-500/20 text-yellow-400",
    ANSWERED: "bg-blue-500/20 text-blue-400",
    CLOSED: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-white text-xl font-bold">Support Tickets</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800">
          {["PENDING", "ANSWERED", "CLOSED", "ALL"].map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-slate-700" />
            ))
          ) : tickets.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No tickets found</p>
          ) : (
            tickets.map((ticket: any) => (
              <Card
                key={ticket.id}
                className="bg-slate-800/50 border-slate-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm">
                          {ticket.subject}
                        </p>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            statusColor[ticket.status],
                          )}
                        >
                          {ticket.status}
                        </Badge>
                        <Badge className="text-[10px] bg-slate-700 text-slate-300">
                          {ticket.type}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {ticket.user?.username}
                      </p>
                      <p className="text-slate-500 text-xs line-clamp-2 mt-1">
                        {ticket.message}
                      </p>
                    </div>
                  </div>

                  {ticket.adminReply && (
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-2">
                      <p className="text-blue-300 text-xs">Admin reply:</p>
                      <p className="text-slate-300 text-xs">
                        {ticket.adminReply}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    {ticket.status !== "CLOSED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            setReplyDialog({
                              open: true,
                              id: ticket.id,
                              subject: ticket.subject,
                              message: ticket.message,
                              user: ticket.user?.name,
                            })
                          }
                          className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                        >
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => closeTicket(ticket.id)}
                          className="border border-slate-600 h-8 text-xs text-slate-300"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Close
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog
        open={replyDialog.open}
        onOpenChange={(open) => setReplyDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Reply to {replyDialog.user}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-700/50">
              <p className="text-slate-400 text-xs">{replyDialog.subject}</p>
              <p className="text-slate-300 text-sm mt-1">
                {replyDialog.message}
              </p>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="bg-slate-700/50 border-slate-600 text-white resize-none"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setReplyDialog((prev) => ({ ...prev, open: false }))
                }
                className="flex-1 border border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  replyTicket({ id: replyDialog.id, reply: replyText })
                }
                disabled={isReplying || !replyText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isReplying ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
