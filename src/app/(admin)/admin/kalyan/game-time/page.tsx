/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Clock3, Pencil, Plus, X } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const MARKET_LIST_LIMIT = 1000;

const timingSchema = z.object({
  marketId: z.string().min(1, "Game is required"),
  gameName: z.string().min(1, "Game name is required"),
  sessionType: z.enum(["OPEN", "CLOSE"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  closeTime: z.string().min(1, "Close time required"),
});

const createMarketSchema = z.object({
  gameName: z.string().min(1, "Games name is required"),
  sessionType: z.enum(["OPEN", "CLOSE"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  closeTime: z.string().min(1, "Close time required"),
});

type TimingForm = z.infer<typeof timingSchema>;
type CreateMarketForm = z.infer<typeof createMarketSchema>;

type EditTarget = {
  marketId: string;
  timing: any | null;
};

const SESSION_STYLES: Record<string, string> = {
  OPEN: "border-green-500/30 bg-green-500/15 text-green-400",
  CLOSE: "border-red-500/30 bg-red-500/15 text-red-400",
};
const FIXED_OPEN_TIME = "00:00";
const FIXED_OPEN_TIME_LABEL = "12:00 AM";

function sortMarketsByOldest<T extends { createdAt?: string; id?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
  });
}

function getTimingList(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  if (data?.data) return [data.data];
  return [];
}

function formatTimeLabel(time?: string | null) {
  if (!time) return "-";

  const [hourText = "0", minuteText = "0"] = time.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function resolveCreatedMarketId(created: any, markets: any[], marketName: string) {
  const directId =
    created?.data?.id ??
    created?.data?.market?.id ??
    created?.data?.data?.id ??
    created?.id;

  if (directId) {
    return directId;
  }

  const normalizedName = marketName.trim().toLowerCase();
  return markets.find((market) => market.name?.trim().toLowerCase() === normalizedName)?.id;
}

function buildCreateMarketPayload(values: CreateMarketForm) {
  const trimmedGameName = values.gameName.trim();
  const baseName = trimmedGameName.replace(/\s+close$/i, "").trim() || trimmedGameName;

  return {
    name: baseName,
    openName: values.sessionType === "OPEN" ? trimmedGameName : undefined,
    closeName: values.sessionType === "CLOSE" ? trimmedGameName : undefined,
    status: values.status,
    openTime: FIXED_OPEN_TIME,
    closeTime: values.closeTime,
    sessionType: values.sessionType,
  };
}

export default function KalyanGameTimePage() {
  const queryClient = useQueryClient();
  const [marketFilter, setMarketFilter] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: marketsData, isLoading: loadingMarkets } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: MARKET_LIST_LIMIT }),
  });

  const markets = useMemo<any[]>(
    () => sortMarketsByOldest(marketsData?.data?.markets ?? marketsData?.data ?? []),
    [marketsData],
  );

  const filteredMarkets = useMemo(
    () => (marketFilter ? markets.filter((market: any) => market.id === marketFilter) : markets),
    [marketFilter, markets],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimingForm>({
    resolver: zodResolver(timingSchema),
    defaultValues: {
      marketId: "",
      gameName: "",
      sessionType: "OPEN",
      status: "ACTIVE",
      closeTime: "",
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<CreateMarketForm>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      gameName: "",
      sessionType: "OPEN",
      status: "ACTIVE",
      closeTime: "",
    },
  });

  const watchedGameName = watchCreate("gameName");
  const detectedSession: "OPEN" | "CLOSE" | null = /close/i.test(watchedGameName)
    ? "CLOSE"
    : /open/i.test(watchedGameName)
      ? "OPEN"
      : null;

  useEffect(() => {
    if (detectedSession) {
      setCreateValue("sessionType", detectedSession, { shouldValidate: false });
    }
  }, [detectedSession, setCreateValue]);

  const openEdit = (marketId: string, timing: any | null) => {
    const market = markets.find((m: any) => m.id === marketId);
    const currentName =
      timing?.gameName ??
      (timing?.sessionType === "CLOSE" ? market?.closeName : market?.openName) ??
      market?.name ??
      "";
    setEditTarget({ marketId, timing });
    reset({
      marketId,
      gameName: currentName,
      sessionType: timing?.sessionType ?? "OPEN",
      status: timing?.status ?? "ACTIVE",
      closeTime: timing?.closeTime ?? "",
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    reset({
      marketId: "",
      gameName: "",
      sessionType: "OPEN",
      status: "ACTIVE",
      closeTime: "",
    });
  };

  const closeCreate = () => {
    setCreateOpen(false);
    resetCreate({
      gameName: "",
      sessionType: "OPEN",
      status: "ACTIVE",
      closeTime: "",
    });
  };

  const { mutate: saveTiming, isPending: saving } = useMutation({
    mutationFn: async (values: TimingForm) => {
      const sessionType = editTarget?.timing?.sessionType ?? values.sessionType;

      await KalyanAdminService.updateMarket(values.marketId, {
        openName: sessionType === "OPEN" ? values.gameName.trim() : undefined,
        closeName: sessionType === "CLOSE" ? values.gameName.trim() : undefined,
      });

      // Update the edited session
      await KalyanAdminService.setMarketTiming(values.marketId, {
        sessionType,
        openTime: FIXED_OPEN_TIME,
        closeTime: values.closeTime,
        status: values.status,
      });

      // Sync all markets with the same base name (paired Open/Close markets)
      const currentMarket = markets.find((m: any) => m.id === values.marketId);
      const baseName = currentMarket?.name?.trim().toLowerCase();
      if (baseName) {
        const pairedMarkets = markets.filter(
          (m: any) => m.id !== values.marketId && m.name?.trim().toLowerCase() === baseName,
        );
        await Promise.all(
          pairedMarkets.map(async (paired: any) => {
            const pairedTimings = await KalyanAdminService.getMarketTiming(paired.id);
            const timingList: any[] = Array.isArray(pairedTimings.data)
              ? pairedTimings.data
              : pairedTimings.data
                ? [pairedTimings.data]
                : [];
            const t = timingList[0];
            if (t) {
              await KalyanAdminService.setMarketTiming(paired.id, {
                sessionType: t.sessionType,
                openTime: t.openTime ?? FIXED_OPEN_TIME,
                closeTime: t.closeTime,
                status: values.status,
              });
            }
          }),
        );
      }
    },
    onSuccess: () => {
      toast.success("Game time updated");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-timing"] });
      closeEdit();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update game time");
    },
  });

  const { mutate: createMarket, isPending: creating } = useMutation({
    mutationFn: async (values: CreateMarketForm) => {
      const created = await KalyanAdminService.createMarket(buildCreateMarketPayload(values));
      const marketId = resolveCreatedMarketId(created, markets, buildCreateMarketPayload(values).name);

      if (!marketId) {
        throw new Error("Created market id not found");
      }

      return marketId;
    },
    onSuccess: () => {
      toast.success("Game created");
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-markets-all"] });
      void queryClient.invalidateQueries({ queryKey: ["kalyan-timing"] });
      closeCreate();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "Failed to create game");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
            <Clock3 className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Game Time</h1>
            <p className="text-xs text-slate-400">Manage open and close times for each Kalyan game</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Add New Game
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={marketFilter}
          onChange={(event) => setMarketFilter(event.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
        >
          <option value="">All Games</option>
          {markets.map((market: any) => (
            <option key={market.id} value={market.id}>
              {market.openName ?? market.closeName ?? market.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-800/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-700/80 text-center">
              {["SI No.", "Game Name", "Open Time", "Close Time", "Status", "Action"].map((heading) => (
                <th key={heading} className="border-r border-slate-700/50 px-4 py-3 text-center text-xs font-medium text-slate-400 last:border-r-0">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingMarkets ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-700/50">
                  {Array.from({ length: 6 }).map((__, cellIndex) => (
                    <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredMarkets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  No games found.
                </td>
              </tr>
            ) : (
              filteredMarkets.map((market: any, index: number) => (
                <MarketTimingRow
                  key={market.id}
                  index={index}
                  market={market}
                  onEdit={openEdit}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(event) => {
          if (event.currentTarget === event.target) closeCreate();
        }}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Add New Game</h2>
                <p className="mt-1 text-xs text-slate-400">Create a new market and set its initial timing.</p>
              </div>
              <button type="button" onClick={closeCreate} className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit((values) => createMarket(values))} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Games Name</label>
                <input {...registerCreate("gameName")} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                {createErrors.gameName ? <p className="text-[10px] text-red-400">{createErrors.gameName.message}</p> : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Session Type</label>
                  <select
                    {...registerCreate("sessionType")}
                    disabled={!!detectedSession}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-semibold outline-none ${
                      detectedSession === "CLOSE"
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : detectedSession === "OPEN"
                          ? "border-green-500/40 bg-green-500/10 text-green-400"
                          : "border-slate-600 bg-slate-800 text-white focus:border-orange-500"
                    }`}
                  >
                    <option value="OPEN">Open</option>
                    <option value="CLOSE">Close</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Status</label>
                  <select {...registerCreate("status")} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Open Time</label>
                  <div className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300">
                    {FIXED_OPEN_TIME_LABEL}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Close Time</label>
                  <input type="time" {...registerCreate("closeTime")} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  {createErrors.closeTime ? <p className="text-[10px] text-red-400">{createErrors.closeTime.message}</p> : null}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeCreate} className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50">
                  {creating ? "Creating..." : "Create Game"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(event) => {
          if (event.currentTarget === event.target) closeEdit();
        }}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Edit Game Time</h2>
                <p className="mt-1 text-xs text-slate-400">Update the selected game timing and status.</p>
              </div>
              <button type="button" onClick={closeEdit} className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((values) =>
                saveTiming({
                  marketId: editTarget.marketId,
                  gameName: values.gameName,
                  sessionType: editTarget.timing?.sessionType ?? "OPEN",
                  status: values.status,
                  closeTime: values.closeTime,
                }),
              )}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Game Name</label>
                <input
                  {...register("gameName")}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
                  placeholder="Enter game name"
                />
                {errors.gameName ? <p className="text-[10px] text-red-400">{errors.gameName.message}</p> : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Session Type</label>
                  <div className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300">
                    {editTarget?.timing?.sessionType ?? "-"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Status</label>
                  <select {...register("status")} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {errors.status ? <p className="text-[10px] text-red-400">{errors.status.message}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Open Time</label>
                  <div className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-300">
                    {FIXED_OPEN_TIME_LABEL}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Close Time</label>
                  <input type="time" {...register("closeTime")} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                  {errors.closeTime ? <p className="text-[10px] text-red-400">{errors.closeTime.message}</p> : null}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeEdit} className="flex-1 rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function MarketTimingRow({
  index,
  market,
  onEdit,
}: {
  index: number;
  market: any;
  onEdit: (marketId: string, timing: any | null) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["kalyan-timing", market.id],
    queryFn: () => KalyanAdminService.getMarketTiming(market.id),
  });

  const timing = getTimingList(data)[0];

  if (isLoading) {
    return (
      <tr className="border-b border-slate-700/50">
        {Array.from({ length: 6 }).map((_, cellIndex) => (
          <td key={cellIndex} className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-700" />
          </td>
        ))}
      </tr>
    );
  }

  if (!timing) {
    return null;
  }

  return (
    <tr className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/20">
      <td className="border-r border-slate-700/40 px-4 py-3 text-center text-xs text-slate-500 last:border-r-0">{index + 1}</td>
      <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
        <div className="flex items-center justify-center gap-2">
          <span className="font-medium text-white">{timing.gameName ?? market.openName ?? market.closeName ?? market.name}</span>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${SESSION_STYLES[timing.sessionType] ?? SESSION_STYLES.OPEN}`}>
            {timing.sessionType}
          </span>
        </div>
      </td>
      <td className="border-r border-slate-700/40 px-4 py-3 text-center text-sm text-slate-300 last:border-r-0">{formatTimeLabel(timing.openTime)}</td>
      <td className="border-r border-slate-700/40 px-4 py-3 text-center text-sm text-slate-300 last:border-r-0">{formatTimeLabel(timing.closeTime)}</td>
      <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${timing.status === "ACTIVE" ? "border-green-500/30 bg-green-500/15 text-green-400" : "border-slate-500/30 bg-slate-500/15 text-slate-300"}`}>
          {timing.status}
        </span>
      </td>
      <td className="border-r border-slate-700/40 px-4 py-3 text-center last:border-r-0">
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => onEdit(market.id, timing)} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[11px] font-medium text-orange-400 transition-colors hover:bg-orange-500/20">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}
