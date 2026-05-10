"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Crown, Loader2, Swords, X } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import {
  LudoService,
  type LudoInviteEventPayload,
} from "@/services/ludo.service";
import { useAuthStore } from "@/store/auth.store";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!
      .data!.message!;
  }

  return fallback;
};

export function LudoInvitePopup() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { onEvent } = useSocket();
  const [invite, setInvite] = useState<LudoInviteEventPayload | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    if (isAuthenticated) return;
    setInvite(null);
    setTimeLeftMs(0);
  }, [isAuthenticated]);

  useEffect(() => {
    setInvite(null);
    setTimeLeftMs(0);
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const offInvite = onEvent("ludo:invite", (payload: LudoInviteEventPayload) => {
      setInvite(payload);
      setTimeLeftMs(
        Math.max(0, new Date(payload.expiresAt).getTime() - Date.now()),
      );
    });

    return offInvite;
  }, [isAuthenticated, onEvent]);

  useEffect(() => {
    if (!invite) return;

    const syncCountdown = () => {
      const remaining = Math.max(
        0,
        new Date(invite.expiresAt).getTime() - Date.now(),
      );
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        setInvite(null);
      }
    };

    syncCountdown();
    const timer = setInterval(syncCountdown, 1000);

    return () => clearInterval(timer);
  }, [invite]);

  const respondMutation = useMutation({
    mutationFn: async (accept: boolean) => {
      if (!invite) {
        throw new Error("No invite found");
      }

      return LudoService.respondToInvite(invite.inviteId, { accept });
    },
    onSuccess: (response, accepted) => {
      const roomId = response.data?.roomId;
      setInvite(null);

      if (accepted && roomId) {
        toast.success("Ludo invite accepted");
        router.replace(`/games/ludo/room/${roomId}`);
        return;
      }

      toast(accepted ? "Invite processed" : "Invite declined");
    },
    onError: (error) => {
      setInvite(null);
      toast.error(getErrorMessage(error, "Failed to process Ludo invite"));
    },
  });

  const stakeLabel = useMemo(() => {
    if (!invite) return "";
    if (invite.isFree || Number(invite.stakeAmount) <= 0) {
      return "Free Play";
    }

    return `Tk ${Number(invite.stakeAmount).toLocaleString("en-BD")}`;
  }, [invite]);

  const countdownLabel = useMemo(() => {
    const seconds = Math.max(0, Math.ceil(timeLeftMs / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [timeLeftMs]);

  if (!invite) return null;

  return (
    <div className="fixed inset-x-4 top-24 z-[10002] mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-emerald-400/30 dark:bg-[#120d29]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_58%)] px-5 py-4 dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_58%)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 dark:border-emerald-400/35 dark:bg-emerald-500/10">
                <Crown className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Ludo Invite
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">Expires in {countdownLabel}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => respondMutation.mutate(false)}
              disabled={respondMutation.isPending}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
              aria-label="Close invite"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-base font-black text-slate-900 dark:text-white">
              {invite.inviter.name || invite.inviter.username}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              @{invite.inviter.username} invited you to play Ludo.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
                {stakeLabel}
              </span>
              <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700 dark:border-purple-400/25 dark:bg-purple-500/10 dark:text-purple-200">
                2 Player
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={() => respondMutation.mutate(false)}
            disabled={respondMutation.isPending}
            className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => respondMutation.mutate(true)}
            disabled={respondMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-black text-[#08131f] shadow-[0_10px_24px_rgba(45,212,191,0.28)] transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {respondMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Swords className="h-4 w-4" />
            )}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
