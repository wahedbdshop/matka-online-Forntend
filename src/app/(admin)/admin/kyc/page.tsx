/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminService } from "@/services/admin.service";

export default function AdminKycPage() {
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    id: string;
    user: string;
    type: "VERIFIED" | "REJECTED";
  }>({ open: false, id: "", user: "", type: "VERIFIED" });
  const [reviewNote, setReviewNote] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: () => AdminService.getPendingKyc(),
  });

  const { mutate: reviewKyc, isPending } = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: "VERIFIED" | "REJECTED";
      note?: string;
    }) => AdminService.reviewKyc(id, status, note),
    onSuccess: () => {
      toast.success("KYC reviewed");
      setReviewDialog((prev) => ({ ...prev, open: false }));
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to review KYC");
    },
  });

  const kycs = data?.data?.kycs || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">KYC Verification</h1>
        <Badge className="bg-yellow-500/20 text-yellow-400">
          {kycs.length} pending
        </Badge>
      </div>

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 bg-slate-700" />
        ))
      ) : kycs.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-400">No pending KYC requests</p>
          </CardContent>
        </Card>
      ) : (
        kycs.map((kyc: any) => (
          <Card key={kyc.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-medium">{kyc.user?.username}</p>
                  <p className="text-slate-400 text-xs">
                    {kyc.user?.email}
                  </p>
                  <p className="text-slate-400 text-xs">
                    Doc: {kyc.documentType || "Not specified"}
                  </p>
                  {kyc.nidNumber && (
                    <p className="text-slate-400 text-xs">
                      NID: {kyc.nidNumber}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs">
                    Submitted:{" "}
                    {kyc.submittedAt
                      ? new Date(kyc.submittedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() =>
                      setReviewDialog({
                        open: true,
                        id: kyc.id,
                        user: kyc.user?.name,
                        type: "VERIFIED",
                      })
                    }
                    className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setReviewDialog({
                        open: true,
                        id: kyc.id,
                        user: kyc.user?.name,
                        type: "REJECTED",
                      })
                    }
                    className="bg-red-600 hover:bg-red-700 h-8 text-xs"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.type === "VERIFIED" ? "Verify" : "Reject"} KYC —{" "}
              {reviewDialog.user}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Review note (optional)"
              className="bg-slate-700/50 border-slate-600 text-white"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setReviewDialog((prev) => ({ ...prev, open: false }))
                }
                className="flex-1 border border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  reviewKyc({
                    id: reviewDialog.id,
                    status: reviewDialog.type,
                    note: reviewNote || undefined,
                  })
                }
                disabled={isPending}
                className={
                  reviewDialog.type === "VERIFIED"
                    ? "flex-1 bg-green-600 hover:bg-green-700"
                    : "flex-1 bg-red-600 hover:bg-red-700"
                }
              >
                {isPending ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
