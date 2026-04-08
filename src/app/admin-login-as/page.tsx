"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import {
  ADMIN_BACKUP_SESSION_KEY,
  ADMIN_LOGIN_AS_CHANNEL_PREFIX,
  ADMIN_LOGIN_AS_MAX_AGE_MS,
  LoginAsTransferPayload,
} from "@/lib/admin-login-as";
import { setClientAuthCookies } from "@/lib/auth-cookie";

function AdminLoginAsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const flowId = searchParams.get("flow");

    if (!flowId) {
      router.push("/login");
      return;
    }

    const channel = new BroadcastChannel(
      `${ADMIN_LOGIN_AS_CHANNEL_PREFIX}:${flowId}`,
    );

    const timeout = window.setTimeout(() => {
      channel.close();
      router.push("/login");
    }, 15_000);

    channel.onmessage = (event: MessageEvent<{ type?: string; payload?: LoginAsTransferPayload }>) => {
      if (event.data?.type !== "auth-payload") return;

      const payload = event.data.payload;
      const isExpired =
        !payload?.createdAt ||
        Date.now() - payload.createdAt > ADMIN_LOGIN_AS_MAX_AGE_MS;

      if (
        isExpired ||
        !payload?.token ||
        !payload.user ||
        payload.adminBackup?.user?.role !== "ADMIN" ||
        !payload.adminBackup?.token
      ) {
        window.clearTimeout(timeout);
        channel.close();
        router.push("/login");
        return;
      }

      sessionStorage.setItem(
        ADMIN_BACKUP_SESSION_KEY,
        JSON.stringify(payload.adminBackup),
      );

      setClientAuthCookies({
        accessToken: payload.token,
      });

      setAuth(
        {
          id: payload.user.id,
          name: payload.user.name,
          username: payload.user.username ?? "",
          email: payload.user.email,
          phone: payload.user.phone,
          role: payload.user.role,
          status: payload.user.status,
          balance: Number(payload.user.balance ?? 0),
          bonusBalance: Number(payload.user.bonusBalance ?? 0),
          currency: payload.user.currency ?? "BDT",
          referralCode: payload.user.referralCode ?? "",
          emailVerified: payload.user.emailVerified ?? false,
          image: payload.user.image ?? undefined,
        },
        payload.token,
      );

      window.clearTimeout(timeout);
      channel.close();

      setTimeout(() => {
        router.push("/dashboard");
      }, 300);
    };

    channel.postMessage({ type: "ready" });

    return () => {
      window.clearTimeout(timeout);
      channel.close();
    };
  }, [router, searchParams, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050b1f]">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto" />
        <p className="text-sm text-slate-400">Logging in as user...</p>
      </div>
    </div>
  );
}

export default function AdminLoginAsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050b1f]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <AdminLoginAsContent />
    </Suspense>
  );
}
