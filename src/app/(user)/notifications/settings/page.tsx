"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Loader2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/axios";
import { useRouter } from "next/navigation";

interface NotifSetting {
  depositNotif: boolean;
  withdrawNotif: boolean;
  transferNotif: boolean;
  gameResultNotif: boolean;
  betWinNotif: boolean;
  betLostNotif: boolean;
  referralNotif: boolean;
  systemNotif: boolean;
  announcementNotif: boolean;
}

const SETTINGS_LABELS: {
  key: keyof NotifSetting;
  label: string;
  desc: string;
}[] = [
  {
    key: "depositNotif",
    label: "Deposit",
    desc: "Deposit approved/rejected alerts",
  },
  {
    key: "withdrawNotif",
    label: "Withdrawal",
    desc: "Withdrawal status updates",
  },
  {
    key: "transferNotif",
    label: "Transfer",
    desc: "Money transfer notifications",
  },
  {
    key: "gameResultNotif",
    label: "Game Results",
    desc: "Lottery result announcements",
  },
  { key: "betWinNotif", label: "Bet Win", desc: "When your bet wins" },
  { key: "betLostNotif", label: "Bet Lost", desc: "When your bet loses" },
  {
    key: "referralNotif",
    label: "Referral",
    desc: "Referral bonus notifications",
  },
  { key: "systemNotif", label: "System", desc: "System alerts and updates" },
  {
    key: "announcementNotif",
    label: "Announcements",
    desc: "Platform announcements",
  },
];

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-12 flex-shrink-0 rounded-full transition-colors duration-200 ${value ? "bg-blue-500" : "bg-slate-600"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-[26px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => api.get("/notification/settings").then((r) => r.data?.data),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: Partial<NotifSetting>) =>
      api.patch("/notification/settings", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const toggle = (key: keyof NotifSetting) => {
    if (!data) return;
    mutate({ [key]: !data[key] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse max-w-lg">
        <div className="h-8 w-48 rounded bg-slate-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Notification Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control what notifications you receive
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50">
        {SETTINGS_LABELS.map((item, index) => (
          <div
            key={item.key}
            className={`flex items-center justify-between px-4 py-3.5 ${
              index === 0 ? "rounded-t-2xl" : ""
            } ${
              index === SETTINGS_LABELS.length - 1
                ? "rounded-b-2xl"
                : "border-b border-slate-700/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-500/10">
                <Bell className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPending && (
                <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
              )}
              <Toggle
                value={data?.[item.key] ?? true}
                onChange={() => toggle(item.key)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
