"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, MailCheck, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const VERIFICATION_MESSAGE =
  "Your email is not verified! Please verify your email first to unlock all features.";
const CODE_TTL_SECONDS = 5 * 60;

function isRestrictedPath(pathname: string) {
  if (pathname === "/deposit" || pathname === "/withdrawal") return true;
  if (pathname === "/thai-lottery") return true;
  if (pathname === "/games" || pathname.startsWith("/games/ludo")) return true;

  if (pathname === "/kalyan") return true;
  if (/^\/kalyan\/[^/]+(?:\/[^/]+)?$/.test(pathname)) {
    return ![
      "/kalyan/result",
      "/kalyan/bet-history",
      "/kalyan/win-history",
      "/kalyan/game-rate",
    ].some((safePath) => pathname.startsWith(safePath));
  }

  return false;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function EmailVerificationGate() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [open, setOpen] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const isUnverifiedUser = Boolean(user && !user.emailVerified);
  const shouldPromptForPath = useMemo(
    () => isUnverifiedUser && isRestrictedPath(pathname),
    [isUnverifiedUser, pathname],
  );

  useEffect(() => {
    if (shouldPromptForPath) {
      setOpen(true);
    }
  }, [shouldPromptForPath]);

  useEffect(() => {
    const handleRequired = () => {
      if (isUnverifiedUser) {
        setOpen(true);
      }
    };

    window.addEventListener("email-verification-required", handleRequired);
    return () => {
      window.removeEventListener("email-verification-required", handleRequired);
    };
  }, [isUnverifiedUser]);

  useEffect(() => {
    if (!codeSent || remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [codeSent, remainingSeconds]);

  useEffect(() => {
    if (user?.emailVerified) {
      setOpen(false);
      setCodeSent(false);
      setOtp("");
      setRemainingSeconds(0);
    }
  }, [user?.emailVerified]);

  const sendCode = async () => {
    if (!user?.email) return;

    setIsSending(true);
    try {
      await AuthService.resendVerification(user.email);
      setCodeSent(true);
      setRemainingSeconds(CODE_TTL_SECONDS);
      setOtp("");
      toast.success("Verification code sent to your email");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send code");
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (!user?.email || otp.trim().length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setIsVerifying(true);
    try {
      await AuthService.verifyEmail({ email: user.email, otp: otp.trim() });
      updateUser({ emailVerified: true, status: "ACTIVE" });
      toast.success("Email verified successfully!");
    } catch (error: any) {
      setRemainingSeconds(0);
      toast.error(
        error.response?.data?.message ||
          "Invalid or expired code. Please resend code.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isUnverifiedUser) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-white text-slate-950 dark:bg-slate-900 dark:text-white">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <DialogTitle>Email verification required</DialogTitle>
          <DialogDescription>{VERIFICATION_MESSAGE}</DialogDescription>
        </DialogHeader>

        {!codeSent ? (
          <Button onClick={sendCode} disabled={isSending} className="w-full">
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MailCheck className="h-4 w-4" />
            )}
            Verify Now
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-xl tracking-widest"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Code expires in {formatTime(remainingSeconds)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={sendCode}
                disabled={isSending || remainingSeconds > 0}
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Resend Code
              </Button>
            </div>
            <Button
              onClick={verifyCode}
              disabled={isVerifying || remainingSeconds <= 0}
              className="w-full"
            >
              {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
