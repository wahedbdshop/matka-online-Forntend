"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SupportAgentService } from "@/services/support-agent.service";

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "-";
}

function normalizeSupportAgent(payload: any) {
  const data = payload?.data ?? payload;
  const user = data?.user ?? data?.User ?? null;
  const supportAgent = data?.supportAgent ?? data?.support_agent ?? null;
  const lastLogin = data?.lastLogin ?? user?.lastLogin ?? supportAgent?.lastLogin ?? null;

  return {
    id: data?.id ?? supportAgent?.id ?? user?.id ?? "",
    name: data?.name ?? user?.name ?? supportAgent?.name ?? "-",
    username: data?.username ?? user?.username ?? supportAgent?.username ?? "-",
    email: data?.email ?? user?.email ?? supportAgent?.email ?? "-",
    phone: data?.phone ?? user?.phone ?? supportAgent?.phone ?? "-",
    note: data?.note ?? supportAgent?.note ?? "-",
    location: pickFirstString(
      data?.location,
      data?.currentLocation,
      data?.loginLocation,
      data?.lastKnownLocation,
      data?.city,
      supportAgent?.location,
      user?.location,
      lastLogin?.location,
      lastLogin?.city,
      lastLogin?.address,
      lastLogin?.ipAddress,
      data?.ipAddress,
      user?.ipAddress,
    ),
    deviceName: pickFirstString(
      data?.deviceName,
      data?.currentDeviceName,
      data?.device,
      data?.deviceModel,
      supportAgent?.deviceName,
      user?.deviceName,
      lastLogin?.deviceName,
      lastLogin?.device,
      lastLogin?.deviceModel,
      lastLogin?.userAgent,
      data?.userAgent,
      user?.userAgent,
    ),
    isActive:
      typeof data?.isActive === "boolean"
        ? data.isActive
        : typeof supportAgent?.isActive === "boolean"
          ? supportAgent.isActive
          : String(data?.status ?? supportAgent?.status ?? "").toUpperCase() ===
            "ACTIVE",
  };
}

export default function SupportAgentDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const id = String(params.id ?? "");

  const [editingField, setEditingField] = useState<"name" | "phone" | "note" | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    note: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-support-agent-detail", id],
    queryFn: () => SupportAgentService.getById(id),
    enabled: !!id,
  });

  const agent = normalizeSupportAgent(data);

  useEffect(() => {
    if (!agent.id) return;
    setFormData({
      name: agent.name === "-" ? "" : agent.name,
      phone: agent.phone === "-" ? "" : agent.phone,
      note: agent.note === "-" ? "" : agent.note,
    });
  }, [agent.id, agent.name, agent.note, agent.phone]);

  const { mutate: updateAgent, isPending: isUpdating } = useMutation({
    mutationFn: () =>
      SupportAgentService.update(id, {
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        note: formData.note.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success("Support agent updated");
      setEditingField(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-support-agent-detail", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-support-agents"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update agent");
    },
  });

  const resetEditingField = (field: "name" | "phone" | "note") => {
    setEditingField(null);
    setFormData((current) => ({
      ...current,
      [field]:
        field === "name"
          ? agent.name === "-"
            ? ""
            : agent.name
          : field === "phone"
            ? agent.phone === "-"
              ? ""
              : agent.phone
            : agent.note === "-"
              ? ""
              : agent.note,
    }));
  };

  const saveField = (field: "name" | "phone" | "note") => {
    setEditingField(field);
    updateAgent();
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => router.push("/admin/support-agents")}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support Agents
        </button>
        <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 p-6">
          <div className="h-6 w-44 animate-pulse rounded bg-slate-700/60" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-4"
              >
                <div className="h-3 w-20 animate-pulse rounded bg-slate-700/60" />
                <div className="mt-3 h-5 w-32 animate-pulse rounded bg-slate-700/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !agent.id) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => router.push("/admin/support-agents")}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support Agents
        </button>
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
          <h1 className="text-lg font-bold text-white">Support agent not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            This support agent could not be loaded.
          </p>
          <Link
            href="/admin/support-agents"
            className="mt-5 inline-flex rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:text-white"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/admin/support-agents")}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Support Agents
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/70 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
        <div className="border-b border-slate-700/50 bg-gradient-to-r from-cyan-500/15 via-slate-900 to-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <UserCog className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                <p className="mt-1 text-sm text-slate-400">@{agent.username}</p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                agent.isActive
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {agent.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Name</p>
              {editingField === "name" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetEditingField("name")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => saveField("name")}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField("name")}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
            {editingField === "name" ? (
              <input
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
            ) : (
              <p className="mt-2 text-lg font-semibold text-white">{agent.name}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Username</p>
            <p className="mt-2 text-lg font-semibold text-white">{agent.username}</p>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.2em]">Email</p>
            </div>
            <p className="mt-2 break-all text-lg font-semibold text-white">{agent.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Phone className="h-4 w-4" />
                <p className="text-[11px] uppercase tracking-[0.2em]">Phone</p>
              </div>
              {editingField === "phone" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetEditingField("phone")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => saveField("phone")}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField("phone")}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
            {editingField === "phone" ? (
              <input
                value={formData.phone}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, phone: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
            ) : (
              <p className="mt-2 text-lg font-semibold text-white">{agent.phone}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.2em]">Location</p>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">{agent.location}</p>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <Smartphone className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.2em]">Device Name</p>
            </div>
            <p className="mt-2 break-words text-lg font-semibold text-white">
              {agent.deviceName}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                <p className="text-[11px] uppercase tracking-[0.2em]">Admin Note</p>
              </div>
              {editingField === "note" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetEditingField("note")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => saveField("note")}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField("note")}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
            {editingField === "note" ? (
              <textarea
                value={formData.note}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, note: event.target.value }))
                }
                rows={4}
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {agent.note || "-"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
