"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Bell,
  Bot,
  ChevronLeft,
  Headphones,
  HelpCircle,
  Home,
  Loader2,
  MoreVertical,
  MessageSquareText,
  MoveRight,
  PhoneCall,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";
import { DepositService } from "@/services/deposit.service";
import { HomeService } from "@/services/home.service";
import { Button } from "@/components/ui/button";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { markChatAgentMessagesSeen } from "@/lib/chat-unread";
import { SupportChatPanel } from "@/components/user/support-chat-panel";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

const WHATSAPP_NUMBER_KEY = "live_chat_whatsapp_number";
const WHATSAPP_MESSAGE_KEY = "live_chat_whatsapp_message";
const DEFAULT_WHATSAPP_MESSAGE = "Hello, I need support.";

type TabKey = "home" | "agent" | "ai" | "whatsapp";

type GlobalAgent = {
  whatsappNumber?: string | null;
};

type FeedItem = {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread?: boolean;
  kind: "announcement" | "agent" | "ticket";
  imageUrl?: string | null;
  action?: () => void;
};

function FeedAvatar({
  title,
  kind,
  imageUrl,
}: {
  title: string;
  kind: FeedItem["kind"];
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-full">
        <Image
          src={imageUrl}
          alt={title}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    );
  }

  if (kind === "announcement") {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#fff7db,#ffe7a8)] text-[#a16207] shadow-[0_10px_24px_rgba(240,191,56,0.18)] dark:bg-[linear-gradient(145deg,#0f172a,#0b1226)] dark:text-[#f0bf38] dark:shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
        <Bell className="h-5 w-5" />
      </div>
    );
  }

  if (kind === "ticket") {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700/80 dark:text-slate-200">
        <HelpCircle className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#06b6d4,#0ea5e9)] text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] dark:bg-[linear-gradient(145deg,#0f766e,#059669)] dark:shadow-[0_10px_24px_rgba(5,150,105,0.18)]">
      <Headphones className="h-5 w-5" />
    </div>
  );
}

