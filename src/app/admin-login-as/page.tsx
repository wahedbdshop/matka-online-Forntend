"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import {
  ADMIN_LOGIN_AS_BACKUP_PREFIX,
  ADMIN_BACKUP_SESSION_KEY,
  ADMIN_LOGIN_AS_CHANNEL_PREFIX,
  ADMIN_LOGIN_AS_MAX_AGE_MS,
  LoginAsTransferPayload,
} from "@/lib/admin-login-as";
import { applyClientSession, syncServerSession } from "@/lib/auth-session";
import { isAdminPortalRole } from "@/lib/auth-role";
import { api } from "@/lib/axios";

function AdminLoginAsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const flowId = searchParams.get("flow");
    const code = searchParams.get("code");

    if (!flowId) {
      router.push("/login");
      return;
    }

    if (code) {
      let cancelled = false;

      const consumeCode = async () => {
        const backupKey = `${ADMIN_LOGIN_AS_BACKUP_PREFIX}:${flowId}`;
        const adminBackupRaw = localStorage.getItem(backupKey);

        if (!adminBackupRaw) {
          router.push("/login");
          return;
        }

        try {
          const adminBackup = JSON.parse(adminBackupRaw);
          const adminAccessToken = adminBackup?.accessToken ?? adminBackup?.token;
          const backupMaxAge =
            typeof adminBackup?.maxAgeMs === "number"
              ? adminBackup.maxAgeMs
              : ADMIN_LOGIN_AS_MAX_AGE_MS;
          const isExpired =
            !adminBackup?.createdAt ||
            Date.now() - adminBackup.createdAt > backupMaxAge;

          if (
            isExpired ||
            !isAdminPortalRole(adminBackup?.user?.role) ||
            !adminAccessToken
          ) {
            localStorage.removeItem(backupKey);
            router.push("/login");
            return;
          }

          const res = await api.post(
            "/auth/impersonation/consume",
            { code },
            {
              skipAuthRedirect: true,
              skipAuthRefresh: true,
            } as any,
          );

          if (cancelled) return;

          const payload = res.data?.data;
          const accessToken = payload?.accessToken ?? payload?.token;

          if (!accessToken || !payload?.user) {
            throw new Error("Invalid impersonation response");
          }

          sessionStorage.setItem(
            ADMIN_BACKUP_SESSION_KEY,
            JSON.stringify({
              ...adminBackup,
              accessToken: adminAccessToken,
              token:
                adminBackup.sessionToken ??
                adminBackup.token ??
                adminAccessToken,
            }),
          );
          localStorage.removeItem(backupKey);

          applyClientSession({
            accessToken,
            refreshToken: payload.refreshToken,
            sessionToken: payload.sessionToken ?? payload.token,
            sessionMaxAgeMs: payload.sessionMaxAgeMs,
            refreshTokenMaxAgeMs: payload.refreshTokenMaxAgeMs,
          });
          await syncServerSession({
            accessToken,
            refreshToken: payload.refreshToken,
            sessionToken: payload.sessionToken ?? payload.token,
            sessionMaxAgeMs: payload.sessionMaxAgeMs,
            refreshTokenMaxAgeMs: payload.refreshTokenMaxAgeMs,
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
            accessToken,
          );

          setTimeout(() => {
            router.push("/dashboard");
          }, 300);
        } catch {
          localStorage.removeItem(backupKey);
          router.push("/login");
        }
      };

      consumeCode();

      return () => {
        cancelled = true;
      };
    }

    const channel = new BroadcastChannel(
      `${ADMIN_LOGIN_AS_CHANNEL_PREFIX}:${flowId}`,
    );

    const timeout = window.setTimeout(() => {
      channel.close();
      router.push("/login");
    }, 15_000);

    channel.onmessage = async (
      event: MessageEvent<{ type?: string; payload?: LoginAsTransferPayload }>,
    ) => {
      if (event.data?.type !== "auth-payload") return;

      const payload = event.data.payload;
      const accessToken = payload?.accessToken ?? payload?.token;
      const adminAccessToken =
        payload?.adminBackup?.accessToken ?? payload?.adminBackup?.token;
      const isExpired =
        !payload?.createdAt ||
        Date.now() - payload.createdAt > ADMIN_LOGIN_AS_MAX_AGE_MS;

      if (
        isExpired ||
        !accessToken ||
        !payload.user ||
        !isAdminPortalRole(payload.adminBackup?.user?.role) ||
        !adminAccessToken
      ) {
        window.clearTimeout(timeout);
        channel.close();
        router.push("/login");
        return;
      }

      sessionStorage.setItem(
        ADMIN_BACKUP_SESSION_KEY,
        JSON.stringify({
          ...payload.adminBackup,
          accessToken: adminAccessToken,
          token:
            payload.adminBackup?.sessionToken ??
            payload.adminBackup?.token ??
            adminAccessToken,
        }),
      );

      applyClientSession({
        accessToken,
        refreshToken: payload.refreshToken,
        sessionToken: payload.sessionToken ?? payload.token,
        sessionMaxAgeMs: payload.sessionMaxAgeMs,
        refreshTokenMaxAgeMs: payload.refreshTokenMaxAgeMs,
      });
      await syncServerSession({
        accessToken,
        refreshToken: payload.refreshToken,
        sessionToken: payload.sessionToken ?? payload.token,
        sessionMaxAgeMs: payload.sessionMaxAgeMs,
        refreshTokenMaxAgeMs: payload.refreshTokenMaxAgeMs,
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
        accessToken,
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

export function AdminLoginAsPageContent() {
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

export default function AdminLoginAsPage() {
  return <AdminLoginAsPageContent />;
}
