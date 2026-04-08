import { manualKalyanResultSource } from "@/data/manual-kalyan-results";
import { KalyanUserService } from "@/services/kalyanUser.service";
import { KalyanGroupedResult } from "@/types/kalyan";

export type KalyanResultSourceMode = "primary" | "manual";

export interface KalyanResultFeed {
  results: KalyanGroupedResult[];
  source: KalyanResultSourceMode;
  fallbackActive: boolean;
  sourceLabel: string;
  lastUpdated: string | null;
  warning: string | null;
}

function normalizeApiResults(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as KalyanGroupedResult[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown[] }).results)
  ) {
    return (payload as { results: KalyanGroupedResult[] }).results;
  }

  return [];
}

function buildManualFeed(reason?: string): KalyanResultFeed {
  const hasManualResults = manualKalyanResultSource.results.length > 0;

  return {
    results: manualKalyanResultSource.results,
    source: "manual",
    fallbackActive: true,
    sourceLabel: "Manual backup",
    lastUpdated: manualKalyanResultSource.updatedAt,
    warning: hasManualResults
      ? reason ?? "Primary API is unavailable, so manual backup data is being shown."
      : reason ??
        "Primary API is unavailable and no manual backup result has been added yet.",
  };
}

export const KalyanPublicResultService = {
  async getResultFeed(): Promise<KalyanResultFeed> {
    try {
      const response = await KalyanUserService.getPublishedResults({
        page: 1,
        limit: 100,
      });
      const results = normalizeApiResults(response?.data);

      if (results.length > 0) {
        return {
          results,
          source: "primary",
          fallbackActive: false,
          sourceLabel: "Own API",
          lastUpdated: results[0]?.resultDate ?? null,
          warning: null,
        };
      }

      if (manualKalyanResultSource.results.length > 0) {
        return buildManualFeed(
          "Primary API returned no published results, so manual backup data is being shown.",
        );
      }

      return {
        results: [],
        source: "primary",
        fallbackActive: false,
        sourceLabel: "Own API",
        lastUpdated: null,
        warning: null,
      };
    } catch {
      return buildManualFeed();
    }
  },
};
