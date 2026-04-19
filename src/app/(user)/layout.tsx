import { cookies } from "next/headers";
import { TopHeader } from "@/components/user/top-header";
import { BottomNav } from "@/components/user/bottom-nav";
import { BackToAdminBar } from "@/components/admin/BackToAdminBar";
import { ChatReplyPopup } from "@/components/user/chat-reply-popup";

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
      <TopHeader initialIsAuthenticated={initialIsAuthenticated} />
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4 pb-24">
        {children}
      </main>
      <BottomNav />
      <BackToAdminBar />
      <ChatReplyPopup />
    </div>
  );
}
