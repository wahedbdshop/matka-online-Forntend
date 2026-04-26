"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SupportAgentService } from "@/services/support-agent.service";

const LIMIT = 20;

const initialForm = {
  name: "",
  username: "",
  email: "",
  phone: "",
  temporaryPassword: "",
  note: "",
};

export default function SupportAgentManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support-agents", search],
    queryFn: () => SupportAgentService.list({ search, page: 1, limit: LIMIT }),
  });

  const agents = useMemo(() => {
    const payload = data?.data;
    const rawAgents = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.supportAgents)
        ? payload.supportAgents
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

    return rawAgents.map((agent: any) => {
      const user = agent?.user ?? agent?.User ?? null;
      const supportAgent = agent?.supportAgent ?? agent?.support_agent ?? null;

      return {
        ...agent,
        id: agent?.id ?? supportAgent?.id ?? user?.id ?? "",
        name: agent?.name ?? user?.name ?? supportAgent?.name ?? "-",
        username:
          agent?.username ?? user?.username ?? supportAgent?.username ?? "-",
        email: agent?.email ?? user?.email ?? supportAgent?.email ?? "-",
        phone:
          agent?.phone ??
          user?.phone ??
          supportAgent?.phone ??
          "-",
        note: agent?.note ?? supportAgent?.note ?? "-",
        isActive:
          typeof agent?.isActive === "boolean"
            ? agent.isActive
            : typeof supportAgent?.isActive === "boolean"
              ? supportAgent.isActive
              : String(agent?.status ?? supportAgent?.status ?? "")
                  .toUpperCase() === "ACTIVE",
      };
    });
  }, [data]);

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-support-agents"] });

  const { mutate: createAgent, isPending: isCreating } = useMutation({
    mutationFn: SupportAgentService.create,
    onSuccess: () => {
      toast.success("Support agent created");
      setFormOpen(false);
      setFormData(initialForm);
      refreshList();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create agent");
    },
  });

  const { mutate: updateAgent, isPending: isUpdating } = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { note?: string; isActive?: boolean };
    }) => SupportAgentService.update(id, payload),
    onSuccess: () => {
      toast.success("Support agent updated");
      setFormOpen(false);
      setEditTarget(null);
      setFormData(initialForm);
      refreshList();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update agent");
    },
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: (id: string) => SupportAgentService.toggleStatus(id),
    onSuccess: () => {
      toast.success("Status updated");
      refreshList();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update status");
    },
  });

  const { mutate: removeAgent } = useMutation({
    mutationFn: (id: string) => SupportAgentService.remove(id),
    onSuccess: () => {
      toast.success("Support agent removed");
      refreshList();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to remove agent");
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setFormData(initialForm);
    setFormOpen(true);
  };

  const openEdit = (agent: any) => {
    setEditTarget(agent);
    setFormData({
      name: agent.name ?? "",
      username: agent.username ?? "",
      email: agent.email ?? "",
      phone: agent.phone ?? "",
      temporaryPassword: "",
      note: agent.note ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editTarget) {
      updateAgent({
        id: editTarget.id,
        payload: {
          note: formData.note || undefined,
          isActive:
            typeof editTarget.isActive === "boolean"
              ? editTarget.isActive
              : undefined,
        },
      });
      return;
    }

    createAgent({
      name: formData.name.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      temporaryPassword: formData.temporaryPassword,
      password: formData.temporaryPassword,
      role: "SUPPORT_AGENT",
      note: formData.note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Support Agents</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Create, activate, and manage support agent accounts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchInput.trim());
              }
            }}
            placeholder="Search by name, email, username..."
            className="w-72 rounded-xl border border-slate-700 bg-slate-800/60 pl-9 pr-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={() => setSearch(searchInput.trim())}
          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700/40 bg-slate-800/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 text-left">
              {["Name", "Username", "Email", "Phone", "Status", "Note", "Actions"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-700/30">
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-700/60" />
                  </td>
                </tr>
              ))
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No support agents found
                </td>
              </tr>
            ) : (
              agents.map((agent: any) => (
                <tr key={agent.id} className="border-b border-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                        <UserCog className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-white">{agent.name ?? "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{agent.username ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{agent.email ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{agent.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        agent.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {agent.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{agent.note ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/support-agents/${agent.id}`)}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(agent)}
                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-300"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(agent.id)}
                        className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-yellow-300"
                      >
                        {agent.isActive ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => removeAgent(agent.id)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setFormOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                {editTarget ? "Update Support Agent" : "Create Support Agent"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Name", "name"],
                ["Username", "username"],
                ["Email", "email"],
                ["Phone", "phone"],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="mb-1 text-[11px] text-slate-500">{label}</p>
                  <input
                    value={formData[key as keyof typeof formData]}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    disabled={Boolean(editTarget && key !== "phone" && key !== "name")}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-60"
                  />
                </div>
              ))}
            </div>

            {!editTarget ? (
              <div>
                <p className="mb-1 text-[11px] text-slate-500">Temporary Password</p>
                <input
                  value={formData.temporaryPassword}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      temporaryPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-[11px] text-slate-500">Admin Note</p>
              <textarea
                value={formData.note}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
              className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editTarget ? (
                "Update Agent"
              ) : (
                "Create Agent"
              )}
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
