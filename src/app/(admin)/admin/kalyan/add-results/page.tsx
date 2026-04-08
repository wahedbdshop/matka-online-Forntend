/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { KalyanAdminService } from "@/services/kalyanAdmin.service";

const schema = z.object({
  resultDate: z.string().min(1, "Date is required"),
  gameSelection: z.string().min(1, "Games is required"),
  number: z
    .string()
    .min(1, "Number is required")
    .regex(/^\d{3}$/, "Enter a valid 3 digit result number"),
});

type FormData = z.infer<typeof schema>;

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMinutesFromTime(value?: string | null) {
  if (!value) return null;

  const [hoursText = "0", minutesText = "0"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getNormalizedOutcomeStatus(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function isEntryRemovedOrCancelled(value: unknown) {
  const normalized = getNormalizedOutcomeStatus(value);
  return normalized === "CANCELLED" || normalized === "CANCEL" || normalized === "REMOVED";
}

function isActiveEntity(value: unknown) {
  return String(value ?? "").trim().toUpperCase() === "ACTIVE";
}

function isSessionPublished(result: any, sessionType: "OPEN" | "CLOSE") {
  if (!result) return false;

  const normalizedResultSession = String(result?.sessionType ?? "").toUpperCase();

  if (normalizedResultSession === sessionType) {
    if (typeof result?.isPublished === "boolean") return result.isPublished;
    const status = String(result?.status ?? "").toUpperCase();
    if (status === "PUBLISHED" || status === "ACTIVE" || status === "COMPLETED") return true;
  }

  // Fallback: detect by patti field regardless of sessionType field
  if (sessionType === "OPEN") {
    return !!result?.openPatti && result.openPatti !== "000";
  }

  return !!result?.closePatti && result.closePatti !== "000";
}

function findSessionResult(publishedResults: any[], marketId: string, sessionType: "OPEN" | "CLOSE") {
  return publishedResults.find((result: any) => {
    if (result?.marketId !== marketId) return false;
    const rs = String(result?.sessionType ?? "").toUpperCase();
    if (rs === sessionType) return true;
    // No sessionType on result — check patti fields
    if (!rs) {
      if (sessionType === "OPEN") return !!result?.openPatti && result.openPatti !== "000";
      return !!result?.closePatti && result.closePatti !== "000";
    }
    return false;
  });
}

function inferPattiType(value?: string) {
  const normalized = String(value ?? "").trim();

  if (!/^\d{3}$/.test(normalized)) return "";

  const uniqueCount = new Set(normalized.split("")).size;

  if (uniqueCount === 3) return "Single Patti";
  if (uniqueCount === 2) return "Double Patti";
  if (uniqueCount === 1) return "Triple Patti";

  return "";
}


export default function KalyanAddResultsPage() {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      resultDate: getTodayDate(),
      gameSelection: "",
      number: "",
    },
  });
  const numberValue = useWatch({ control, name: "number" });
  const resultDateValue = useWatch({ control, name: "resultDate" });
  const gameSelectionValue = useWatch({ control, name: "gameSelection" });
  const detectedCategory = inferPattiType(numberValue);
  const [gameSearch, setGameSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data: resultsData } = useQuery({
    queryKey: ["kalyan-results-for-add", resultDateValue],
    queryFn: () =>
      KalyanAdminService.getResults({
        date: resultDateValue || undefined,
        page: 1,
        limit: 200,
      }),
    enabled: !!resultDateValue,
  });
  const { data: entriesData } = useQuery({
    queryKey: ["kalyan-entries-for-add-result", resultDateValue],
    queryFn: () =>
      KalyanAdminService.getAdminEntries({
        date: resultDateValue || undefined,
        page: 1,
        limit: 1000,
      }),
    enabled: !!resultDateValue,
  });

  const markets = useMemo<any[]>(
    () => marketsData?.data?.markets ?? marketsData?.data ?? [],
    [marketsData],
  );
  const timingQueries = useQueries({
    queries: markets.map((market: any) => ({
      queryKey: ["kalyan-timing", market.id],
      queryFn: () => KalyanAdminService.getMarketTiming(market.id),
      enabled: !!market.id,
    })),
  });
  const timingOptionsByMarketId = useMemo(
    () =>
      new Map(
        markets.map((market: any, index: number) => {
          const timingData = timingQueries[index]?.data;
          const timings = Array.isArray(timingData?.data)
            ? timingData.data
            : timingData?.data
              ? [timingData.data]
              : [];
          return [market.id, timings];
        }),
      ),
    [markets, timingQueries],
  );
  const publishedResults = useMemo<any[]>(
    () => resultsData?.data?.results ?? resultsData?.data ?? [],
    [resultsData],
  );
  const entries = useMemo<any[]>(
    () => entriesData?.data?.entries ?? entriesData?.data ?? [],
    [entriesData],
  );
  const gameOptions = useMemo(() => {
    const selectedDate = resultDateValue || "";
    const today = getTodayDate();
    const isFutureDate = selectedDate > today;
    const isToday = selectedDate === today;

    if (!selectedDate || isFutureDate) {
      return [];
    }

    const currentMinutes = isToday
      ? (() => {
          const now = new Date();
          return now.getHours() * 60 + now.getMinutes();
        })()
      : Number.POSITIVE_INFINITY;
    const rawOptions = markets.flatMap((market: any) => {
      if (!isActiveEntity(market?.status)) {
        return [];
      }

      const timings = timingOptionsByMarketId.get(market.id) ?? [];

      if (timings.length > 0) {
        return timings.flatMap((timing: any) => {
          const sessionType = String(timing?.sessionType ?? "").toUpperCase();
          const selectionValue = `${market.id}::${sessionType}`;
          const sessionResult = findSessionResult(publishedResults, market.id, sessionType as "OPEN" | "CLOSE");
          const closeTime = getMinutesFromTime(timing?.closeTime);
          const gameName =
            timing?.gameName ??
            (sessionType === "CLOSE" ? market.closeName : market.openName) ??
            market.name;
          const label = `${gameName} (${sessionType === "CLOSE" ? "Close" : "Open"})`;

          if (
            !isActiveEntity(timing?.status ?? market?.status) ||
            (sessionType !== "OPEN" && sessionType !== "CLOSE") ||
            closeTime === null ||
            currentMinutes < closeTime ||
            isSessionPublished(sessionResult, sessionType as "OPEN" | "CLOSE")
          ) {
            return [];
          }

          return [
            {
              value: selectionValue,
              label,
            },
          ];
        });
      }

      const openSelectionValue = `${market.id}::OPEN`;
      const closeSelectionValue = `${market.id}::CLOSE`;
      const openResult = findSessionResult(publishedResults, market.id, "OPEN");
      const closeResult = findSessionResult(publishedResults, market.id, "CLOSE");
      const openTime = getMinutesFromTime(market.openTime);
      const closeTime = getMinutesFromTime(market.closeTime);
      const options = [];

      if (
        market.openName &&
        openTime !== null &&
        currentMinutes >= openTime &&
        !isSessionPublished(openResult, "OPEN")
      ) {
        options.push({
          value: openSelectionValue,
          label: `${market.openName} (Open)`,
        });
      }

      if (
        market.closeName &&
        closeTime !== null &&
        currentMinutes >= closeTime &&
        !isSessionPublished(closeResult, "CLOSE")
      ) {
        options.push({
          value: closeSelectionValue,
          label: `${market.closeName} (Close)`,
        });
      }

      return options;
    });

    return rawOptions.filter(
      (option, index, array) =>
        array.findIndex(
          (entry) => entry.value === option.value,
        ) === index,
    );
  }, [markets, publishedResults, resultDateValue, timingOptionsByMarketId]);
  const filteredGameOptions = useMemo(
    () =>
      gameSearch.trim()
        ? gameOptions.filter((g) =>
            g.label.toLowerCase().includes(gameSearch.trim().toLowerCase()),
          )
        : gameOptions,
    [gameOptions, gameSearch],
  );

  const selectedGameLabel = gameOptions.find((g) => g.value === gameSelectionValue)?.label ?? "";

  const canSubmit = !!resultDateValue && !!gameOptions.find((game) => game.value === gameSelectionValue);

  const { mutate: createResult, isPending } = useMutation({
    mutationFn: (values: FormData) => {
      const [marketId, sessionType] = values.gameSelection.split("::");

      return KalyanAdminService.createResult({
        marketId,
        resultDate: values.resultDate,
        openPatti: sessionType === "OPEN" ? values.number : "000",
        closePatti: sessionType === "CLOSE" ? values.number : "000",
      });
    },
    onSuccess: (_data, values) => {
      const [marketId] = values.gameSelection.split("::");
      toast.success("Result added successfully");
      reset();
      router.push(
        `/admin/kalyan/win-history?date=${encodeURIComponent(values.resultDate)}&marketId=${encodeURIComponent(marketId)}`,
      );
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to add result"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
          <Plus className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Add Game Result</h1>
          <p className="text-xs text-slate-400">Add result by date, game, and number. Category will detect automatically.</p>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <form onSubmit={handleSubmit((values) => createResult(values))} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                {...register("resultDate")}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              {errors.resultDate && <p className="text-[10px] text-red-400">{errors.resultDate.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Select Games <span className="text-red-400">*</span>
              </label>
              <input type="hidden" {...register("gameSelection")} />
              <div ref={dropdownRef} className="relative">
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen((prev) => !prev);
                    setGameSearch("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <span className={selectedGameLabel ? "text-white" : "text-slate-500"}>
                    {selectedGameLabel || "Select games"}
                  </span>
                  <div className="flex items-center gap-1">
                    {gameSelectionValue && (
                      <X
                        className="h-3.5 w-3.5 text-slate-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setValue("gameSelection", "", { shouldValidate: true });
                          setDropdownOpen(false);
                        }}
                      />
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {/* Search inside dropdown */}
                    <div className="relative border-b border-slate-700 p-2">
                      <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={gameSearch}
                        onChange={(e) => setGameSearch(e.target.value)}
                        placeholder="Search game name..."
                        className="w-full rounded bg-slate-800 py-1.5 pl-7 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {/* Options list */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredGameOptions.length === 0 ? (
                        <p className="px-4 py-3 text-center text-xs text-slate-500">No games found</p>
                      ) : (
                        filteredGameOptions.map((game) => (
                          <button
                            key={game.value}
                            type="button"
                            onClick={() => {
                              setValue("gameSelection", game.value, { shouldValidate: true });
                              setDropdownOpen(false);
                              setGameSearch("");
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-700 ${
                              gameSelectionValue === game.value ? "bg-blue-600/20 text-blue-300" : "text-white"
                            }`}
                          >
                            {game.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {resultDateValue > getTodayDate()
                  ? "Future dates cannot publish results."
                  : "Only games with placed bets, expired time, and pending results are shown."}
              </p>
              {errors.gameSelection && <p className="text-[10px] text-red-400">{errors.gameSelection.message}</p>}
            </div>

<div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="Enter number"
                {...register("number")}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-white outline-none focus:border-blue-500"
              />
              <div className="flex min-h-5 items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  Enter a 3 digit patti result.
                </p>
                <span className="text-[10px] font-medium text-blue-300">
                  {detectedCategory ? `Auto category: ${detectedCategory}` : ""}
                </span>
              </div>
              {errors.number && <p className="text-[10px] text-red-400">{errors.number.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
