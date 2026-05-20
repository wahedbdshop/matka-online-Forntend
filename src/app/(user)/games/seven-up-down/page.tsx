"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  SevenUpDownService,
  type SevenUpDownLeaderboardPlayer,
  type SevenUpDownSelection,
} from "@/services/seven-up-down.service";
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";

const presenceStorageKey = "seven_up_down_presence_session_id";

const BOARD_CELLS: Array<{
  selection: SevenUpDownSelection;
  label: string;
  accent: string;
  size: "main" | "total";
}> = [
  { selection: "DOWN", label: "2 - 6", accent: "green", size: "main" },
  { selection: "SEVEN", label: "7", accent: "blue", size: "main" },
  { selection: "UP", label: "8 - 12", accent: "red", size: "main" },
  { selection: "TOTAL_2", label: "2", accent: "green", size: "total" },
  { selection: "TOTAL_3", label: "3", accent: "green", size: "total" },
  { selection: "TOTAL_4", label: "4", accent: "green", size: "total" },
  { selection: "TOTAL_5", label: "5", accent: "green", size: "total" },
  { selection: "TOTAL_6", label: "6", accent: "green", size: "total" },
  { selection: "TOTAL_8", label: "8", accent: "green", size: "total" },
  { selection: "TOTAL_9", label: "9", accent: "green", size: "total" },
  { selection: "TOTAL_10", label: "10", accent: "green", size: "total" },
  { selection: "TOTAL_11", label: "11", accent: "green", size: "total" },
  { selection: "TOTAL_12", label: "12", accent: "green", size: "total" },
];

const CHIP_OPTIONS = [10, 20, 50, 100, 200, 500];

