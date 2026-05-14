import { cookies } from "next/headers";
import { BackToAdminBar } from "@/components/admin/BackToAdminBar";
import { ChatReplyPopup } from "@/components/user/chat-reply-popup";
import { LudoInvitePopup } from "@/components/user/ludo-invite-popup";
import { NotificationPopup } from "@/components/user/notification-popup";
import { EmailVerificationGate } from "@/components/user/email-verification-gate";
import { UserLayoutShell } from "@/components/user/user-layout-shell";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialIsAuthenticated =
    cookieStore.has("auth_flag") ||
    cookieStore.has("accessToken") ||
    cookieStore.has("auth_token");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <UserLayoutShell initialIsAuthenticated={initialIsAuthenticated}>
        {children}
      </UserLayoutShell>
      <BackToAdminBar />
      <ChatReplyPopup />
      <LudoInvitePopup />
      <NotificationPopup />
      <EmailVerificationGate />
    </div>
  );
}
