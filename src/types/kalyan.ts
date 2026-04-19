export interface Market {
  id: string;
  name: string;
  slug: string;
  openName?: string;
  closeName?: string;
  sessionType?: "OPEN" | "CLOSE";
  openTime?: string;
  closeTime?: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface MarketTiming {
  id: string;
  marketId: string;
  gameName?: string;
  sessionType: "OPEN" | "CLOSE";
  openTime: string;
  closeTime: string;
  isAutoOpen: boolean;
  status: "ACTIVE" | "INACTIVE";
  market?: Market;
}

export interface KalyanResult {
  id: string;
  marketId: string;
  resultDate: string;
  openPatti: string;
  closePatti: string;
  openTotal?: string | number;
  closeTotal?: string | number;
  finalResult?: string;
  status: "PENDING" | "PUBLISHED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  market?: Market;
}

export interface KalyanGroupedResult {
  gameKey: string;
  title: string;
  openTime?: string;
  closeTime?: string;
  resultDate: string;
  createdAt?: string;
  updatedAt?: string;
  openPatti?: string | null;
  openTotal?: string | number | null;
  closePatti?: string | null;
  closeTotal?: string | number | null;
  finalResult?: string | null;
  finalDisplay?: string | null;
  status?: string;
}

export interface KalyanResultFeedState {
  results: KalyanGroupedResult[];
  sourceLabel: string;
  fallbackActive: boolean;
  lastUpdated: string | null;
  warning: string | null;
}

export type PlayType =
  | "GAME_TOTAL"
  | "SINGLE_PATTI"
  | "DOUBLE_PATTI"
  | "TRIPLE_PATTI"
  | "JORI";

export type GameSessionStatus = "ACTIVE" | "CLOSE" | "CANCEL";
export type BetResultStatus =
  | "PENDING"
  | "WON"
  | "LOST"
  | "CANCELLED"
  | "REMOVED"
  | "REVERSED";

export interface EntryItem {
  id: string;
  entrySlipId: string;
  playType: PlayType;
  selectedNumber: string;
  amount: number;
  enteredAmount?: number;
  discountPct?: number;
  discountAmount?: number;
  payableAmount?: number;
  status: BetResultStatus | GameSessionStatus;
  gameStatus?: GameSessionStatus;
  betStatus?: string | null;
  createdAt: string;
}

export interface EntrySlip {
  id: string;
  userId: string;
  marketId: string;
  gameName?: string;
  playType?: PlayType;
  sessionType: "OPEN" | "CLOSE";
  resultDate: string;
  totalAmount: number;
  totalEnteredAmount?: number;
  totalDiscountAmount?: number;
  totalPayableAmount?: number;
  status: BetResultStatus | GameSessionStatus;
  gameStatus?: GameSessionStatus;
  betStatus?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
  };
  market?: Market;
  items?: EntryItem[];
}

export interface Rate {
  playType: PlayType;
  rate: number;
  status: "ACTIVE" | "INACTIVE";
  baseDiscountPct?: number;
  globalDiscountPct?: number;
}

export interface EditHistory {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  editedBy: string;
  editedByUser?: { name: string; username: string };
  createdAt: string;
  market?: Market;
}

export interface MarketFilterParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ResultFilterParams {
  marketId?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface EntryFilterParams {
  search?: string;
  marketId?: string;
  sessionType?: string;
  playType?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export const PLAY_TYPE_LABEL: Record<PlayType, string> = {
  GAME_TOTAL: "Game Total",
  SINGLE_PATTI: "Single Patti",
  DOUBLE_PATTI: "Double Patti",
  TRIPLE_PATTI: "Triple Patti",
  JORI: "Jori",
};

export const MARKET_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
  INACTIVE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export const RESULT_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  PUBLISHED: "bg-green-500/15 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const ENTRY_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
  CLOSE: "bg-slate-700/50 text-slate-400 border-slate-600/40",
  CANCEL: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  WON: "bg-green-500/15 text-green-400 border-green-500/30",
  LOST: "bg-red-500/15 text-red-400 border-red-500/30",
  CANCELLED: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  REMOVED: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  REVERSED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};
