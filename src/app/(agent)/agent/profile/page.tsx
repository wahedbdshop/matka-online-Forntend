"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { SupportAgentService } from "@/services/support-agent.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function normalizeSupportAgentProfile(payload: any) {
  const profile = payload?.data ?? payload;
  const user = profile?.user ?? profile?.User ?? null;
  const supportAgent = profile?.supportAgent ?? profile?.support_agent ?? null;

  return {
    id: profile?.id ?? supportAgent?.id ?? user?.id ?? "",
    name: profile?.name ?? user?.name ?? supportAgent?.name ?? "",
    phone: profile?.phone ?? user?.phone ?? supportAgent?.phone ?? "",
    username:
      profile?.username ?? user?.username ?? supportAgent?.username ?? "",
    email: profile?.email ?? user?.email ?? supportAgent?.email ?? "",
  };
}

export default function SupportAgentProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["support-agent-profile"],
    queryFn: SupportAgentService.getMe,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    const profile = normalizeSupportAgentProfile(data);
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
    updateUser({
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      username: profile.username,
    });
  }, [data, updateUser]);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () =>
      SupportAgentService.updateMe({
        name: name.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: (response) => {
      const profile = normalizeSupportAgentProfile(response);
      updateUser({
        name: profile?.name ?? name.trim(),
        phone: profile?.phone ?? phone.trim(),
        email: profile?.email ?? user?.email,
        username: profile?.username ?? user?.username,
      });
      setName(profile?.name ?? name.trim());
      setPhone(profile?.phone ?? phone.trim());
      toast.success("Profile updated");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });

  const profile = data ? normalizeSupportAgentProfile(data) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/35 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Support Agent Profile</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage your profile and password.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/35 dark:shadow-none">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="border-slate-300 bg-slate-50 pl-10 text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</p>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="border-slate-300 bg-slate-50 pl-10 text-slate-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-900/60">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Username</p>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
              {isLoading ? "Loading..." : profile?.username ?? user?.username ?? "-"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-900/60">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Email</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Mail className="h-4 w-4 text-slate-500" />
              <span>{isLoading ? "Loading..." : profile?.email ?? user?.email ?? "-"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => saveProfile()}
            disabled={isPending}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Link
            href="/agent/profile/change-password"
            className="inline-flex items-center gap-2 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300"
          >
            <ShieldCheck className="h-4 w-4" />
            Change Password
          </Link>
        </div>
      </div>
    </div>
  );
}
