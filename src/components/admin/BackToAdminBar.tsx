/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { ADMIN_BACKUP_SESSION_KEY } from "@/lib/admin-login-as";
import { setClientAuthCookies } from "@/lib/auth-cookie";

export function BackToAdminBar() {
  const router = useRouter();
  const { setAuth, user } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const adminBackupRaw = sessionStorage.getItem(ADMIN_BACKUP_SESSION_KEY);

    if (!adminBackupRaw) return;

    try {
      const adminBackup = JSON.parse(adminBackupRaw);
      if (adminBackup?.user?.role === "ADMIN" && adminBackup?.token) {
        setShow(true);
      } else {
        sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
      }
    } catch {
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
    }
  }, []);

  if (!show || user?.role === "ADMIN") return null;

  const handleBackToAdmin = () => {
    const adminBackupRaw = sessionStorage.getItem(ADMIN_BACKUP_SESSION_KEY);
    if (!adminBackupRaw) return;

    try {
      const adminBackup = JSON.parse(adminBackupRaw);
      if (adminBackup?.user?.role !== "ADMIN" || !adminBackup?.token) {
        sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
        return;
      }

      setClientAuthCookies({
        accessToken: adminBackup.token,
      });
      setAuth(adminBackup.user, adminBackup.token);
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);

      setTimeout(() => router.push("/admin/dashboard"), 300);
    } catch {
      sessionStorage.removeItem(ADMIN_BACKUP_SESSION_KEY);
      router.push("/login");
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={handleBackToAdmin}
        className="flex items-center gap-2 rounded-full border border-purple-500/50 bg-purple-600/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-purple-700 active:scale-95 transition-all"
      >
        <Shield className="h-4 w-4" />
        Back to Admin Panel
      </button>
    </div>
  );
}
