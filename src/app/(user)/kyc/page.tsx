/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Camera,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  NOT_SUBMITTED: {
    icon: AlertCircle,
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
    label: "Not Submitted",
    desc: "Submit your documents to verify your identity",
  },
  PENDING: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    label: "Under Review",
    desc: "Your documents are being reviewed. This may take 24-48 hours.",
  },
  VERIFIED: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    label: "Verified",
    desc: "Your identity has been successfully verified.",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Rejected",
    desc: "Your documents were rejected. Please resubmit.",
  },
};

const DOC_TYPES = [
  { value: "NID", label: "National ID Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING", label: "Driving License" },
];

// ─── Image Upload Box ─────────────────────────────────────────
function UploadBox({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File) => void;
}) {
  return (
    <label className="cursor-pointer block">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors overflow-hidden",
          preview
            ? "border-blue-500/40"
            : "border-slate-600 hover:border-slate-500",
        )}
      >
        {preview ? (
          <div className="relative h-36 w-full">
            <Image
              src={preview}
              alt={label}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-36 gap-2">
            <Upload className="h-6 w-6 text-slate-500" />
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-[10px] text-slate-600">JPG, PNG — max 5MB</p>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
        }}
      />
    </label>
  );
}

// ─── File to base64 ───────────────────────────────────────────
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Main Page ────────────────────────────────────────────────
export default function KycPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState("NID");
  const [nidNumber, setNidNumber] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => api.get("/kyc").then((r) => r.data?.data),
  });

  const kyc = data;
  const kycStatus = kyc?.status ?? "NOT_SUBMITTED";
  const config = STATUS_CONFIG[kycStatus as keyof typeof STATUS_CONFIG];
  const Icon = config.icon;

  const handleFile = async (
    file: File,
    setFile: (f: File) => void,
    setPreview: (p: string) => void,
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — max 5MB");
      return;
    }
    setFile(file);
    const preview = await toBase64(file);
    setPreview(preview);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!frontFile) throw new Error("Front image required");

      const formData = new FormData();
      formData.append("documentType", docType);
      formData.append("nidNumber", nidNumber);
      formData.append("frontImage", frontFile);
      if (backFile) formData.append("backImage", backFile);
      if (selfieFile) formData.append("selfieImage", selfieFile);

      return api
        .post("/kyc/submit", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      toast.success("KYC documents submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["kyc-status"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Submission failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-lg">
        <div className="h-8 w-40 rounded bg-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">KYC Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify your identity to unlock full features
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div
        className={cn(
          "rounded-2xl border p-4 flex items-start gap-3",
          config.bg,
        )}
      >
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
        <div>
          <p className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{config.desc}</p>
          {kycStatus === "REJECTED" && kyc?.reviewNote && (
            <p className="text-xs text-red-400 mt-2 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
              Reason: {kyc.reviewNote}
            </p>
          )}
        </div>
      </div>

      {/* Already verified */}
      {kycStatus === "VERIFIED" && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-center space-y-2">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
          <p className="text-white font-semibold">Identity Verified</p>
          <p className="text-xs text-slate-400">
            Verified on{" "}
            {kyc?.reviewedAt
              ? new Date(kyc.reviewedAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
      )}

      {/* Pending */}
      {kycStatus === "PENDING" && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center space-y-2">
          <Clock className="h-10 w-10 text-yellow-400 mx-auto animate-pulse" />
          <p className="text-white font-semibold">Documents Under Review</p>
          <p className="text-xs text-slate-400">
            Submitted on{" "}
            {kyc?.submittedAt
              ? new Date(kyc.submittedAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
      )}

      {/* Form — show if not submitted or rejected */}
      {(kycStatus === "NOT_SUBMITTED" || kycStatus === "REJECTED") && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              Submit Documents
            </h2>
          </div>

          {/* Document Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Document Type</label>
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDocType(d.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    docType === d.value
                      ? "border-blue-500 bg-blue-500/20 text-blue-400"
                      : "border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* NID / Doc Number */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Document Number</label>
            <input
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value)}
              placeholder="Enter your document number"
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </div>

          {/* Image uploads */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Document Images</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">Front Side *</p>
                <UploadBox
                  label="Upload Front"
                  preview={frontPreview}
                  onChange={(f) => handleFile(f, setFrontFile, setFrontPreview)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">Back Side</p>
                <UploadBox
                  label="Upload Back"
                  preview={backPreview}
                  onChange={(f) => handleFile(f, setBackFile, setBackPreview)}
                />
              </div>
            </div>
          </div>

          {/* Selfie */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center gap-1">
              <Camera className="h-3 w-3" /> Selfie with Document
              <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <UploadBox
              label="Upload Selfie holding your document"
              preview={selfiePreview}
              onChange={(f) => handleFile(f, setSelfieFile, setSelfiePreview)}
            />
          </div>

          <button
            onClick={() => mutate()}
            disabled={isPending || !frontFile || !nidNumber.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" /> Submit for Verification
              </>
            )}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400">Why verify?</p>
        {[
          "Higher withdrawal limits",
          "Enhanced account security",
          "Access to all platform features",
          "Faster transaction processing",
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
