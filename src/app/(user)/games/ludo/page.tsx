"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Loader2,
  Users,
  Crown,
  Swords,
  Clock,
  Gift,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { AdminService } from "@/services/admin.service";
import { getLudoConfig } from "@/lib/ludo-settings";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { TransferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import {
  LudoService,
  type JoinLudoQueuePayload,
  type LudoMatchOpponent,
  type LudoInviteUser,
  type LudoStakeAmount,
} from "@/services/ludo.service";

type QueueStatus = {
  queueId?: string | null;
  roomId?: string | null;
  matchId?: string | null;
  stake?: LudoStakeAmount | null;
  preferredColor?: "RED" | "GREEN" | null;
  status?: string | null;
};

type MatchFoundPayload = {
  roomId?: string | null;
  matchId?: string | null;
  amount?: LudoStakeAmount | null;
  yourColor?: "RED" | "GREEN" | null;
  opponent?: LudoMatchOpponent | null;
};

type MatchmakingState = {
  status: "searching" | "matched";
  stake: LudoStakeAmount;
  roomId?: string | null;
  matchId?: string | null;
  opponentName?: string | null;
};

type SearchableLudoUser = LudoInviteUser & {
  email?: string;
};

const STALE_LUDO_STATE_ERROR =
  /active ludo queue or room|ludo room is already finished/i;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!
      .data!.message!;
  }

  return fallback;
};

const getStateRoomId = (state?: {
  roomId?: string | null;
  currentRoomId?: string | null;
  room?: { id?: string | null } | null;
  activeMatch?: {
    roomId?: string | null;
    room?: { id?: string | null } | null;
  } | null;
}) =>
  state?.roomId ??
  state?.currentRoomId ??
  state?.room?.id ??
  state?.activeMatch?.roomId ??
  state?.activeMatch?.room?.id ??
  null;

const getOpponentDisplayName = (opponent?: LudoMatchOpponent | null) =>
  opponent?.name?.trim() || opponent?.username?.trim() || "Opponent";

const stakeColors = [
  {
    gradient: "from-[#e63946] to-[#9d0208]",
    shadow: "shadow-[0_6px_24px_rgba(230,57,70,0.55)]",
    border: "border-[#ff6b6b]",
    glow: "rgba(230,57,70,0.4)",
    iconBg: "bg-[#9d0208]",
    token: "#e63946",
  },
  {
    gradient: "from-[#2dc653] to-[#007f5f]",
    shadow: "shadow-[0_6px_24px_rgba(45,198,83,0.55)]",
    border: "border-[#4ade80]",
    glow: "rgba(45,198,83,0.4)",
    iconBg: "bg-[#007f5f]",
    token: "#2dc653",
  },
  {
    gradient: "from-[#3a86ff] to-[#023e8a]",
    shadow: "shadow-[0_6px_24px_rgba(58,134,255,0.55)]",
    border: "border-[#60a5fa]",
    glow: "rgba(58,134,255,0.4)",
    iconBg: "bg-[#023e8a]",
    token: "#3a86ff",
  },
  {
    gradient: "from-[#ffbe0b] to-[#d4800a]",
    shadow: "shadow-[0_6px_24px_rgba(255,190,11,0.55)]",
    border: "border-[#fbbf24]",
    glow: "rgba(255,190,11,0.4)",
    iconBg: "bg-[#d4800a]",
    token: "#ffbe0b",
  },
];

const LUDO_GRID_SIZE = 15;
const SAFE_ZONE_INDEXES = [23, 91, 133, 201];

function renderStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-[52%] w-[52%]" aria-hidden="true">
      <polygon
        points="12,2.5 14.8,8.2 21,9.1 16.5,13.5 17.6,19.7 12,16.6 6.4,19.7 7.5,13.5 3,9.1 9.2,8.2"
        fill="#facc15"
        stroke="#92400e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LudoPreviewBoard() {
  const cells = Array.from(
    { length: LUDO_GRID_SIZE * LUDO_GRID_SIZE },
    (_, cellIndex) => {
      const row = Math.floor(cellIndex / LUDO_GRID_SIZE);
      const col = cellIndex % LUDO_GRID_SIZE;

      return { cellIndex, row, col };
    },
  );

  const getCellClassName = (row: number, col: number) => {
    if (row <= 5 && col <= 5) return "bg-[#ff434c] border-white/50";
    if (row <= 5 && col >= 9) return "bg-[#2fd15c] border-white/50";
    if (row >= 9 && col <= 5) return "bg-[#4285ff] border-white/50";
    if (row >= 9 && col >= 9) return "bg-[#ffc91f] border-white/50";

    if (col >= 6 && col <= 8) {
      if (col === 7 && row >= 1 && row <= 5)
        return "bg-[#2fd15c]/20 border-slate-300";
      if (col === 7 && row >= 9 && row <= 13)
        return "bg-[#4285ff]/20 border-slate-300";
      return "bg-white border-slate-300";
    }

    if (row >= 6 && row <= 8) {
      if (row === 7 && col >= 1 && col <= 5)
        return "bg-[#ff434c]/20 border-slate-300";
      if (row === 7 && col >= 9 && col <= 13)
        return "bg-[#ffc91f]/30 border-slate-300";
      return "bg-white border-slate-300";
    }

    return "bg-white border-slate-300";
  };

  const homeTokenGroups = [
    {
      color: "bg-[#ff434c]",
      positions: [
        "col-start-2 row-start-2",
        "col-start-5 row-start-2",
        "col-start-2 row-start-5",
        "col-start-5 row-start-5",
      ],
    },
    {
      color: "bg-[#2fd15c]",
      positions: [
        "col-start-11 row-start-2",
        "col-start-14 row-start-2",
        "col-start-11 row-start-5",
        "col-start-14 row-start-5",
      ],
    },
    {
      color: "bg-[#4285ff]",
      positions: [
        "col-start-2 row-start-11",
        "col-start-5 row-start-11",
        "col-start-2 row-start-14",
        "col-start-5 row-start-14",
      ],
    },
    {
      color: "bg-[#ffc91f]",
      positions: [
        "col-start-11 row-start-11",
        "col-start-14 row-start-11",
        "col-start-11 row-start-14",
        "col-start-14 row-start-14",
      ],
    },
  ];

  return (
    <div className="relative aspect-square w-[214px] overflow-hidden rounded-[20px] border-[2px] border-white/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${LUDO_GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {cells.map(({ cellIndex, row, col }) => {
          const isSafeZone = SAFE_ZONE_INDEXES.includes(cellIndex);

          return (
            <div
              key={cellIndex}
              className={`relative flex items-center justify-center overflow-hidden border ${getCellClassName(row, col)}`}
            >
              {isSafeZone ? renderStar() : null}
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${LUDO_GRID_SIZE}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${LUDO_GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        <div className="col-start-7 col-end-10 row-start-7 row-end-10 [clip-path:polygon(50%_50%,0_0,100%_0)] bg-[#2fd15c]" />
        <div className="col-start-7 col-end-10 row-start-7 row-end-10 [clip-path:polygon(50%_50%,100%_0,100%_100%)] bg-[#ffc91f]" />
        <div className="col-start-7 col-end-10 row-start-7 row-end-10 [clip-path:polygon(50%_50%,100%_100%,0_100%)] bg-[#4285ff]" />
        <div className="col-start-7 col-end-10 row-start-7 row-end-10 [clip-path:polygon(50%_50%,0_100%,0_0)] bg-[#ff434c]" />

        {homeTokenGroups.flatMap((group, groupIndex) =>
          group.positions.map((position, index) => (
            <div
              key={`${groupIndex}-${index}`}
              className={`flex h-full w-full items-center justify-center ${position}`}
            >
              <div className="flex h-[38%] w-[38%] items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]">
                <div className={`h-[62%] w-[62%] rounded-full ${group.color}`} />
              </div>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export default function LudoPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [authChecked, setAuthChecked] = useState(false);
  const [matchmaking, setMatchmaking] = useState<MatchmakingState | null>(null);
  const roomRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSearchResults, setInviteSearchResults] = useState<
    SearchableLudoUser[]
  >([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
  const [selectedInviteStake, setSelectedInviteStake] =
    useState<LudoStakeAmount>(0);

  useEffect(() => {
    queueMicrotask(() => {
      if (!hasClientAuthCookie()) {
        router.replace("/");
        return;
      }

      setAuthChecked(true);
    });
  }, [router]);

  useEffect(
    () => () => {
      if (roomRedirectTimerRef.current) {
        clearTimeout(roomRedirectTimerRef.current);
      }
      if (inviteSearchTimerRef.current) {
        clearTimeout(inviteSearchTimerRef.current);
      }
    },
    [],
  );

  const { isConnected, emitEvent, onEvent } = useSocket();
  const [selectedColor] = useState<"RED" | "GREEN">("RED");
  const [queueState, setQueueState] = useState<QueueStatus | null>(null);
  const { data: globalData, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => AdminService.getPublicSettings(),
  });

  const globalSettings = useMemo(
    () => globalData?.data ?? [],
    [globalData?.data],
  );
  const ludoConfig = useMemo(
    () => getLudoConfig(globalSettings),
    [globalSettings],
  );
  const isLudoEnabled = ludoConfig.enabled;
  const publicFreeMode = ludoConfig.freeMode;

  const { data: lobbyData, refetch: refetchLobby } = useQuery({
    queryKey: ["ludo-lobby"],
    queryFn: () => LudoService.getLobby(),
    refetchInterval: 15000,
    enabled: isLudoEnabled,
  });

  const { data: myStateData, refetch: refetchMyState } = useQuery({
    queryKey: ["ludo-my-state"],
    queryFn: () => LudoService.getMyState(),
    refetchInterval: 5000,
    enabled: isLudoEnabled,
  });

  const lobby = lobbyData?.data;
  const isFreeMode = publicFreeMode || Boolean(lobby?.isFreeMode ?? lobby?.freeMode);
  const myState = myStateData?.data;
  const stateRoomId = getStateRoomId(myState);
  const effectiveQueueState = useMemo<QueueStatus | null>(() => {
    if (queueState) return queueState;
    if (!myState) return null;

    return {
      queueId: myState.queueId ?? null,
      roomId: stateRoomId ?? null,
      matchId: myState.matchId ?? null,
      stake: myState.stake ?? null,
      preferredColor: myState.preferredColor ?? null,
      status: myState.status ?? null,
    };
  }, [myState, queueState, stateRoomId]);
  const searchingStakeAmount = effectiveQueueState?.stake ?? null;
  const isQueueSearching = effectiveQueueState?.status === "SEARCHING";

  const openRoomAfterMatch = useCallback((roomId: string) => {
    if (roomRedirectTimerRef.current) {
      clearTimeout(roomRedirectTimerRef.current);
    }

    roomRedirectTimerRef.current = setTimeout(() => {
      router.replace(`/games/ludo/room/${roomId}`);
    }, 1600);
  }, [router]);

  const clearActiveLudoState = async () => {
    setQueueState(null);
    setMatchmaking(null);

    if (stateRoomId) {
      try {
        await LudoService.leaveRoom(stateRoomId);
      } catch {
        // Best-effort cleanup for stale finished rooms.
      }
    }

    if (effectiveQueueState?.queueId) {
      try {
        await LudoService.leaveQueue(effectiveQueueState.queueId);
      } catch {
        // Best-effort cleanup for stale queue records.
      }
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    emitEvent("ludo:queue:watch");

    const offMatchFound = onEvent(
      "match:found",
      (payload: MatchFoundPayload) => {
        const roomId = payload?.roomId;

        setQueueState((current) => ({
          queueId: current?.queueId ?? null,
          roomId: roomId ?? null,
          matchId: payload?.matchId ?? current?.matchId ?? null,
          stake: payload?.amount ?? current?.stake ?? null,
          preferredColor: payload?.yourColor ?? current?.preferredColor ?? null,
          status: "MATCHED",
        }));

        if (roomId) {
          setMatchmaking({
            status: "matched",
            stake: payload?.amount ?? ludoConfig.freeStake,
            roomId,
            matchId: payload?.matchId ?? null,
            opponentName: getOpponentDisplayName(payload?.opponent),
          });
          toast.success("Opponent matched");
          openRoomAfterMatch(roomId);
        }
      },
    );

    const offQueueUpdate = onEvent("queue:update", () => {
      void refetchLobby();
      void refetchMyState();
    });

    const offCancelled = onEvent("match:cancelled", () => {
      setQueueState(null);
      setMatchmaking(null);
      toast("Match cancelled");
      void refetchLobby();
      void refetchMyState();
    });

    return () => {
      offMatchFound();
      offQueueUpdate();
      offCancelled();
    };
  }, [
    emitEvent,
    isConnected,
    ludoConfig.freeStake,
    onEvent,
    openRoomAfterMatch,
    refetchLobby,
    refetchMyState,
    router,
  ]);

  const joinQueueMutation = useMutation({
    mutationFn: async (payload: JoinLudoQueuePayload) => {
      try {
        return await LudoService.joinQueue(payload);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to join Ludo queue");

        if (!STALE_LUDO_STATE_ERROR.test(message)) {
          throw error;
        }

        await clearActiveLudoState();
        await refetchMyState();

        return LudoService.joinQueue(payload);
      }
    },
    onSuccess: ({ data }) => {
      setQueueState({
        queueId: data.queueId,
        roomId: data.roomId ?? null,
        matchId: data.matchId ?? null,
        stake: data.stake ?? data.amount ?? null,
        preferredColor: data.yourColor ?? data.preferredColor ?? selectedColor,
        status: data.status,
      });

      if (data.roomId) {
        setMatchmaking({
          status: "matched",
          stake: data.stake ?? data.amount ?? ludoConfig.freeStake,
          roomId: data.roomId,
          matchId: data.matchId ?? null,
          opponentName: getOpponentDisplayName(data.opponent),
        });
        toast.success("Match found");
        openRoomAfterMatch(data.roomId);
        return;
      }

      setMatchmaking({
        status: "searching",
        stake: data.stake ?? data.amount ?? ludoConfig.freeStake,
      });
      toast.success("Searching for opponent");
      void refetchLobby();
      void refetchMyState();
    },
    onError: (error: unknown) => {
      setMatchmaking(null);
      toast.error(getErrorMessage(error, "Failed to join Ludo queue"));
    },
  });

  const startJoinQueue = (payload: JoinLudoQueuePayload) => {
    setMatchmaking({
      status: "searching",
      stake: payload.stake,
    });
    joinQueueMutation.mutate(payload);
  };

  const mergedStakes = useMemo(() => {
    if (isFreeMode) return [];

    const live = lobby?.stakes ?? [];
    const liveStakeOptions = live
      .map((item) => Number(item.amount))
      .filter((amount) => Number.isFinite(amount) && amount > 0);
    const stakeOptions =
      liveStakeOptions.length > 0 ? liveStakeOptions : ludoConfig.stakes;

    return stakeOptions.map((amount) => {
      const match = live.find((item) => Number(item.amount) === amount);
      const includesCurrentUser =
        isQueueSearching && Number(searchingStakeAmount) === amount;
      const visibleWaitingPlayers = Math.max(
        0,
        (match?.waitingPlayers ?? 0) - (includesCurrentUser ? 1 : 0),
      );

      return {
        amount,
        waitingPlayers: visibleWaitingPlayers,
        activeMatches: match?.activeMatches ?? 0,
        onlinePlayers: match?.onlinePlayers ?? 0,
      };
    });
  }, [isFreeMode, isQueueSearching, lobby, ludoConfig.stakes, searchingStakeAmount]);

  const freeStakeStatus = useMemo(() => {
    const liveFreeStake = lobby?.stakes?.find(
      (item) => Number(item.amount) === ludoConfig.freeStake,
    );
    const includesCurrentUser =
      isQueueSearching && Number(searchingStakeAmount) === ludoConfig.freeStake;
    const waitingPlayers = Math.max(
      0,
      (liveFreeStake?.waitingPlayers ?? 0) - (includesCurrentUser ? 1 : 0),
    );

    return {
      waitingPlayers,
      activeMatches: liveFreeStake?.activeMatches ?? 0,
      onlinePlayers: liveFreeStake?.onlinePlayers ?? 0,
    };
  }, [isQueueSearching, lobby?.stakes, ludoConfig.freeStake, searchingStakeAmount]);

  useEffect(() => {
    if (isFreeMode) {
      setSelectedInviteStake(ludoConfig.freeStake);
      return;
    }

    if (mergedStakes.length > 0) {
      setSelectedInviteStake((current) =>
        mergedStakes.some((stake) => stake.amount === current)
          ? current
          : mergedStakes[0]!.amount,
      );
    }
  }, [isFreeMode, ludoConfig.freeStake, mergedStakes]);

  useEffect(() => {
    if (inviteQuery.trim().length < 2) {
      if (inviteSearchTimerRef.current) {
        clearTimeout(inviteSearchTimerRef.current);
      }
      setInviteSearchResults([]);
      setIsInviteSearching(false);
      return;
    }

    if (inviteSearchTimerRef.current) {
      clearTimeout(inviteSearchTimerRef.current);
    }

    setIsInviteSearching(true);
    inviteSearchTimerRef.current = setTimeout(async () => {
      try {
        const response = await TransferService.searchUser(inviteQuery.trim());
        const users = Array.isArray(response?.data) ? response.data : [];
        setInviteSearchResults(
          users.filter(
            (user): user is SearchableLudoUser =>
              Boolean(user?.id) && user.id !== currentUser?.id,
          ),
        );
      } catch {
        setInviteSearchResults([]);
      } finally {
        setIsInviteSearching(false);
      }
    }, 350);

    return () => {
      if (inviteSearchTimerRef.current) {
        clearTimeout(inviteSearchTimerRef.current);
      }
    };
  }, [currentUser?.id, inviteQuery]);

  const getStakeStatusLabel = (stake: (typeof mergedStakes)[number]) => {
    const isCurrentStakeSearching =
      isQueueSearching && Number(searchingStakeAmount) === stake.amount;

    if (isCurrentStakeSearching && stake.waitingPlayers <= 0) {
      return "Searching...";
    }

    if (stake.waitingPlayers === 1) {
      return "Opponent available";
    }

    if (stake.waitingPlayers <= 0) {
      return "Searching...";
    }

    return `${stake.waitingPlayers} waiting`;
  };

  const isSearching = isQueueSearching;
  const inviteStakeLabel =
    isFreeMode || Number(selectedInviteStake) <= 0
      ? "Free"
      : `Tk ${Number(selectedInviteStake).toLocaleString("en-BD")}`;
  const livePlayerCount = lobby?.activePlayerCount ?? 2;
  const playerDisplayName =
    currentUser?.name?.trim() || currentUser?.username?.trim() || "You";
  const activeMatchmaking =
    matchmaking ??
    (isSearching && searchingStakeAmount !== null
      ? ({
          status: "searching",
          stake: searchingStakeAmount,
        } satisfies MatchmakingState)
      : null);
  const sendInviteMutation = useMutation({
    mutationFn: async (invitee: SearchableLudoUser) =>
      LudoService.sendInvite({
        inviteeUserId: invitee.id,
        stake: isFreeMode ? ludoConfig.freeStake : selectedInviteStake,
        preferredColor: selectedColor,
        pieceMode: "FOUR",
        isFree: isFreeMode || Number(selectedInviteStake) <= 0,
      }),
    onSuccess: ({ data }, invitee) => {
      toast.success(
        `Invite sent to ${invitee.name || `@${invitee.username}`}${
          data.isFree ? " for free play" : ` for Tk ${Number(data.stakeAmount).toLocaleString("en-BD")}`
        }`,
      );
      setInviteQuery("");
      setInviteSearchResults([]);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to send Ludo invite"));
    },
  });
  if (!authChecked) return null;

  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_48%,#eef2ff_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,#1a1040_0%,#0d0a1e_58%,#090611_100%)]">
        <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-white px-5 py-4 text-slate-700 shadow-sm dark:border-purple-500/20 dark:bg-[#1a1040] dark:text-purple-100 dark:shadow-none">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500 dark:text-purple-400" />
          Loading Ludo lobby...
        </div>
      </div>
    );
  }

  if (!isLudoEnabled) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_48%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,#1a1040_0%,#0d0a1e_58%,#090611_100%)]">
        {/* Banner Image */}
        {ludoConfig.bannerImage ? (
          <div className="relative w-full overflow-hidden" style={{ maxHeight: 320 }}>
            <Image
              src={ludoConfig.bannerImage}
              alt="Ludo Banner"
              width={800}
              height={320}
              className="w-full object-cover"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-slate-50 dark:to-[#0d0a1e]" />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-linear-to-br from-violet-100 via-indigo-50 to-white dark:from-[#180f2f] dark:to-[#0d0a1e]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10 ring-4 ring-violet-400/20 dark:bg-purple-500/15 dark:ring-purple-500/20">
              <Crown className="h-10 w-10 text-violet-600 dark:text-purple-300" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-md px-5 pb-10 pt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </div>

          <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
            {ludoConfig.bannerTitle}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {ludoConfig.bannerMessage}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/games"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Back to Games
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_42%,#eef2ff_100%)] pb-10 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1a1040_0%,#0d0a1e_52%,#090611_100%)] dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.14)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.08)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(239,68,68,0.1)_0%,transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-center gap-3">
          <Crown className="h-7 w-7 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
          <h1 className="text-3xl font-black tracking-wide text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(160,120,255,0.6)]">
            LUDO MATKA
          </h1>
          <Crown className="h-7 w-7 text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
        </div>

        <div className="relative mb-7 flex justify-center">
          <div className="absolute inset-x-12 top-8 h-40 rounded-full bg-[radial-gradient(circle,rgba(125,89,255,0.28)_0%,transparent_72%)] blur-3xl" />
          <div className="relative">
            <LudoPreviewBoard />
            <div className="absolute -right-24 top-3 flex items-center gap-2 rounded-full border border-emerald-300 bg-white/95 px-4 py-2 shadow-[0_10px_24px_rgba(16,185,129,0.18)] dark:border-[#2dc653]/45 dark:bg-[#081a11] dark:shadow-[0_0_16px_rgba(45,198,83,0.26)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2dc653] shadow-[0_0_8px_#2dc653]" />
              <span className="text-sm font-bold text-emerald-700 dark:text-[#69f28d]">
                {livePlayerCount} Online
              </span>
            </div>
          </div>
        </div>

        {/* Select stake label */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-purple-500/40" />
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-violet-500 dark:text-purple-300" />
            <span className="text-sm font-bold uppercase tracking-widest text-violet-700 dark:text-purple-200">
              {isFreeMode ? "Free Play" : "Select Stake"}
            </span>
            <Swords className="h-4 w-4 text-violet-500 dark:text-purple-300" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-purple-500/40" />
        </div>

        {/* Stake buttons */}
        {isFreeMode ? (
          <button
            type="button"
            disabled={joinQueueMutation.isPending || isSearching}
            onClick={() =>
              startJoinQueue({
                stake: ludoConfig.freeStake,
                preferredColor: selectedColor,
                pieceMode: "FOUR",
                isFree: true,
                freeMode: true,
              })
            }
            className="group relative w-full overflow-hidden rounded-2xl border border-cyan-300 bg-gradient-to-b from-cyan-400 to-emerald-500 p-0 shadow-[0_6px_28px_rgba(34,211,238,0.42)] transition-all duration-200 active:scale-95 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
            <div className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-black/30" />

            <div className="relative px-4 py-5">
              <div className="mb-2 flex items-center justify-center gap-2 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
                <Gift className="h-6 w-6" />
                Free Play
              </div>
              <div className="mx-auto mb-2 h-px w-3/4 bg-white/35" />
              <div className="flex items-center justify-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-white/85" />
                <span className="text-xs font-semibold text-white/95">
                  {isQueueSearching && Number(searchingStakeAmount) === ludoConfig.freeStake
                    ? "Searching..."
                    : freeStakeStatus.waitingPlayers === 1
                      ? "Opponent available"
                      : "Join free match"}
                </span>
              </div>
            </div>
          </button>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          {mergedStakes.map((stake, idx) => {
            const color = stakeColors[idx % stakeColors.length];
            return (
              <button
                key={stake.amount}
                type="button"
                  disabled={joinQueueMutation.isPending || isSearching}
                  onClick={() =>
                    startJoinQueue({
                      stake: stake.amount,
                      preferredColor: selectedColor,
                      pieceMode: "FOUR",
                  })
                }
                className={`group relative overflow-hidden rounded-2xl border ${color.border} bg-gradient-to-b ${color.gradient} ${color.shadow} p-0 transition-all duration-200 active:scale-95 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {/* Shine sweep */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                {/* Bottom shadow edge */}
                <div className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-black/30" />

                <div className="relative px-4 py-4">
                  {/* Amount */}
                  <div className="mb-1 text-center text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    ৳{stake.amount.toLocaleString()}
                  </div>
                  {/* Divider */}
                  <div className="mx-auto mb-2 h-px w-3/4 bg-white/30" />
                  {/* Players */}
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-white/80" />
                    <span className="text-xs font-semibold text-white/90">
                      {getStakeStatusLabel(stake)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        )}

        {/* Matchmaking list */}
        {(activeMatchmaking || joinQueueMutation.isPending) && (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(99,102,241,0.12)] dark:border-purple-500/30 dark:bg-[#1a1040] dark:shadow-[0_0_20px_rgba(120,80,255,0.2)]">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black text-violet-700 dark:text-purple-100">
              {activeMatchmaking?.status === "matched" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#2dc653] shadow-[0_0_8px_#2dc653]" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-violet-500 dark:text-purple-300" />
              )}
              {activeMatchmaking?.status === "matched"
                ? "Match found - starting game"
                : "Searching for opponent"}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {playerDisplayName}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500/70 dark:text-purple-200/60">
                    Player 1
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                  Ready
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {activeMatchmaking?.status === "matched"
                      ? activeMatchmaking.opponentName || "Opponent"
                      : "Searching..."}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500/70 dark:text-purple-200/60">
                    Player 2
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    activeMatchmaking?.status === "matched"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {activeMatchmaking?.status === "matched" ? "Matched" : "Waiting"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-6 flex justify-center gap-6 text-xs font-semibold text-violet-700/80 dark:text-purple-300/70">
          <Link
            href="/games"
            className="underline underline-offset-4 transition-colors hover:text-violet-900 dark:hover:text-purple-200"
          >
            Game Rules
          </Link>
          <span className="text-violet-400/60 dark:text-purple-500/40">|</span>
          <Link
            href="/dashboard"
            className="underline underline-offset-4 transition-colors hover:text-violet-900 dark:hover:text-purple-200"
          >
            My History
          </Link>
        </div>

        <div className="mt-5 rounded-[28px] border border-violet-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(99,102,241,0.12)] dark:border-purple-500/20 dark:bg-[#150d2b]/85 dark:shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
                Invite Friend
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Search by username and send a direct Ludo invite.
              </p>
            </div>
            <div className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
              {inviteStakeLabel}
            </div>
          </div>

          {!isFreeMode && mergedStakes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {mergedStakes.map((stake) => {
                const selected = stake.amount === selectedInviteStake;

                return (
                  <button
                    key={`invite-${stake.amount}`}
                    type="button"
                    onClick={() => setSelectedInviteStake(stake.amount)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      selected
                        ? "border-cyan-300 bg-cyan-400/15 text-cyan-200"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    Tk {stake.amount.toLocaleString("en-BD")}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-black/15">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <Search className="h-4 w-4 text-cyan-500 dark:text-cyan-300" />
              <input
                type="text"
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.target.value)}
                placeholder="Search username"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
              />
              {isInviteSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {inviteSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      @{user.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendInviteMutation.mutate(user)}
                    disabled={sendInviteMutation.isPending || isSearching}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-cyan-400 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 transition-colors hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-300 dark:bg-cyan-400/15 dark:text-cyan-100 dark:hover:bg-cyan-400/25"
                  >
                    {sendInviteMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Invite
                  </button>
                </div>
              ))}

              {inviteQuery.trim().length >= 2 &&
              !isInviteSearching &&
              inviteSearchResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  No users found.
                </div>
              ) : null}

              {inviteQuery.trim().length < 2 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Type at least 2 letters to search by username.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
