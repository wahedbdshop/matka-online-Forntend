"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, X } from "lucide-react";
import { AdminService } from "@/services/admin.service";

type ExtraMethod = {
  name: string;
  number: string;
  logo: string;
  min?: number;
  max?: number;
};

type AgentForm = {
  type: "BD_AGENT" | "GLOBAL_AGENT";
  name: string;
  email: string;
  phone: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  bkashLogo: string;
  nagadLogo: string;
  rocketLogo: string;
  upayLogo: string;
  whatsappNumber: string;
  whatsappIcon: string;
  country: string;
  extraMethods: ExtraMethod[];
  bkashMin: number;
  bkashMax: number;
  nagadMin: number;
  nagadMax: number;
  rocketMin: number;
  rocketMax: number;
  upayMin: number;
  upayMax: number;
  whatsappMin: number;
  whatsappMax: number;
};

const EMPTY_BD: AgentForm = {
  type: "BD_AGENT",
  name: "",
  email: "",
  phone: "",
  bkashNumber: "",
  nagadNumber: "",
  rocketNumber: "",
  upayNumber: "",
  bkashLogo: "",
  nagadLogo: "",
  rocketLogo: "",
  upayLogo: "",
  whatsappNumber: "",
  whatsappIcon: "",
  country: "",
  extraMethods: [],
  bkashMin: 500,
  bkashMax: 30000,
  nagadMin: 500,
  nagadMax: 30000,
  rocketMin: 500,
  rocketMax: 30000,
  upayMin: 500,
  upayMax: 30000,
  whatsappMin: 500,
  whatsappMax: 30000,
};

const EMPTY_GLOBAL: AgentForm = {
  ...EMPTY_BD,
  type: "GLOBAL_AGENT",
};

function getCustomMethodTheme() {
  return {
    card: "border-emerald-500/20 bg-slate-800/50",
    title: "text-emerald-400",
    focus: "focus:border-blue-500",
  };
}

type AgentResponse = Partial<AgentForm> & {
  type?: "BD_AGENT" | "GLOBAL_AGENT";
};

