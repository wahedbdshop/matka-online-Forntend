"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  Users,
  Crown,
  Clock,
  Gift,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { AdminService } from "@/services/admin.service";
import { LudoAdminService } from "@/services/ludoAdmin.service";
import { getLudoConfig } from "@/lib/ludo-settings";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import {
  calculateLudoNetPrize,
  extractLudoCommissionPct,
  formatLudoPrizeAmount,
  storeLudoCommissionPct,
} from "@/lib/ludo-payout";
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

type StakePreviewState = {
  amount: LudoStakeAmount;
  waitingPlayers: number;
  isFree: boolean;
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
  const [selectedStakePreview, setSelectedStakePreview] =
    useState<StakePreviewState | null>(null);

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
  const [selectedColor, setSelectedColor] = useState<"RED" | "GREEN">("RED");
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
  const { data: ludoSettingsSnapshot } = useQuery<
    { data?: Record<string, unknown> } | null
  >({
    queryKey: ["ludo-user-settings-snapshot"],
    queryFn: async () => {
      try {
        return (await LudoAdminService.getSettingsSnapshot()) as {
          data?: Record<string, unknown>;
        };
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
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

  const openStakePreview = (stake: StakePreviewState) => {
    setSelectedStakePreview(stake);
  };

  const closeStakePreview = () => {
    setSelectedStakePreview(null);
  };

  const confirmStakePreview = () => {
    if (!selectedStakePreview) return;

    startJoinQueue({
      stake: selectedStakePreview.amount,
      preferredColor: selectedColor,
      pieceMode: "FOUR",
      ...(selectedStakePreview.isFree
        ? {
            isFree: true,
            freeMode: true,
          }
        : {}),
    });
    setSelectedStakePreview(null);
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
  const queueCards = useMemo(() => {
    if (isFreeMode) {
      return [
        {
          amount: ludoConfig.freeStake,
          waitingPlayers: freeStakeStatus.waitingPlayers,
          activeMatches: freeStakeStatus.activeMatches,
          onlinePlayers: freeStakeStatus.onlinePlayers,
          isFree: true,
        },
      ];
    }

    return mergedStakes.map((stake) => ({
      ...stake,
      isFree: false,
    }));
  }, [freeStakeStatus.activeMatches, freeStakeStatus.onlinePlayers, freeStakeStatus.waitingPlayers, isFreeMode, ludoConfig.freeStake, mergedStakes]);
  const ludoCommissionPct = useMemo(
    () =>
      extractLudoCommissionPct(
        ludoSettingsSnapshot?.data,
        lobbyData?.data,
        myStateData?.data,
        globalData?.data,
      ),
    [globalData?.data, lobbyData?.data, ludoSettingsSnapshot?.data, myStateData?.data],
  );
  useEffect(() => {
    storeLudoCommissionPct(ludoCommissionPct);
  }, [ludoCommissionPct]);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_42%,#eef2ff_100%)] pb-10 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1a1040_0%,#0d1120_44%,#090611_100%)] dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,#4338ca_1.1px,transparent_0)] bg-size-[18px_18px] dark:opacity-[0.13] dark:bg-[radial-gradient(circle_at_1px_1px,white_1.2px,transparent_0)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12)_0%,transparent_42%)] dark:bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22)_0%,transparent_38%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(124,58,237,0.08)_0%,transparent_48%)] dark:bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.14)_0%,transparent_44%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-md px-4 pt-7">
        <div className="mb-7 flex flex-col items-center">
          <div className="relative flex h-28 w-56 items-center justify-center">
            <div className="absolute h-24 w-24 rotate-45 rounded-[24px] border-[5px] border-white/85 bg-[radial-gradient(circle_at_30%_28%,#ffe47a_0%,#f6b638_35%,#d24e34_66%,#3b5fdd_100%)] shadow-[0_16px_30px_rgba(0,0,0,0.28)]" />
            <div className="absolute h-16 w-16 rotate-45 rounded-[18px] bg-[radial-gradient(circle,#f8e392_0%,rgba(255,255,255,0)_70%)] opacity-80" />
            <div className="relative flex items-end text-[3rem] font-black italic leading-none tracking-[-0.08em] drop-shadow-[0_4px_0_rgba(14,25,76,0.8)]">
              <span className="text-[#f58c4c]">LU</span>
              <span className="text-[#ffd34e]">DO</span>
              <span className="text-[#59a4ff]">BET</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-violet-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)] backdrop-blur dark:border-violet-400/20 dark:bg-white/8 dark:text-violet-100 dark:shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {livePlayerCount} online
          </div>
        </div>

        <div className="space-y-4">
          {queueCards.map((stake) => {
            const isCurrentStakeSearching =
              isQueueSearching && Number(searchingStakeAmount) === Number(stake.amount);
            const lineCount = Math.max(0, Number(stake.waitingPlayers ?? 0));
            const amountLabel = stake.isFree
              ? "FREE PLAY"
              : `BDT ${Number(stake.amount).toLocaleString("en-BD")}`;

            return (
              <button
                key={stake.amount}
                type="button"
                disabled={joinQueueMutation.isPending || isSearching}
                onClick={() =>
                  openStakePreview({
                    amount: stake.amount,
                    waitingPlayers: lineCount,
                    isFree: stake.isFree,
                  })
                }
                className={`group relative flex w-full items-center gap-3 rounded-[22px] border px-4 py-4 text-left shadow-[0_10px_18px_rgba(15,23,42,0.08)] transition duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_10px_18px_rgba(0,0,0,0.2)] ${
                  isCurrentStakeSearching
                    ? "border-violet-300 bg-[linear-gradient(135deg,#f8f2ff_0%,#eef4ff_100%)] shadow-[0_0_0_3px_rgba(167,139,250,0.16),0_12px_22px_rgba(15,23,42,0.12)] dark:border-violet-300 dark:bg-[linear-gradient(135deg,#f8f2ff_0%,#eef4ff_100%)] dark:shadow-[0_0_0_3px_rgba(167,139,250,0.16),0_12px_22px_rgba(0,0,0,0.24)]"
                    : "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] dark:border-slate-200 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)]"
                }`}
              >
                <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] border-[2px] border-[#d7def8] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="grid h-10 w-10 grid-cols-2 overflow-hidden rounded-[10px] border border-slate-300">
                    <span className="bg-[#ef4444]" />
                    <span className="bg-[#22c55e]" />
                    <span className="bg-[#3b82f6]" />
                    <span className="bg-[#facc15]" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[1.05rem] font-black leading-none tracking-[-0.02em] text-[#1a237e]">
                    {amountLabel}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[0.86rem] font-bold text-[#1a237e]">
                    <span>2 players</span>
                    {isCurrentStakeSearching ? (
                      <span className="rounded-full bg-[#1a237e]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#1a237e]">
                        Searching
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2 text-[#f0b53a]">
                  <Users className="h-5 w-5 fill-current" />
                  <span className="min-w-6 text-right text-[2rem] font-black leading-none tracking-[-0.06em] text-[#1a237e]">
                    {lineCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {(activeMatchmaking || joinQueueMutation.isPending) && (
          <div className="mt-4 rounded-[22px] border border-violet-200 bg-white px-4 py-4 text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.08)] dark:border-violet-400/18 dark:bg-[linear-gradient(135deg,rgba(32,18,67,0.96),rgba(15,17,32,0.92))] dark:text-white dark:shadow-[0_14px_30px_rgba(0,0,0,0.2)]">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black !text-violet-700 dark:!text-violet-50">
              {activeMatchmaking?.status === "matched" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#2dc653] shadow-[0_0_8px_#2dc653]" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin !text-violet-500 dark:!text-violet-300" />
              )}
              {activeMatchmaking?.status === "matched"
                ? "Match found - starting game"
                : "Searching for opponent"}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/8">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black !text-slate-900 dark:!text-white">
                    {playerDisplayName}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest !text-slate-500 dark:!text-white/55">
                    Player 1
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black !text-emerald-700 dark:bg-emerald-500/18 dark:!text-emerald-200">
                  Ready
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/8">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black !text-slate-900 dark:!text-white">
                    {activeMatchmaking?.status === "matched"
                      ? activeMatchmaking.opponentName || "Opponent"
                      : "Searching..."}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest !text-slate-500 dark:!text-white/55">
                    Player 2
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    activeMatchmaking?.status === "matched"
                      ? "bg-emerald-100 !text-emerald-700 dark:bg-emerald-500/18 dark:!text-emerald-200"
                      : "bg-amber-100 !text-amber-700 dark:bg-amber-400/18 dark:!text-amber-100"
                  }`}
                >
                  {activeMatchmaking?.status === "matched" ? "Matched" : "Waiting"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm font-semibold text-violet-700/90 dark:text-violet-100/90">
          <Link
            href="/games/ludo/rules"
            className="underline underline-offset-4 transition-colors hover:text-violet-900 dark:hover:text-white"
          >
            rules of Ludo
          </Link>
          <Link
            href="/games/ludo/history"
            className="underline underline-offset-4 transition-colors hover:text-violet-900 dark:hover:text-white"
          >
            my game history
          </Link>
        </div>

        {selectedStakePreview ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[380px] rounded-[26px] border border-[#5d88ff] bg-[linear-gradient(180deg,#5f92ff_0%,#4b79eb_100%)] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.38)]">
              <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffef9_0%,#f6f0df_100%)] px-5 pb-6 pt-5 text-center shadow-[0_10px_18px_rgba(15,23,42,0.18)]">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={closeStakePreview}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#27408f] transition-colors hover:bg-[#27408f]/8"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <div className="flex-1 pr-10">
                    <p className="text-[2rem] font-black leading-none tracking-[-0.04em] text-[#29409b]">
                      {selectedStakePreview.isFree
                        ? "FREE PLAY"
                        : `BDT ${Number(selectedStakePreview.amount).toLocaleString("en-BD")}`}
                    </p>
                    <p className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-[#29409b]">
                      2 Players
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-[18px] bg-[#37488d] px-4 py-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div className="text-left">
                        <p className="text-xl font-black">1st Prize</p>
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">
                          After admin commission
                        </p>
                      </div>
                    </div>
                    <span className="text-3xl font-black tracking-[-0.04em]">
                      {selectedStakePreview.isFree
                        ? "FREE"
                        : formatLudoPrizeAmount(
                            calculateLudoNetPrize(
                              Number(selectedStakePreview.amount),
                              ludoCommissionPct,
                            ),
                          )}
                    </span>
                  </div>
                </div>

                <div className="mt-9">
                  <p className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#4a5c99]">
                    Choose Color
                  </p>
                  <div className="flex items-center justify-center gap-5">
                    {[
                      { value: "RED" as const, color: "#c2410c", label: "Red" },
                      { value: "GREEN" as const, color: "#16a34a", label: "Green" },
                    ].map((pin) => {
                      const isSelected = selectedColor === pin.value;

                      return (
                        <button
                          key={pin.value}
                          type="button"
                          onClick={() => setSelectedColor(pin.value)}
                          className="flex flex-col items-center gap-3 rounded-2xl px-2 py-1 transition-transform hover:scale-[1.03] active:scale-[0.98]"
                          aria-pressed={isSelected}
                          aria-label={`Choose ${pin.label} color`}
                        >
                          <div
                            className={`relative h-11 w-11 transition-transform ${
                              isSelected ? "scale-105" : "opacity-75"
                            }`}
                          >
                            <span
                              className="absolute inset-x-[7px] top-0 h-7 rounded-full border-[3px] border-white shadow-[0_4px_8px_rgba(15,23,42,0.2)]"
                              style={{ backgroundColor: pin.color }}
                            />
                            <span className="absolute left-1/2 top-6 h-4 w-[3px] -translate-x-1/2 rounded-full bg-[#4b5f99]" />
                            <span className="absolute left-1/2 top-[34px] h-[5px] w-7 -translate-x-1/2 rounded-full bg-[#4966c7]" />
                          </div>
                          <span
                            className={`flex h-6 min-w-6 items-center justify-center rounded-sm border px-1 text-sm font-black ${
                              isSelected
                                ? "border-slate-300 bg-[#e8e1cb] text-slate-950"
                                : "border-transparent bg-slate-300/85 text-transparent"
                            }`}
                          >
                            {isSelected ? "✓" : "•"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-5">
                <button
                  type="button"
                  onClick={confirmStakePreview}
                  disabled={joinQueueMutation.isPending || isSearching}
                  className="inline-flex min-w-[162px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#ffd34e_0%,#f0a928_100%)] px-8 py-4 text-[2rem] font-black uppercase leading-none tracking-[-0.04em] text-[#7b4200] shadow-[0_9px_0_#bf7715,0_18px_26px_rgba(15,23,42,0.2)] transition-transform hover:translate-y-[1px] active:translate-y-[2px] disabled:opacity-60"
                >
                  {joinQueueMutation.isPending || isSearching ? "..." : "Start"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border border-violet-200/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-violet-400/18 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] dark:shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-700">
                Invite Friend
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Search by username and send a direct Ludo invite.
              </p>
            </div>
            <div className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
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
                        ? "border-violet-300 bg-violet-500/12 text-violet-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Tk {stake.amount.toLocaleString("en-BD")}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <Search className="h-4 w-4 text-violet-500" />
              <input
                type="text"
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.target.value)}
                placeholder="Search username"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
              />
              {isInviteSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {inviteSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      @{user.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendInviteMutation.mutate(user)}
                    disabled={sendInviteMutation.isPending || isSearching}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60"
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
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
                  No users found.
                </div>
              ) : null}

              {inviteQuery.trim().length < 2 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
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
