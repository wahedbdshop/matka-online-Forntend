/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ShieldBan,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { AdminService } from "@/services/admin.service";

const LIMIT = 10;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
  BANNED: "bg-red-500/15   text-red-400   border-red-500/30",
};

const TYPE_STYLE: Record<string, string> = {
  BD_AGENT: "bg-blue-500/15   text-blue-400",
  GLOBAL_AGENT: "bg-purple-500/15 text-purple-400",
};

const EMPTY_BD = {
  type: "BD_AGENT",
  name: "",
  email: "",
  phone: "",
  bkashNumber: "",
  nagadNumber: "",
  rocketNumber: "",
  bkashLogo: "",
  nagadLogo: "",
  rocketLogo: "",
  extraMethods: [] as {
    name: string;
    number: string;
    logo: string;
    min?: number;
    max?: number;
  }[],
  // âœ… Deposit limits
  bkashMin: 500,
  bkashMax: 30000,
  nagadMin: 500,
  nagadMax: 30000,
  rocketMin: 500,
  rocketMax: 30000,
};

const EMPTY_GLOBAL = {
  type: "GLOBAL_AGENT",
  name: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  whatsappIcon: "",
  // âœ… Deposit limits + country
  country: "",
  whatsappMin: 500,
  whatsappMax: 30000,
};

function getAgentDisplayNumbers(agent: any) {
  const numbers: { label: string; value: string }[] = [];
  const push = (label: string, value?: string | null) => {
    if (!value) return;
    numbers.push({ label, value });
  };

  push("Bkash", agent?.bkashNumber);
  push("Nagad", agent?.nagadNumber);
  push("Rocket", agent?.rocketNumber);
  push("WA", agent?.whatsappNumber);

  if (Array.isArray(agent?.extraMethods)) {
    agent.extraMethods.forEach((method: any) => {
      if (method?.number) {
        numbers.push({
          label: method?.name || "Extra",
          value: method.number,
        });
      }
    });
  }

  return numbers;
}

function getCustomMethodTheme() {
  return {
    card: "border-emerald-500/20 bg-slate-800/50",
    title: "text-emerald-400",
    focus: "focus:border-blue-500",
  };
}