function normalizeAgentForm(agent?: AgentResponse): AgentForm {
  const base = agent?.type === "GLOBAL_AGENT" ? EMPTY_GLOBAL : EMPTY_BD;

  return {
    ...base,
    ...agent,
    extraMethods: agent?.extraMethods ?? [],
    bkashMin: Number(agent?.bkashMin ?? base.bkashMin),
    bkashMax: Number(agent?.bkashMax ?? base.bkashMax),
    nagadMin: Number(agent?.nagadMin ?? base.nagadMin),
    nagadMax: Number(agent?.nagadMax ?? base.nagadMax),
    rocketMin: Number(agent?.rocketMin ?? base.rocketMin),
    rocketMax: Number(agent?.rocketMax ?? base.rocketMax),
    upayMin: Number(agent?.upayMin ?? base.upayMin),
    upayMax: Number(agent?.upayMax ?? base.upayMax),
    whatsappMin: Number(agent?.whatsappMin ?? base.whatsappMin),
    whatsappMax: Number(agent?.whatsappMax ?? base.whatsappMax),
  };
}

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = params?.id;
  const [draftForm, setDraftForm] = useState<AgentForm | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agent", agentId],
    queryFn: () => AdminService.getAgentById(agentId),
    enabled: !!agentId,
  });

  const loadedForm = normalizeAgentForm(data?.data as AgentResponse | undefined);
  const form = draftForm ?? loadedForm;

  const setForm = (updater: AgentForm | ((prev: AgentForm) => AgentForm)) => {
    setDraftForm((prev) => {
      const current = prev ?? loadedForm;
      return typeof updater === "function" ? updater(current) : updater;
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: AgentForm) => AdminService.updateAgent(agentId, payload),
    onSuccess: () => {
      toast.success("Agent updated");
      router.push("/admin/agents");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message || "Failed"),
  });

  const field = (
    label: string,
    key: keyof AgentForm,
    placeholder = "",
    maxLength?: number,
  ) => (
    <div key={String(key)}>
      <label className="mb-1 block text-[11px] text-slate-400">{label}</label>
      <input
        value={String(form[key] ?? "")}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, [key]: e.target.value }))
        }
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>
  );

  const updateExtra = (i: number, key: keyof ExtraMethod, value: string) => {
    const arr = [...form.extraMethods];
    arr[i] = { ...arr[i], [key]: value };
    setForm((prev) => ({ ...prev, extraMethods: arr }));
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-slate-400">Loading agent...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/agents")}
            className="mb-2 inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
          <h1 className="text-xl font-bold text-white">Edit Agent</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Update agent numbers, limits and payment methods
          </p>
        </div>
      </div>

      <div className="space-y-5 rounded-[20px] border border-slate-700 bg-slate-900 p-5">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Basic Information
              </h2>
              <p className="text-[11px] text-slate-500">
                Update agent identity and contact details
              </p>
            </div>
            <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300">
              {form.type === "BD_AGENT" ? "BD Agent" : "Global Agent"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {field("Name *", "name", "Agent name")}
            {field("Email", "email", "email@example.com")}
            {field("Phone", "phone", "+880...")}
          </div>
        </div>

        {form.type === "BD_AGENT" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Payment Numbers
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Keep each method with its own amount limits
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-pink-500/20 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-pink-400">Bkash</p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
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
                  {field("Number", "bkashNumber", "01XXXXXXXXX", 11)}
                  {field("Logo URL", "bkashLogo", "https://...")}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Min (৳)
                      </label>
                      <input
                        type="number"
                        value={form.bkashMin}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            bkashMin: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-pink-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Max (৳)
                      </label>
                      <input
                        type="number"
                        value={form.bkashMax}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            bkashMax: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-pink-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-orange-500/20 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-orange-400">
                      Nagad
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
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
                  {field("Number", "nagadNumber", "01XXXXXXXXX", 11)}
                  {field("Logo URL", "nagadLogo", "https://...")}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Min (৳)
                      </label>
                      <input
                        type="number"
                        value={form.nagadMin}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            nagadMin: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Max (৳)
                      </label>
                      <input
                        type="number"
                        value={form.nagadMax}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            nagadMax: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-purple-500/20 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-purple-400">
                      Rocket
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
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
                  {field("Number", "rocketNumber", "01XXXXXXXXX", 11)}
                  {field("Logo URL", "rocketLogo", "https://...")}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Min (৳)
                      </label>
                      <input
                        type="number"
                        value={form.rocketMin}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rocketMin: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Max (৳)
                      </label>
                      <input
                        type="number"
                        value={form.rocketMax}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            rocketMax: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-sky-500/20 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-sky-400">
                      Upay
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          upayNumber: "",
                          upayLogo: "",
                          upayMin: 500,
                          upayMax: 30000,
                        }))
                      }
                      className="text-slate-500 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {field("Number", "upayNumber", "01XXXXXXXXX", 11)}
                  {field("Logo URL", "upayLogo", "https://...")}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Min (৳)
                      </label>
                      <input
                        type="number"
                        value={form.upayMin}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            upayMin: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-500">
                        Max (৳)
                      </label>
                      <input
                        type="number"
                        value={form.upayMax}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            upayMax: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        extraMethods: [
                          {
                            name: "",
                            number: "",
                            logo: "",
                            min: 500,
                            max: 30000,
                          },
                          ...prev.extraMethods,
                        ],
                      }))
                    }
                    className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-blue-400/50 hover:text-blue-200"
                  >
                    + Add Method
                  </button>
                </div>

                {form.extraMethods.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {form.extraMethods.map((method, i) => (
                      <div
                        key={`${method.name}-${i}`}
                        className={`space-y-3 rounded-xl border p-4 ${getCustomMethodTheme().card}`}
                      >
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs font-semibold ${getCustomMethodTheme().title}`}
                            >
                              {method.name?.trim() || "Custom Method"}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  extraMethods: prev.extraMethods.filter(
                                    (_, j) => j !== i,
                                  ),
                                }))
                              }
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-400">
                                Name
                              </label>
                              <input
                                value={method.name}
                                onChange={(e) =>
                                  updateExtra(i, "name", e.target.value)
                                }
                                placeholder="e.g. SureCash"
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] text-slate-400">
                                Number
                              </label>
                              <input
                                value={method.number}
                                onChange={(e) =>
                                  updateExtra(i, "number", e.target.value)
                                }
                                placeholder="01XXXXXXXXX"
                                maxLength={11}
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] text-slate-400">
                                Logo URL
                              </label>
                              <input
                                value={method.logo}
                                onChange={(e) =>
                                  updateExtra(i, "logo", e.target.value)
                                }
                                placeholder="https://..."
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] text-slate-500">
                                Min (৳)
                              </label>
                              <input
                                type="number"
                                value={method.min ?? 500}
                                onChange={(e) =>
                                  updateExtra(i, "min", e.target.value)
                                }
                                className={`w-full rounded-lg border border-slate-600 bg-slate-700 px-2 py-1.5 text-xs text-white outline-none ${getCustomMethodTheme().focus}`}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] text-slate-500">
                                Max (৳)
                              </label>
                              <input
                                type="number"
                                value={method.max ?? 30000}
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
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-green-500/20 bg-slate-800/40 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      WhatsApp Agent
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Number, country and amount control in one section
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
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
                <div className="grid gap-3 md:grid-cols-2">
                  {field("WhatsApp Number *", "whatsappNumber", "+880...")}
                  {field("WhatsApp Icon URL", "whatsappIcon", "https://...")}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-[11px] text-slate-400">
                      Country
                    </label>
                    <input
                      value={form.country}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="e.g. Bangladesh, India..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">
                      Min (৳)
                    </label>
                    <input
                      type="number"
                      value={form.whatsappMin}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          whatsappMin: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">
                      Max (৳)
                    </label>
                    <input
                      type="number"
                      value={form.whatsappMax}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          whatsappMax: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-green-400"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => router.push("/admin/agents")}
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutate(form)}
            disabled={isPending}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}


