/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, CircleDot, Plus, Search, X } from "lucide-react";
import { getBangladeshDateISO, hasUtcScheduleTimePassed } from "@/lib/timezone";
import { getKalyanMarketSessionLabel } from "@/lib/kalyan-market-display";
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
type SessionType = "OPEN" | "CLOSE";
type GameOption = {
  value: string;
  label: string;
  marketId: string;
  sessionType: SessionType;
};

function getTodayDate() {
  return getBangladeshDateISO();
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

function isSessionTimeOver(
  selectedDate: string,
  sessionEndTime?: string | null,
) {
  const today = getTodayDate();

  if (!selectedDate || selectedDate > today) {
    return false;
  }

  if (selectedDate < today) {
    return true;
  }

  const endMinutes = getMinutesFromTime(sessionEndTime);
  if (endMinutes === null) {
    return false;
  }

  return hasUtcScheduleTimePassed(sessionEndTime);
}

function isActiveEntity(value: unknown) {
  return String(value ?? "").trim().toUpperCase() === "ACTIVE";
}

function isSessionPublished(result: any, sessionType: SessionType) {
  if (!result) return false;

  const normalizedResultSession = String(result?.sessionType ?? "").toUpperCase();

  if (normalizedResultSession === sessionType) {
    if (typeof result?.isPublished === "boolean") return result.isPublished;
    const status = String(result?.status ?? "").toUpperCase();
    if (status === "PUBLISHED" || status === "ACTIVE" || status === "COMPLETED") return true;
  }

  if (sessionType === "OPEN") {
    return !!result?.openPatti && result.openPatti !== "000";
  }

  return !!result?.closePatti && result.closePatti !== "000";
}

function findSessionResult(
  publishedResults: any[],
  marketId: string,
  sessionType: SessionType,
) {
  return publishedResults.find((result: any) => {
    if (result?.marketId !== marketId) return false;
    const resultSession = String(result?.sessionType ?? "").toUpperCase();
    if (resultSession === sessionType) return true;

    if (!resultSession) {
      if (sessionType === "OPEN") {
        return !!result?.openPatti && result.openPatti !== "000";
      }

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

type SessionResultCardProps = {
  accentClassName: string;
  buttonClassName: string;
  cardDescription: string;
  cardTitle: string;
  emptyText: string;
  gameOptions: GameOption[];
  isFutureDate: boolean;
  isPending: boolean;
  onResultDateChange: (value: string) => void;
  onSubmit: (values: FormData, resetForm: () => void) => void;
  resultDate: string;
  sessionType: SessionType;
};

function SessionResultCard({
  accentClassName,
  buttonClassName,
  cardDescription,
  cardTitle,
  emptyText,
  gameOptions,
  isFutureDate,
  isPending,
  onResultDateChange,
  onSubmit,
  resultDate,
  sessionType,
}: SessionResultCardProps) {
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
      resultDate,
      gameSelection: "",
      number: "",
    },
  });
  const numberValue = useWatch({ control, name: "number" });
  const gameSelectionValue = useWatch({ control, name: "gameSelection" });
  const detectedCategory = inferPattiType(numberValue);
  const [gameSearch, setGameSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue("resultDate", resultDate, { shouldValidate: true });
  }, [resultDate, setValue]);

  useEffect(() => {
    if (
      gameSelectionValue &&
      !gameOptions.some((game) => game.value === gameSelectionValue)
    ) {
      setValue("gameSelection", "", { shouldValidate: true });
    }
  }, [gameOptions, gameSelectionValue, setValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGameOptions = useMemo(
    () =>
      gameSearch.trim()
        ? gameOptions.filter((game) =>
            game.label.toLowerCase().includes(gameSearch.trim().toLowerCase()),
          )
        : gameOptions,
    [gameOptions, gameSearch],
  );

  const selectedGameLabel =
    gameOptions.find((game) => game.value === gameSelectionValue)?.label ?? "";
  const canSubmit =
    !!resultDate &&
    !!gameOptions.find((game) => game.value === gameSelectionValue);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleDot className={`h-4 w-4 ${accentClassName}`} />
            <h2 className="text-base font-semibold text-white">{cardTitle}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">{cardDescription}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
            sessionType === "OPEN"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {sessionType}
        </span>
      </div>

      <form
        onSubmit={handleSubmit((values) =>
          onSubmit(values, () =>
            reset({
              resultDate,
              gameSelection: "",
              number: "",
            }),
          ),
        )}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={resultDate}
            onChange={(event) => onResultDateChange(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
          />
          {errors.resultDate && (
            <p className="text-[10px] text-red-400">{errors.resultDate.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Select Games <span className="text-red-400">*</span>
          </label>
          <input type="hidden" {...register("gameSelection")} />
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((previous) => !previous);
                setGameSearch("");
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <span className={selectedGameLabel ? "text-white" : "text-slate-500"}>
                {selectedGameLabel || emptyText}
              </span>
              <div className="flex items-center gap-1">
                {gameSelectionValue && (
                  <X
                    className="h-3.5 w-3.5 text-slate-400 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      setValue("gameSelection", "", { shouldValidate: true });
                      setDropdownOpen(false);
                    }}
                  />
                )}
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {dropdownOpen && (
              <div
                className="absolute z-20 mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
                onMouseDown={(event) => event.preventDefault()}
              >
                <div className="relative border-b border-slate-700 p-2">
                  <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={gameSearch}
                    onChange={(event) => setGameSearch(event.target.value)}
                    placeholder={`Search ${sessionType.toLowerCase()} game...`}
                    className="w-full rounded bg-slate-800 py-1.5 pl-7 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredGameOptions.length === 0 ? (
                    <p className="px-4 py-3 text-center text-xs text-slate-500">
                      No games found
                    </p>
                  ) : (
                    filteredGameOptions.map((game) => (
                      <button
                        key={game.value}
                        type="button"
                        onClick={() => {
                          setValue("gameSelection", game.value, {
                            shouldValidate: true,
                          });
                          setDropdownOpen(false);
                          setGameSearch("");
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-700 ${
                          gameSelectionValue === game.value
                            ? "bg-blue-600/20 text-blue-300"
                            : "text-white"
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
            {isFutureDate
              ? "Future dates cannot publish results."
              : `Only time-over unpublished ${sessionType.toLowerCase()} games are shown.`}
          </p>
          {errors.gameSelection && (
            <p className="text-[10px] text-red-400">
              {errors.gameSelection.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            placeholder={`Enter ${sessionType.toLowerCase()} number`}
            {...register("number")}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-white outline-none focus:border-blue-500"
          />
          <div className="flex min-h-5 items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400">
              Enter a 3 digit patti result.
            </p>
            <span className="text-right text-[10px] font-medium text-blue-300">
              {detectedCategory ? `Auto category: ${detectedCategory}` : ""}
            </span>
          </div>
          {errors.number && (
            <p className="text-[10px] text-red-400">{errors.number.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${buttonClassName}`}
        >
          {isPending
            ? "Submitting..."
            : `Submit ${sessionType === "OPEN" ? "Open" : "Close"} Result`}
        </button>
      </form>
    </div>
  );
}

export default function KalyanAddResultsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [resultDate, setResultDate] = useState(getTodayDate());
  const winHistoryPath = pathname?.startsWith("/agent/")
    ? "/agent/kalyan/win-history"
    : "/admin/kalyan/win-history";

  const { data: marketsData } = useQuery({
    queryKey: ["kalyan-markets-all"],
    queryFn: () => KalyanAdminService.getMarkets({ limit: 100 }),
  });

  const { data: resultsData } = useQuery({
    queryKey: ["kalyan-results-for-add", resultDate],
    queryFn: () =>
      KalyanAdminService.getResults({
        date: resultDate || undefined,
        page: 1,
        limit: 200,
      }),
    enabled: !!resultDate,
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
  const gameOptions = useMemo<GameOption[]>(() => {
    const selectedDate = resultDate || "";
    if (!selectedDate || selectedDate > getTodayDate()) {
      return [];
    }

    const rawOptions = markets.flatMap((market: any) => {
      if (!isActiveEntity(market?.status)) {
        return [];
      }

      const timings = timingOptionsByMarketId.get(market.id) ?? [];

      if (timings.length > 0) {
        return timings.flatMap((timing: any) => {
          const sessionType = String(
            timing?.sessionType ?? "",
          ).toUpperCase() as SessionType;
          const selectionValue = `${market.id}::${sessionType}`;
          const sessionResult = findSessionResult(
            publishedResults,
            market.id,
            sessionType,
          );
          const label = getKalyanMarketSessionLabel(
            {
              ...market,
              ...timing,
            },
            sessionType,
          );
          const sessionEndTime = timing?.closeTime ?? market?.closeTime;

          if (
            !isActiveEntity(timing?.status ?? market?.status) ||
            (sessionType !== "OPEN" && sessionType !== "CLOSE") ||
            !isSessionTimeOver(selectedDate, sessionEndTime) ||
            isSessionPublished(sessionResult, sessionType)
          ) {
            return [];
          }

          return [
            {
              value: selectionValue,
              label,
              marketId: market.id,
              sessionType,
            },
          ];
        });
      }

      const openResult = findSessionResult(publishedResults, market.id, "OPEN");
      const closeResult = findSessionResult(
        publishedResults,
        market.id,
        "CLOSE",
      );
      const closeTime = getMinutesFromTime(market.closeTime);
      const options: GameOption[] = [];

      if (
        market.openName &&
        closeTime !== null &&
        isSessionTimeOver(selectedDate, market.closeTime) &&
        !isSessionPublished(openResult, "OPEN")
      ) {
        options.push({
          value: `${market.id}::OPEN`,
          label: `${market.openName} (Open)`,
          marketId: market.id,
          sessionType: "OPEN",
        });
      }

      if (
        market.closeName &&
        closeTime !== null &&
        isSessionTimeOver(selectedDate, market.closeTime) &&
        !isSessionPublished(closeResult, "CLOSE")
      ) {
        options.push({
          value: `${market.id}::CLOSE`,
          label: `${market.closeName} (Close)`,
          marketId: market.id,
          sessionType: "CLOSE",
        });
      }

      return options;
    });

    return rawOptions.filter(
      (option, index, array) =>
        array.findIndex((entry) => entry.value === option.value) === index,
    );
  }, [markets, publishedResults, resultDate, timingOptionsByMarketId]);

  const openGameOptions = useMemo(
    () => gameOptions.filter((option) => option.sessionType === "OPEN"),
    [gameOptions],
  );
  const closeGameOptions = useMemo(
    () => gameOptions.filter((option) => option.sessionType === "CLOSE"),
    [gameOptions],
  );
  const isFutureDate = resultDate > getTodayDate();

  const handleMutationSuccess = async (
    values: FormData,
    resetForm: () => void,
  ) => {
    const [marketId, sessionType] = values.gameSelection.split("::");
    resetForm();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["kalyan-results-for-add"] }),
      queryClient.invalidateQueries({ queryKey: ["kalyan-results-update"] }),
      queryClient.invalidateQueries({ queryKey: ["kalyan-win-history"] }),
      queryClient.invalidateQueries({ queryKey: ["kalyan-win-history-all-markets"] }),
      queryClient.invalidateQueries({ queryKey: ["kalyan-win-history-all-markets-base"] }),
    ]);
    toast.success(`Result added for ${values.resultDate}`);
    const params = new URLSearchParams();
    if (marketId) params.set("marketId", marketId);
    if (sessionType === "OPEN" || sessionType === "CLOSE") {
      params.set("sessionType", sessionType);
    }
    if (sessionType === "CLOSE") {
      params.set("settlementView", "close-final");
    }
    if (values.resultDate) params.set("date", values.resultDate);
    params.set("resultAddedAt", String(Date.now()));
    router.push(`${winHistoryPath}?${params.toString()}`);
  };

  const { mutate: createOpenResult, isPending: isOpenPending } = useMutation({
    mutationFn: ({
      values,
    }: {
      values: FormData;
      resetForm: () => void;
    }) => {
      const [marketId] = values.gameSelection.split("::");

      return KalyanAdminService.createResult({
        marketId,
        resultDate: values.resultDate,
        openPatti: values.number,
      });
    },
    onSuccess: async (_data, variables) => {
      await handleMutationSuccess(variables.values, variables.resetForm);
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to add open result"),
  });

  const { mutate: createCloseResult, isPending: isClosePending } =
    useMutation({
      mutationFn: ({
        values,
      }: {
        values: FormData;
        resetForm: () => void;
      }) => {
        const [marketId] = values.gameSelection.split("::");

        return KalyanAdminService.createResult({
          marketId,
          resultDate: values.resultDate,
          closePatti: values.number,
        });
      },
      onSuccess: async (_data, variables) => {
        await handleMutationSuccess(variables.values, variables.resetForm);
      },
      onError: (error: any) =>
        toast.error(
          error?.response?.data?.message || "Failed to add close result",
        ),
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
          <Plus className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Add Game Result</h1>
          <p className="text-xs text-slate-400">
            Add results by date, game, and number. Open and Close sessions are
            now separated into their own cards.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SessionResultCard
          accentClassName="text-emerald-400"
          buttonClassName="bg-emerald-600 hover:bg-emerald-700"
          cardDescription="Publish pending open session results without leaving this page."
          cardTitle="Open Result"
          emptyText="Select open game"
          gameOptions={openGameOptions}
          isFutureDate={isFutureDate}
          isPending={isOpenPending}
          onResultDateChange={setResultDate}
          onSubmit={(values, resetForm) =>
            createOpenResult({ values, resetForm })
          }
          resultDate={resultDate}
          sessionType="OPEN"
        />

        <SessionResultCard
          accentClassName="text-rose-400"
          buttonClassName="bg-rose-600 hover:bg-rose-700"
          cardDescription="Publish pending close session results with a dedicated form."
          cardTitle="Close Result"
          emptyText="Select close game"
          gameOptions={closeGameOptions}
          isFutureDate={isFutureDate}
          isPending={isClosePending}
          onResultDateChange={setResultDate}
          onSubmit={(values, resetForm) =>
            createCloseResult({ values, resetForm })
          }
          resultDate={resultDate}
          sessionType="CLOSE"
        />
      </div>
    </div>
  );
}