const getPresenceSessionId = () => {
  const existing = window.localStorage.getItem(presenceStorageKey);
  if (existing) return existing;
  const generated =
    window.crypto?.randomUUID?.() ??
    `sud-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(presenceStorageKey, generated);
  return generated;
};

const formatAmount = (value?: string | number) =>
  Number(value ?? 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  });

const getSecondsLeft = (locksAt?: string) => {
  if (!locksAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(locksAt).getTime() - Date.now()) / 1000),
  );
};

const getMaskedName = (value?: string | null) => {
  const normalized = value?.trim() || "player";
  return normalized.length <= 10 ? normalized : `${normalized.slice(0, 10)}...`;
};

const mapSelectionLabel = (selection: SevenUpDownSelection) =>
  selection.startsWith("TOTAL_") ? selection.replace("TOTAL_", "") : selection;

function PlayerBadge({
  player,
}: {
  player: SevenUpDownLeaderboardPlayer;
}) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#f0bf38] bg-[radial-gradient(circle_at_30%_25%,#ffd7cd_0%,#cc6c62_42%,#673b3b_100%)] shadow-[0_8px_15px_rgba(0,0,0,0.3)]">
        {player.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.image}
            alt={player.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">
            {(player.name || player.username || "U").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black text-white">
          {getMaskedName(player.username || player.name)}
        </p>
        <p className="text-[10px] font-black text-[#f0bf38]">
          {formatAmount(player.amount)}
        </p>
      </div>
    </div>
  );
}

function ResultRoadmap({
  history,
  range,
}: {
  history: Array<{
    roundCode: string;
    total: number | null;
    resultType: "DOWN" | "SEVEN" | "UP" | null;
  }>;
  range: { down: number; seven: number; up: number };
}) {
  const recent = history.slice(-14).reverse();

  return (
    <div className="rounded-t-[18px] bg-[linear-gradient(180deg,#6b1a0d_0%,#541108_100%)] px-2 py-1 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-1 pb-1 text-[10px] font-black text-[#ffd166]">
        <div className="flex items-center gap-2">
          <span>2~6 {range.down}%</span>
          <span>8~12 {range.up}%</span>
          <span>7 {range.seven}%</span>
        </div>
        <span className="text-[9px] text-[#e8caa9]">Calculated from last rounds.</span>
      </div>
      <div className="mt-1 flex gap-1 overflow-x-auto pb-1">
        {recent.map((round) => {
          const tone =
            round.resultType === "DOWN"
              ? "bg-[#2eb34f]"
              : round.resultType === "UP"
                ? "bg-[#d53023]"
                : "bg-[#148cd8]";
          return (
            <div
              key={round.roundCode}
              className="min-w-[34px] rounded-[8px] border border-white/10 bg-black/18 px-1 py-1 text-center text-[9px] font-black text-white"
            >
              <div className={`rounded-[4px] px-1 py-0.5 ${tone}`}>
                {round.total ?? "-"}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-[2px]">
                <span className="rounded-[2px] bg-white py-[3px] text-[8px] text-black">
                  {round.total ? "•" : ""}
                </span>
                <span className="rounded-[2px] bg-white py-[3px] text-[8px] text-black">
                  {round.total ? "•" : ""}
                </span>
                <span className="rounded-[2px] bg-white py-[3px] text-[8px] text-black">
                  {round.total ? "•" : ""}
                </span>
                <span className="rounded-[2px] bg-white py-[3px] text-[8px] text-black">
                  {round.total ? "•" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dice({
  value,
  rotateClass,
}: {
  value?: number | null;
  rotateClass: string;
}) {
  const pipMap: Record<number, number[]> = {
    1: [4],
    2: [1, 7],
    3: [1, 4, 7],
    4: [1, 3, 5, 7],
    5: [1, 3, 4, 5, 7],
    6: [1, 2, 3, 5, 6, 7],
  };
  const active = value ? pipMap[value] : [];

  return (
    <div
      className={`grid h-[76px] w-[76px] grid-cols-3 gap-1 rounded-[18px] border border-[#d5d8de] bg-[linear-gradient(180deg,#ffffff_0%,#eceef2_100%)] p-2 shadow-[0_18px_30px_rgba(0,0,0,0.28)] ${rotateClass}`}
    >
      {Array.from({ length: 9 }).map((_, index) => {
        const position = index + 1;
        return (
          <span
            key={position}
            className={`mx-auto my-auto h-3.5 w-3.5 rounded-full ${
              active.includes(position) ? "bg-[#db2b1f]" : "bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

function BetTile({
  label,
  payout,
  accent,
  selected,
  onClick,
  disabled,
  chipValue,
  showChip,
}: {
  label: string;
  payout: string;
  accent: "green" | "blue" | "red";
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  chipValue?: number;
  showChip?: boolean;
}) {
  const accentStyles = {
    green:
      "bg-[linear-gradient(180deg,#0db321_0%,#0a951b_100%)] text-[#f4ffdd]",
    blue:
      "bg-[linear-gradient(180deg,#11a3ff_0%,#1577d8_100%)] text-[#fff2b0]",
    red:
      "bg-[linear-gradient(180deg,#ff2c22_0%,#d71916_100%)] text-[#fff2d1]",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-[124px] overflow-hidden rounded-[8px] border border-white/35 px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ${accentStyles} ${
        selected ? "ring-2 ring-[#ffe084]" : ""
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_52%)]" />
      <div className="relative z-10">
        <p className="text-[20px] font-black tracking-wide">{label}</p>
        <p className="mt-1 text-[22px] font-black opacity-90">
          1:{payout}
        </p>
        <p className="mt-4 text-[34px] font-black opacity-12">
          {label === "7" ? "7" : label === "2 - 6" ? "DOWN" : "UP"}
        </p>
      </div>
      {showChip ? (
        <span className="absolute left-1/2 top-[56%] z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-[#d2d6d9] bg-[radial-gradient(circle_at_30%_25%,#f7fbff_0%,#9ea8af_100%)] text-[13px] font-black text-[#40525f] shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
          {chipValue}
        </span>
      ) : null}
    </button>
  );
}

function TotalTile({
  label,
  payout,
  selected,
  onClick,
  disabled,
  chipValue,
  showChip,
}: {
  label: string;
  payout: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  chipValue?: number;
  showChip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-[94px] rounded-[4px] border border-white/45 bg-[linear-gradient(180deg,#11b39a_0%,#059474_100%)] px-2 py-3 text-center text-[#0d4d37] shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] ${
        selected ? "ring-2 ring-[#ffe084]" : ""
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_45%)]" />
      <div className="relative z-10">
        <p className="text-[20px] font-black text-[#085643]">{label}</p>
        <p className="mt-1 text-[22px] font-black text-[#10755e]">1:{payout}</p>
      </div>
      {showChip ? (
        <span className="absolute left-1/2 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-[#cfd8dc] bg-[radial-gradient(circle_at_30%_25%,#f7fbff_0%,#95a3aa_100%)] text-[12px] font-black text-[#41545e] shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
          {chipValue}
        </span>
      ) : null}
    </button>
  );
}

export default function SevenUpDownPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [selectedChip, setSelectedChip] = useState(50);
  const [selectedSelection, setSelectedSelection] =
    useState<SevenUpDownSelection>("DOWN");
  const [placedSelections, setPlacedSelections] = useState<SevenUpDownSelection[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isChipPickerOpen, setIsChipPickerOpen] = useState(false);
  const [chipPickerOptions, setChipPickerOptions] = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["seven-up-down-lobby"],
    queryFn: SevenUpDownService.getLobby,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  const lobby = data?.data;
  const currentBalance = Number(user?.balance ?? 0);
  const minBet = Number(lobby?.settings.minBet ?? 5);
  const maxBet = Number(lobby?.settings.maxBet ?? 500);
  const currentRound = lobby?.currentRound;
  const history = lobby?.history ?? [];
  const range = lobby?.percentage.range ?? { down: 0, seven: 0, up: 0 };
  const boardPayouts = lobby?.settings.boardPayouts ?? {};
  const richestPlayers = lobby?.richestPlayers ?? [];
  const isLocked =
    (currentRound?.status ?? "BETTING") !== "BETTING" || secondsLeft <= 0;

  useEffect(() => {
    if (!currentRound?.locksAt) return;
    setSecondsLeft(getSecondsLeft(currentRound.locksAt));
    const interval = window.setInterval(() => {
      setSecondsLeft(getSecondsLeft(currentRound.locksAt));
    }, 500);
    return () => window.clearInterval(interval);
  }, [currentRound?.locksAt]);

  useEffect(() => {
    if (!user) return;
    const sessionId = getPresenceSessionId();
    void SevenUpDownService.trackPresence(sessionId).catch(() => {});
    const interval = window.setInterval(() => {
      void SevenUpDownService.trackPresence(sessionId).catch(() => {});
    }, 10000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (currentRound?.status === "SETTLED") {
      setPlacedSelections([]);
    }
  }, [currentRound?.id, currentRound?.status]);

  const placeBetMutation = useMutation({
    mutationFn: (selection: SevenUpDownSelection) =>
      SevenUpDownService.placeBet({ selection, stake: selectedChip }),
    onSuccess: (response, selection) => {
      updateUser({ balance: Number(response.data.balance) });
      setPlacedSelections((current) =>
        current.includes(selection) ? current : [...current, selection],
      );
      toast.success(`Bet placed on ${mapSelectionLabel(selection)}`);
    },
    onError: async (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!.data!
              .message!
          : "Failed to place bet";
      toast.error(message);

      try {
        const profile = await UserService.getProfile({ silent: true });
        updateUser({ balance: Number(profile?.data?.balance ?? currentBalance) });
      } catch {
        // Best effort.
      }
    },
  });

  const chipOptions = useMemo(() => {
    const base = CHIP_OPTIONS.filter((amount) => amount >= minBet && amount <= maxBet);
    if (!base.includes(minBet)) base.unshift(minBet);
    if (!base.includes(maxBet)) base.push(maxBet);
    return Array.from(new Set(base)).sort((a, b) => a - b).slice(0, 7);
  }, [maxBet, minBet]);

  const totalPlacedAmount = placedSelections.length * selectedChip;

  const generateChipPickerOptions = () => {
    const values = new Set<number>();
    const presets = [...chipOptions];

    values.add(selectedChip);
    values.add(minBet);
    values.add(maxBet);

    for (const preset of presets) {
      if (values.size >= 5) break;
      values.add(preset);
    }

    const step = Math.max(10, Math.floor((maxBet - minBet) / 6) || 10);
    let safety = 0;

    while (values.size < 5 && safety < 20) {
      const candidate =
        minBet + Math.floor(Math.random() * Math.max(1, maxBet - minBet + 1));
      const normalized =
        candidate >= maxBet
          ? maxBet
          : candidate <= minBet
            ? minBet
            : Math.max(minBet, Math.min(maxBet, Math.round(candidate / step) * step));
      values.add(normalized);
      safety += 1;
    }

    return Array.from(values)
      .sort((left, right) => left - right)
      .slice(0, 5);
  };

  const openChipPicker = () => {
    setChipPickerOptions(generateChipPickerOptions());
    setIsChipPickerOpen(true);
  };

  const handleBet = (selection: SevenUpDownSelection) => {
    setSelectedSelection(selection);
    setIsChipPickerOpen(false);

    if (isLocked) {
      toast.error("Betting window is closed");
      return;
    }

    if (selectedChip < minBet || selectedChip > maxBet) {
      toast.error(`Stake must be between ${minBet} and ${maxBet}`);
      return;
    }

    if (currentBalance < selectedChip) {
      toast.error("Insufficient balance");
      return;
    }

    placeBetMutation.mutate(selection);
  };

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="mx-auto max-w-[540px] bg-[linear-gradient(180deg,#712309_0%,#0d6d54_35%,#0e8f67_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="h-[32px] bg-black" />
        <ResultRoadmap history={history} range={range} />

        <div className="relative overflow-hidden bg-[linear-gradient(180deg,#6f220a_0%,#7a2a0a_8%,#11785f_26%,#0f8f6e_100%)] px-2 pb-1">
          <div className="flex gap-2 pt-2">
            <div className="w-[86px] shrink-0">
              <div className="mb-2 text-[11px] font-black text-[#f6de7d]">
                HIGH WIN RATE
              </div>
              <div className="space-y-2">
                {richestPlayers.slice(0, 3).map((player) => (
                  <PlayerBadge key={player.id} player={player} />
                ))}
              </div>
            </div>

            <div className="relative flex-1 rounded-b-[24px] rounded-t-[40px] border border-black/20 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.10),transparent_28%),linear-gradient(180deg,#0c7b5a_0%,#0b5d46_100%)] px-3 pb-4 pt-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <div className="pointer-events-none absolute left-1/2 top-[30px] h-[150px] w-[210px] -translate-x-1/2 rounded-[999px_999px_72px_72px] border-[8px] border-[#7d8e95]/65 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.30),rgba(255,255,255,0.04)_38%,rgba(0,0,0,0.10)_64%,rgba(0,0,0,0.28)_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.4)]" />
              <div className="pointer-events-none absolute left-1/2 top-[42px] h-[114px] w-[180px] -translate-x-1/2 rounded-[999px_999px_58px_58px] border border-white/20 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.34),transparent_36%)]" />
              <div className="pointer-events-none absolute left-1/2 top-[140px] h-[38px] w-[220px] -translate-x-1/2 rounded-full border-[10px] border-[#38474d] bg-[linear-gradient(180deg,#4d5c61_0%,#1d2327_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />

              <div className="relative z-10 mt-[64px] flex items-center justify-center gap-5">
                <Dice value={currentRound?.diceOne} rotateClass="-rotate-12" />
                <Dice value={currentRound?.diceTwo} rotateClass="rotate-12" />
              </div>
            </div>

            <div className="flex w-[78px] shrink-0 flex-col items-center justify-center gap-2">
              <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full border-[6px] border-[#ff9c2f] bg-[radial-gradient(circle_at_30%_30%,#fffca5_0%,#f4cc3b_16%,#1a4d4f_32%,#07292e_100%)] text-[38px] font-black text-[#ffe97f] shadow-[0_0_0_5px_rgba(200,48,11,0.65),0_0_22px_rgba(255,173,63,0.45)]">
                {isLocked ? currentRound?.total ?? "-" : secondsLeft}
              </div>
              <div className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-black text-white/85">
                {currentRound?.isPowerRound ? `POWER x${currentRound.powerMultiplier}` : "LIVE"}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md bg-[linear-gradient(180deg,#8d3a10_0%,#6f240b_100%)] px-2 py-1 text-[11px] font-black text-[#d7c0a1]">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {lobby?.activeViewerCount ?? 0}
            </div>
            <div>Roadmap</div>
            <div>Min {formatAmount(minBet)}</div>
            <div>Max {formatAmount(maxBet)}</div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#0b966e_0%,#0a8c63_100%)] px-2 pb-1 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {BOARD_CELLS.slice(0, 3).map((cell) => (
              <BetTile
                key={cell.selection}
                label={cell.label}
                payout={boardPayouts[cell.selection] ?? "-"}
                accent={cell.accent as "green" | "blue" | "red"}
                selected={selectedSelection === cell.selection}
                onClick={() => handleBet(cell.selection)}
                disabled={placeBetMutation.isPending || isLoading}
                chipValue={selectedChip}
                showChip={placedSelections.includes(cell.selection)}
              />
            ))}
          </div>

          <div className="mt-2 grid grid-cols-5 gap-[2px] rounded-[4px] bg-white/20 p-[2px]">
            {BOARD_CELLS.slice(3).map((cell) => (
              <TotalTile
                key={cell.selection}
                label={cell.label}
                payout={boardPayouts[cell.selection] ?? "-"}
                selected={selectedSelection === cell.selection}
                onClick={() => handleBet(cell.selection)}
                disabled={placeBetMutation.isPending || isLoading}
                chipValue={selectedChip}
                showChip={placedSelections.includes(cell.selection)}
              />
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 items-center bg-[linear-gradient(180deg,#0f8163_0%,#0b7258_100%)] px-4 py-2 text-[14px] font-black text-[#d8e5d3]">
            <div>
              Balance <span className="text-[18px] text-[#f1db42]">Tk{formatAmount(currentBalance)}</span>
            </div>
            <div className="text-right">
              Your Bet <span className="text-[18px] text-[#f1db42]">Tk{formatAmount(totalPlacedAmount)}</span>
            </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#11795f_0%,#0b6e58_100%)] px-3 pb-5 pt-3">
          <div className="relative grid grid-cols-[64px_1fr_70px_70px_64px] items-end gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full border-2 border-white/25 bg-[radial-gradient(circle_at_30%_25%,#ebd9c8_0%,#834f43_62%,#4b261f_100%)]">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="truncate text-[10px] font-black text-white/90">
                {getMaskedName(user?.username || user?.name)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPlacedSelections([])}
                className="flex flex-col items-center text-white"
              >
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white/25 bg-black/15">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <span className="mt-1 text-[12px] font-black">again</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  isChipPickerOpen ? setIsChipPickerOpen(false) : openChipPicker()
                }
                className="flex h-[82px] w-[82px] items-center justify-center rounded-full border-[6px] border-[#f8d873] bg-[radial-gradient(circle_at_30%_25%,#faffff_0%,#0caf35_22%,#047321_100%)] text-[30px] font-black text-black shadow-[0_12px_25px_rgba(0,0,0,0.32)]"
              >
                {selectedChip}
              </button>

              <button
                type="button"
                onClick={() => setSelectedChip((current) => Math.min(maxBet, current * 2))}
                className="flex flex-col items-center text-white"
              >
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white/25 bg-black/15 text-[26px] font-black">
                  x2
                </div>
                <span className="mt-1 text-[12px] font-black">double</span>
              </button>
            </div>

            {isChipPickerOpen ? (
              <div className="pointer-events-none absolute bottom-[70px] left-1/2 z-30 -translate-x-1/2">
                <div className="flex items-end justify-center gap-3">
                  {chipPickerOptions.map((chip, index) => {
                    const visual = [
                      "border-[#66efff] bg-[radial-gradient(circle_at_30%_25%,#f7ffff_0%,#1fb9e7_48%,#0c6f8a_100%)] text-[#082733] translate-y-5",
                      "border-[#f1dfcf] bg-[radial-gradient(circle_at_30%_25%,#fff9f1_0%,#95532e_48%,#5c2d15_100%)] text-[#2b1306] translate-y-1",
                      "border-[#ffdf84] bg-[radial-gradient(circle_at_30%_25%,#fffef1_0%,#f0b124_48%,#b47000_100%)] text-[#2b1700] -translate-y-2",
                      "border-[#ff8c8c] bg-[radial-gradient(circle_at_30%_25%,#fff6f6_0%,#cf1414_48%,#7d0909_100%)] text-[#2c0404] translate-y-1",
                      "border-[#dbc2ff] bg-[radial-gradient(circle_at_30%_25%,#fff7ff_0%,#8a46d8_48%,#4f178d_100%)] text-[#24083d] translate-y-5",
                    ][index % 5];

                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setSelectedChip(chip);
                          setIsChipPickerOpen(false);
                        }}
                        className={`pointer-events-auto flex h-[74px] w-[74px] items-center justify-center rounded-full border-[6px] text-[21px] font-black shadow-[0_14px_22px_rgba(0,0,0,0.35)] ${visual}`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setSelectedChip((current) => {
                  const index = chipOptions.indexOf(current);
                  return chipOptions[Math.max(0, index - 1)] ?? current;
                })
              }
              className="flex flex-col items-center text-white"
            >
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white/25 bg-black/15">
                <Undo2 className="h-6 w-6" />
              </div>
              <span className="mt-1 text-[12px] font-black">undo</span>
            </button>

            <button
              type="button"
              onClick={() => setPlacedSelections([])}
              className="flex flex-col items-center text-white"
            >
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white/25 bg-black/15">
                <X className="h-7 w-7 text-[#ff6654]" />
              </div>
              <span className="mt-1 text-[12px] font-black">clear</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
