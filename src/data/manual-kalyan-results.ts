import { KalyanGroupedResult } from "@/types/kalyan";

export interface ManualKalyanResultSource {
  updatedAt: string | null;
  note?: string;
  results: KalyanGroupedResult[];
}

// Manual fallback data for the public Kalyan result board.
// Keep this list empty unless you intentionally want to override the empty-state
// when the primary API is unavailable or has not published data yet.
export const manualKalyanResultSource: ManualKalyanResultSource = {
  updatedAt: null,
  note: "Manual backup is ready but currently has no published entries.",
  results: [],
};
