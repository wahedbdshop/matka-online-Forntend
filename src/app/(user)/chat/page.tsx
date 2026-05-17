"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportChatPanel,
  type SupportMode,
} from "@/components/user/support-chat-panel";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode: SupportMode =
    searchParams.get("mode")?.toLowerCase() === "ai" ? "AI" : "AGENT";

  return (
    <SupportChatPanel
      initialMode={requestedMode}
      onBack={() => router.push("/support/live")}
    />
  );
}