export default function AgentsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [formType, setFormType] = useState<"BD_AGENT" | "GLOBAL_AGENT">(
    "BD_AGENT",
  );
  const [form, setForm] = useState<any>({ ...EMPTY_BD });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agents", page, search, typeFilter, statusFilter],
    queryFn: () =>
      AdminService.getAgents({
        page,
        limit: LIMIT,
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const agents = data?.data ?? [];
  const meta = data?.meta ?? {};
  const totalPages = meta.totalPages ?? 1;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-agents"] });

  const { mutate: createAgent, isPending: isCreating } = useMutation({
    mutationFn: (payload: any) => AdminService.createAgent(payload),
    onSuccess: () => {
      toast.success("Agent created");
      closeForm();
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: updateAgent, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      AdminService.updateAgent(id, payload),
    onSuccess: () => {
      toast.success("Agent updated");
      closeForm();
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: deleteAgent } = useMutation({
    mutationFn: (id: string) => AdminService.deleteAgent(id),
    onSuccess: () => {
      toast.success("Agent deleted");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: banAgent } = useMutation({
    mutationFn: (id: string) => AdminService.banAgent(id),
    onSuccess: () => {
      toast.success("Agent banned");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: unbanAgent } = useMutation({
    mutationFn: (id: string) => AdminService.unbanAgent(id),
    onSuccess: () => {
      toast.success("Agent unbanned");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditTarget(null);
    setForm({ ...EMPTY_BD });
    setFormType("BD_AGENT");
  };

  const openCreate = (type: "BD_AGENT" | "GLOBAL_AGENT") => {
    setFormType(type);
    setForm(type === "BD_AGENT" ? { ...EMPTY_BD } : { ...EMPTY_GLOBAL });
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editTarget) updateAgent({ id: editTarget.id, payload: form });
    else createAgent(form);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const field = (label: string, key: string, placeholder = "") => (
    <div key={key}>
      <label className="text-[11px] text-slate-400 mb-1 block">{label}</label>
      <input
        value={form[key] ?? ""}
        onChange={(e) => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>
  );

  const updateExtra = (i: number, key: string, value: string) => {
    const arr = [...form.extraMethods];
    arr[i][key] = value;
    setForm((p: any) => ({ ...p, extraMethods: arr }));
  };

  return (
    <div className="space-y-5">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Agent Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {meta.total ?? 0} total agents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreate("BD_AGENT")}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" /> BD Agent
          </button>
          <button
            onClick={() => openCreate("GLOBAL_AGENT")}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="h-3.5 w-3.5" /> Global Agent
          </button>
        </div>
      </div>

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Name, email, phone..."
            className="w-52 rounded-lg border border-slate-600 bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
        >
          Search
        </button>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="">All Types</option>
          <option value="BD_AGENT">BD Agent</option>
          <option value="GLOBAL_AGENT">Global Agent</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
        </select>
        {(search || typeFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setTypeFilter("");
              setStatusFilter("");
              setPage(1);
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* â”€â”€ Table â”€â”€ */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              {[
                "#",
                "Name",
                "Type",
                "Contact",
                "Payment Numbers",
                "Status",
                "Created",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-xs font-medium text-slate-400 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : agents.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No agents found
                </td>
              </tr>
            ) : (
              agents.map((a: any, idx: number) => (
                <tr
                  key={a.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/20"
                >
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-white">{a.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_STYLE[a.type] ?? ""}`}
                    >
                      {a.type === "BD_AGENT" ? "BD" : "Global"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-300">{a.phone ?? "-"}</p>
                    <p className="text-[10px] text-slate-500">
                      {a.email ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {getAgentDisplayNumbers(a).length > 0 ? (
                      <div className="space-y-0.5">
                        {getAgentDisplayNumbers(a).map((number) => (
                          <p key={`${number.label}-${number.value}`}>
                            <span className="text-slate-300">
                              {number.label}:
                            </span>{" "}
                            {number.value}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600">-</p>
                    )}
                    <div className="hidden">
                      {a.type === "BD_AGENT" ? (
                        <div className="space-y-0.5">
                          {a.bkashNumber && (
                            <p>
                              <span className="text-pink-400">Bkash:</span>{" "}
                              {a.bkashNumber}
                            </p>
                          )}
                          {a.nagadNumber && (
                            <p>
                              <span className="text-orange-400">Nagad:</span>{" "}
                              {a.nagadNumber}
                            </p>
                          )}
                          {a.rocketNumber && (
                            <p>
                              <span className="text-purple-400">Rocket:</span>{" "}
                              {a.rocketNumber}
                            </p>
                          )}
                          {!a.bkashNumber &&
                            !a.nagadNumber &&
                            !a.rocketNumber && (
                              <p className="text-slate-600">—</p>
                            )}
                        </div>
                      ) : (
                        <p>
                          <span className="text-green-400">WA:</span>{" "}
                          {a.whatsappNumber ?? "-"}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[a.status] ?? ""}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetailTarget(a)}
                        className="rounded-lg border border-slate-600 bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <Link
                        href={`/admin/agents/${a.id}`}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Pencil className="h-3 w-3" />
                      </Link>
                      {a.status === "ACTIVE" ? (
                        <button
                          onClick={() => banAgent(a.id)}
                          className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-1.5 text-yellow-400 hover:bg-yellow-500/20"
                        >
                          <ShieldBan className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => unbanAgent(a.id)}
                          className="rounded-lg border border-green-500/30 bg-green-500/10 p-1.5 text-green-400 hover:bg-green-500/20"
                        >
                          <ShieldCheck className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete this agent?")) deleteAgent(a.id);
                        }}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* â”€â”€ Pagination â”€â”€ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <p className="text-xs text-slate-500">
            {page} / {totalPages}
          </p>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* â”€â”€ Detail Modal â”€â”€ */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailTarget(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Agent Detail</h2>
              <button onClick={() => setDetailTarget(null)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["Name", detailTarget.name],
                ["Type", detailTarget.type],
                ["Status", detailTarget.status],
                ["Email", detailTarget.email],
                ["Phone", detailTarget.phone],
                ...(detailTarget.type === "BD_AGENT"
                  ? [
                      ["Bkash", detailTarget.bkashNumber],
                      ["Nagad", detailTarget.nagadNumber],
                      ["Rocket", detailTarget.rocketNumber],
                    ]
                  : [
                      ["WhatsApp", detailTarget.whatsappNumber],
                      ["Country", detailTarget.country],
                    ]),
                ["Created", new Date(detailTarget.createdAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white text-right">{value ?? "-"}</span>
                </div>
              ))}
              {detailTarget.extraMethods?.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-1">Extra Methods</p>
                  {detailTarget.extraMethods.map((m: any, i: number) => (
                    <p key={i} className="text-white">
                      {m.name}: {m.number}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setDetailTarget(null)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ Create / Edit Modal â”€â”€ */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div className="w-full max-w-md rounded-[20px] border border-slate-700 bg-slate-900 p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                {editTarget ? "Edit" : "Create"}{" "}
                {formType === "BD_AGENT" ? "BD Agent" : "Global Agent"}
              </h2>
              <button onClick={closeForm}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {field("Name *", "name", "Agent name")}
              {field("Email", "email", "email@example.com")}
              {field("Phone", "phone", "+880...")}

              {formType === "BD_AGENT" ? (
                <>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Payment Numbers (at least one required)
                  </p>

                  {/* Bkash */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-pink-400">
                        Bkash
                      </p>
                      <button
                        onClick={() =>
                          setForm((p: any) => ({
                            ...p,
                            bkashNumber: "",
                            bkashLogo: "",
                            bkashMin: 500,
                            bkashMax: 30000,
                          }))
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {field("Number", "bkashNumber", "01XXXXXXXXX")}
                    {field("Logo URL", "bkashLogo", "https://...")}
                  </div>

                  {/* Nagad */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-orange-400">
                        Nagad
                      </p>
                      <button
                        onClick={() =>
                          setForm((p: any) => ({
                            ...p,
                            nagadNumber: "",
                            nagadLogo: "",
                            nagadMin: 500,
                            nagadMax: 30000,
                          }))
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {field("Number", "nagadNumber", "01XXXXXXXXX")}
                    {field("Logo URL", "nagadLogo", "https://...")}
                  </div>

                  {/* Rocket */}
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-purple-400">
                        Rocket
                      </p>
                      <button
                        onClick={() =>
                          setForm((p: any) => ({
                            ...p,
                            rocketNumber: "",
                            rocketLogo: "",
                            rocketMin: 500,
                            rocketMax: 30000,
                          }))
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {field("Number", "rocketNumber", "01XXXXXXXXX")}
                    {field("Logo URL", "rocketLogo", "https://...")}
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() =>
                        setForm((p: any) => ({
                          ...p,
                          extraMethods: [
                            {
                              name: "",
                              number: "",
                              logo: "",
                              min: 500,
                              max: 30000,
                            },
                            ...(p.extraMethods ?? []),
                          ],
                        }))
                      }
                      className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-blue-400/50 hover:text-blue-200"
                    >
                      + Add Method
                    </button>
                  </div>

                  {(form.extraMethods ?? []).length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {(form.extraMethods ?? []).map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 space-y-3 ${getCustomMethodTheme().card}`}
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs font-semibold ${getCustomMethodTheme().title}`}
                            >
                              {m.name?.trim() || "Custom Method"}
                            </p>
                            <button
                              onClick={() => {
                                const arr = form.extraMethods.filter(
                                  (_: any, j: number) => j !== i,
                                );
                                setForm((p: any) => ({
                                  ...p,
                                  extraMethods: arr,
                                }));
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">
                              Name
                            </label>
                            <input
                              value={m.name}
                              onChange={(e) =>
                                updateExtra(i, "name", e.target.value)
                              }
                              placeholder="e.g. SureCash"
                              className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">
                              Number
                            </label>
                            <input
                              value={m.number}
                              onChange={(e) =>
                                updateExtra(i, "number", e.target.value)
                              }
                              placeholder="01XXXXXXXXX"
                              className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 mb-1 block">
                              Logo URL
                            </label>
                            <input
                              value={m.logo}
                              onChange={(e) =>
                                updateExtra(i, "logo", e.target.value)
                              }
                              placeholder="https://..."
                              className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1 block">
                                Min (৳)
                              </label>
                              <input
                                type="number"
                                value={m.min ?? 500}
                                onChange={(e) =>
                                  updateExtra(i, "min", e.target.value)
                                }
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-400 mb-1 block">
                                Max (৳)
                              </label>
                              <input
                                type="number"
                                value={m.max ?? 30000}
                                onChange={(e) =>
                                  updateExtra(i, "max", e.target.value)
                                }
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* âœ… BD Agent Deposit Limits */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Deposit Limits per Method
                    </p>
                    {[
                      {
                        label: "bKash",
                        minKey: "bkashMin",
                        maxKey: "bkashMax",
                      },
                      {
                        label: "Nagad",
                        minKey: "nagadMin",
                        maxKey: "nagadMax",
                      },
                      {
                        label: "Rocket",
                        minKey: "rocketMin",
                        maxKey: "rocketMax",
                      },
                    ].map(({ label, minKey, maxKey }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-2"
                      >
                        <p className="text-xs text-slate-300 font-semibold">
                          {label} Limits
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">
                              Min (৳)
                            </label>
                            <input
                              type="number"
                              value={form[minKey] ?? 500}
                              onChange={(e) =>
                                setForm((p: any) => ({
                                  ...p,
                                  [minKey]: Number(e.target.value),
                                }))
                              }
                              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">
                              Max (৳)
                            </label>
                            <input
                              type="number"
                              value={form[maxKey] ?? 30000}
                              onChange={(e) =>
                                setForm((p: any) => ({
                                  ...p,
                                  [maxKey]: Number(e.target.value),
                                }))
                              }
                              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {field("WhatsApp Number *", "whatsappNumber", "+880...")}
                  {field("WhatsApp Icon URL", "whatsappIcon", "https://...")}

                  {/* âœ… Global Agent Country */}
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1.5 block">
                      Country
                    </label>
                    <input
                      value={form.country ?? ""}
                      onChange={(e) =>
                        setForm((p: any) => ({
                          ...p,
                          country: e.target.value,
                        }))
                      }
                      placeholder="e.g. Bangladesh, India..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* âœ… Global Agent WhatsApp Deposit Limits */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-300 font-semibold">
                        WhatsApp Deposit Limits
                      </p>
                      <button
                        onClick={() =>
                          setForm((p: any) => ({
                            ...p,
                            whatsappNumber: "",
                            whatsappIcon: "",
                            country: "",
                            whatsappMin: 500,
                            whatsappMax: 30000,
                          }))
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">
                          Min (৳)
                        </label>
                        <input
                          type="number"
                          value={form.whatsappMin ?? 500}
                          onChange={(e) =>
                            setForm((p: any) => ({
                              ...p,
                              whatsappMin: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">
                          Max (৳)
                        </label>
                        <input
                          type="number"
                          value={form.whatsappMax ?? 30000}
                          onChange={(e) =>
                            setForm((p: any) => ({
                              ...p,
                              whatsappMax: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeForm}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isCreating || isUpdating}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating || isUpdating
                  ? "Saving..."
                  : editTarget
                    ? "Update"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
