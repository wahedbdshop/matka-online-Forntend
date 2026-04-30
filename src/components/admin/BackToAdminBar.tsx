/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useAuthStore } from "@/store/auth.store";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { ADMIN_BACKUP_SESSION_KEY } from "@/lib/admin-login-as";
import { applyClientSession, syncServerSession } from "@/lib/auth-session";
import { isAdminPortalRole } from "@/lib/auth-role";

export function BackToAdminBar() {
  const { setAuth, user } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const adminBackupRaw = sessionStorage.getItem(ADMIN_BACKUP_SESSION_KEY);

    if (!adminBackupRaw) return;

    try {
      const adminBackup = JSON.parse(adminBackupRaw);
      const adminAccessToken = adminBackup?.accessToken;
      const adminSessionToken = adminBackup?.sessionToken ?? adminBackup?.token;
      if (
        isAdminPortalRole(adminBackup?.user?.role) &&
        adminAccessToken &&
        adminSessionToken
      ) {
        setShow(true);
      } else {
        sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
      }
    } catch {
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
    }
  }, []);

  if (!show || user?.role === "ADMIN") return null;

  const handleBackToAdmin = async () => {
    const adminBackupRaw = sessionStorage.getItem(ADMIN_BACKUP_SESSION_KEY);
    if (!adminBackupRaw) return;

    try {
      const adminBackup = JSON.parse(adminBackupRaw);
      const adminAccessToken = adminBackup?.accessToken;
      const adminSessionToken = adminBackup?.sessionToken ?? adminBackup?.token;
      if (
        !isAdminPortalRole(adminBackup?.user?.role) ||
        !adminAccessToken ||
        !adminSessionToken
      ) {
        sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
        return;
      }

      applyClientSession({
        accessToken: adminAccessToken,
        refreshToken: adminBackup.refreshToken,
        sessionToken: adminSessionToken,
        sessionMaxAgeMs: adminBackup.sessionMaxAgeMs,
        refreshTokenMaxAgeMs: adminBackup.refreshTokenMaxAgeMs,
      });
      await syncServerSession({
        accessToken: adminAccessToken,
        refreshToken: adminBackup.refreshToken,
        sessionToken: adminSessionToken,
        sessionMaxAgeMs: adminBackup.sessionMaxAgeMs,
        refreshTokenMaxAgeMs: adminBackup.refreshTokenMaxAgeMs,
      });
      setAuth(adminBackup.user, adminAccessToken);
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);

      window.location.replace("/admin/dashboard");
    } catch {
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
      window.location.replace("/admin/login");
    }
  };

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={handleBackToAdmin}
        className="flex items-center gap-1.5 rounded-full border border-purple-500/50 bg-purple-600/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-purple-700 active:scale-95 transition-all"
      >
        <Shield className="h-3.5 w-3.5" />
        Back to Admin
      </button>
    </div>
  );
}