function MessageRow({ item }: { item: FeedItem }) {
  return (
    <button
      type="button"
      onClick={item.action}
      className="flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
    >
      <FeedAvatar title={item.title} kind={item.kind} imageUrl={item.imageUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
              {item.title}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {item.preview}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.time}</p>
            {item.unread ? (
              <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function LiveSupportSelectionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const isLoggedIn = hasClientAuthCookie();
  const user = useAuthStore((state) => state.user);
  const welcomeName = user?.name?.trim() || "there";

  const { data: homeData } = useQuery({
    queryKey: ["support-hub-home-data"],
    queryFn: HomeService.getHomeData,
    staleTime: 60000,
  });

  const { data: globalAgentsData, isFetching: isLoadingAgents } = useQuery({
    queryKey: ["floating-chat-global-agents"],
    queryFn: DepositService.getGlobalAgents,
    staleTime: 60000,
  });

  const { data: publicSettingsData, isFetching: isLoadingSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: AdminService.getPublicSettings,
    staleTime: 60000,
  });

  const home = homeData?.data;
  const banners = Array.isArray(home?.banners) ? home.banners : [];
  const favouriteSlides = Array.isArray(home?.favouriteSlides)
    ? home.favouriteSlides
    : [];
  const marquees = Array.isArray(home?.marquees) ? home.marquees : [];
  const globalAgents: GlobalAgent[] = globalAgentsData?.data ?? [];
  const publicSettings = publicSettingsData?.data ?? [];

  const liveChatWhatsappNumber =
    publicSettings.find(
      (setting: { key?: string; value?: string }) =>
        setting.key === WHATSAPP_NUMBER_KEY,
    )?.value ?? "";
  const liveChatWhatsappMessage =
    publicSettings.find(
      (setting: { key?: string; value?: string }) =>
        setting.key === WHATSAPP_MESSAGE_KEY,
    )?.value || DEFAULT_WHATSAPP_MESSAGE;
  const fallbackAgent = globalAgents.find((item) => item.whatsappNumber);
  const whatsappNumber = (
    liveChatWhatsappNumber ||
    fallbackAgent?.whatsappNumber ||
    ""
  ).replace(/[^0-9]/g, "");

  const goBack = () => {
    if (activeTab !== "home") {
      setActiveTab("home");
      return;
    }
    router.push("/dashboard");
  };

  const openAiSupport = () => {
    setActiveTab("ai");
  };

  const openLiveAgent = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    markChatAgentMessagesSeen();
    setActiveTab("agent");
  };

  const openWhatsapp = () => {
    if (!whatsappNumber) {
      toast.error("No WhatsApp support number is available right now.");
      return;
    }

    const encoded = encodeURIComponent(liveChatWhatsappMessage);
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encoded}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const feedItems: FeedItem[] = useMemo(() => {
    const fromMarquees = marquees.slice(0, 3).map((item: any, index: number) => ({
      id: `marquee-${index}`,
      title: index === 0 ? "VIP" : "Announcement",
      preview: item?.text ?? "Latest support and update notice",
      time: "1mo",
      unread: index !== 0,
      kind: "announcement" as const,
      action: () => setActiveTab("home"),
    }));

    const fromBanners = banners.slice(0, 3).map((item: any, index: number) => ({
      id: `banner-${index}`,
      title: item?.title ?? (index === 0 ? "Deposit Request" : "Site Update"),
      preview:
        item?.description ??
        "Tap to see the latest update and support details.",
      time: "1mo",
      unread: index % 2 === 0,
      kind: "announcement" as const,
      imageUrl: item?.imageUrl ?? null,
      action: () => setActiveTab("home"),
    }));

    const supportEntry: FeedItem = {
      id: "support-agent-entry",
      title: "Send us a message",
      preview: "Open live agent, AI support, or WhatsApp support",
      time: "now",
      unread: false,
      kind: "agent",
      action: openLiveAgent,
    };

    return [supportEntry, ...fromMarquees, ...fromBanners].slice(0, 8);
  }, [banners, marquees]);

  const featuredCards = useMemo(() => {
    return [...banners, ...favouriteSlides]
      .filter((item: any) => item?.imageUrl)
      .slice(0, 3);
  }, [banners, favouriteSlides]);

  return (
    <div className="mx-auto max-w-lg overflow-hidden rounded-[32px] border border-slate-200/70 bg-[#f7f9fc] pb-20 shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#071120] dark:shadow-[0_24px_70px_rgba(2,6,23,0.4)]">
      <style>{`
        @keyframes whatsappGlow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 12px 30px rgba(34, 197, 94, 0.18);
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 20px 46px rgba(34, 197, 94, 0.32);
          }
        }
        @keyframes whatsappNudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(6px); }
        }
      `}</style>

      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0b1728]/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="h-10 w-10 rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Support
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Search support"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="More options"
            >
              <MoreVertical className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === "home" && (
        <div className="space-y-4 bg-[#efeae2] px-3 py-3 dark:bg-[#08101d]">
          <section className="rounded-[26px] bg-[linear-gradient(180deg,rgba(10,18,38,0.98)_0%,rgba(18,31,58,0.98)_100%)] p-4 text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_44px_rgba(2,6,23,0.3)]">
            <div className="flex items-center gap-3 rounded-[20px] bg-white/8 px-4 py-3 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#f0bf38,#d89a10)] text-[#1a1f39]">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Matka24 Support</p>
                <p className="truncate text-xs text-white/65">
                  Hi {welcomeName}, open a conversation any time
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openLiveAgent}
              className="mt-4 flex w-full items-center justify-between rounded-[22px] bg-white px-4 py-3 text-left text-slate-900 transition-transform hover:scale-[1.01] dark:bg-white/95 dark:text-slate-900"
            >
              <div>
                <p className="text-sm font-semibold">Send us a message</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-600">
                  Open live agent chat in WhatsApp-style view
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(145deg,#7c3aed_0%,#c026d3_100%)] text-white shadow-[0_10px_24px_rgba(168,85,247,0.28)]">
                <MoveRight className="h-5 w-5" />
              </div>
            </button>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0b1728] dark:shadow-[0_16px_40px_rgba(2,6,23,0.28)]">
            <div className="border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Recent chats
              </p>
            </div>
            <div className="space-y-1 bg-white px-2 py-2 dark:bg-[#0b1728]">
              {feedItems.map((item) => (
                <MessageRow key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            {featuredCards.map((item: any, index: number) => (
              <div
                key={item.id ?? index}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#0b1728] dark:shadow-[0_12px_30px_rgba(2,6,23,0.2)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.title ?? `Support card ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {item.title ?? "Support Update"}
                  </p>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {item.description ??
                      "Latest support information and site update are ready for you."}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <div className="rounded-[24px] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:bg-[#0b1728] dark:shadow-[0_12px_30px_rgba(2,6,23,0.2)]">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Best support topics
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              {[
                "Deposit issue or pending add balance",
                "Withdrawal status and account check",
                "Login, verification, and account help",
                "Bonus, referral, and game result questions",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-[#f0bf38]" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "agent" && (
        <div className="bg-[#efeae2] px-0 py-0 dark:bg-[#08101d]">
          <SupportChatPanel
            initialMode="AGENT"
            embedded
            onBack={() => setActiveTab("home")}
            showBackButton={false}
          />
        </div>
      )}

      {activeTab === "ai" && (
        <div className="bg-[#efeae2] px-0 py-0 dark:bg-[#08101d]">
          <SupportChatPanel
            initialMode="AI"
            embedded
            onBack={() => setActiveTab("home")}
            showBackButton={false}
          />
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div className="space-y-4 bg-[#efeae2] px-3 py-3 dark:bg-[#08101d]">
          <div className="rounded-[28px] border border-emerald-200 bg-[radial-gradient(circle_at_top,rgba(187,247,208,0.95),rgba(240,253,244,0.96)_48%,rgba(255,255,255,1))] p-5 text-slate-900 shadow-[0_18px_40px_rgba(34,197,94,0.12)] dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),rgba(10,22,16,0.98)_42%,rgba(2,6,23,1))] dark:text-white dark:shadow-[0_18px_40px_rgba(34,197,94,0.16)]">
            <div className="text-center">
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 dark:bg-emerald-400/20" />
                <span className="absolute inset-[10px] rounded-full bg-emerald-300/35 dark:bg-emerald-400/10" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(145deg,#22c55e,#16a34a)] text-white shadow-[0_16px_34px_rgba(34,197,94,0.3)]">
                  <PhoneCall className="h-9 w-9" />
                </div>
              </div>

              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                WhatsApp Support
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Tap to open WhatsApp
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Fast direct support for deposit, withdrawal, proof sharing, and urgent account help.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {whatsappNumber
                  ? `Current number ending ${whatsappNumber.slice(-4)}`
                  : "Support number loading"}
              </p>
            </div>

            <button
              type="button"
              onClick={openWhatsapp}
              disabled={!whatsappNumber && !isLoadingAgents && !isLoadingSettings}
              className="mt-6 w-full overflow-hidden rounded-[22px] border border-emerald-300/60 bg-[linear-gradient(145deg,#22c55e,#16a34a)] px-5 py-4 text-left text-white disabled:opacity-60 dark:border-emerald-400/20"
              style={{ animation: "whatsappGlow 1.8s ease-in-out infinite" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black tracking-tight">
                    Click here to open WhatsApp
                  </p>
                  <p className="mt-1 text-sm text-white/85">
                    Support team will continue with you there
                  </p>
                </div>
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/18"
                  style={{ animation: "whatsappNudge 1.2s ease-in-out infinite" }}
                >
                  {isLoadingAgents || isLoadingSettings ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <MoveRight className="h-6 w-6" />
                  )}
                </div>
              </div>
            </button>

            <div className="mt-4 rounded-[20px] border border-emerald-200/70 bg-white/80 p-4 dark:border-emerald-500/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Best for:
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Urgent payment proof sharing</p>
                <p>Deposit or withdrawal follow-up</p>
                <p>Quick human response</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/96 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#0b1728]/96 dark:shadow-[0_-8px_30px_rgba(2,6,23,0.28)]">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-3 py-2">
          {[
            { key: "home", label: "Home", icon: Home },
            { key: "agent", label: "Agent", icon: Headphones },
            { key: "ai", label: "AI", icon: Bot },
            { key: "whatsapp", label: "WhatsApp", icon: PhoneCall },
          ].map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === "agent") {
                    openLiveAgent();
                    return;
                  }
                  if (item.key === "ai") {
                    openAiSupport();
                    return;
                  }
                  setActiveTab(item.key as TabKey);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-amber-600 dark:bg-white/8 dark:text-[#f0bf38]"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
