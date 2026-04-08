"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { KalyanPublicResultService } from "@/services/kalyanPublicResult.service";
import { KalyanGroupedResult, KalyanResultFeedState } from "@/types/kalyan";
import { KalyanPageHeader } from "@/components/kalyan/user/KalyanPageHeader";
import { ResultCard } from "@/components/kalyan/user/ResultCard";
import { LoadingState } from "@/components/kalyan/user/LoadingState";
import { ErrorState } from "@/components/kalyan/user/ErrorState";
import { EmptyState } from "@/components/kalyan/user/EmptyState";

function formatDateLabel(value?: string) {
  if (!value) return "Unknown Date";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function KalyanResultPageContent({
  backHref = "/kalyan",
}: {
  backHref?: string;
}) {
  const [feed, setFeed] = useState<KalyanResultFeedState>({
    results: [],
    sourceLabel: "Own API",
    fallbackActive: false,
    lastUpdated: null,
    warning: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextFeed = await KalyanPublicResultService.getResultFeed();
      setFeed(nextFeed);
    } catch {
      setError("Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const sections = feed.results.reduce<Array<{ date: string; items: KalyanGroupedResult[] }>>(
    (acc, result) => {
      const dateKey = result.resultDate || "unknown";
      const last = acc[acc.length - 1];

      if (!last || last.date !== dateKey) {
        acc.push({
          date: dateKey,
          items: [result],
        });
      } else {
        last.items.push(result);
      }

      return acc;
    },
    [],
  );

  return (
    <div className="space-y-5 pb-6">
      <KalyanPageHeader
        title="Results"
        subtitle="Published results from your own system"
        backHref={backHref}
      />

      {loading && <LoadingState message="Loading results..." rows={6} />}

      {error && !loading && (
        <ErrorState message={error} onRetry={() => fetchResults()} />
      )}

      {!loading && !error && feed.results.length === 0 && (
        <EmptyState
          icon={Search}
          title="No results found"
          description="No published result is available right now."
        />
      )}

      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.date} className="flex flex-col items-center gap-3">
              <div className="w-full max-w-xl px-1">
                <div className="rounded-xl border border-amber-400/25 bg-[#2a1b07] px-4 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.2)]">
                  <p className="text-left text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                    Date {formatDateLabel(section.date)}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-3">
                {section.items.map((result) => (
                  <ResultCard
                    key={`${section.date}-${result.gameKey}`}
                    result={result}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return <KalyanResultPageContent />;
}
