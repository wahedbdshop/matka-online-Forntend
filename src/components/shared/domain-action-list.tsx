"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DomainActionListProps = {
  domains: string[];
  layout?: "stack" | "wrap";
  theme?: "dark" | "light" | "adaptive";
  className?: string;
};

const orderedDomains = (domains: string[]) =>
  [...domains].sort((left, right) => {
    const rank = (domain: string) => {
      if (domain.endsWith(".org")) return 0;
      if (domain.endsWith(".com")) return 1;
      if (domain.endsWith(".online")) return 2;
      return 3;
    };

    return rank(left) - rank(right);
  });

export function DomainActionList({
  domains,
  layout = "stack",
  theme = "dark",
  className,
}: DomainActionListProps) {
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const sortedDomains = orderedDomains(domains);
  const isDark = theme === "dark";
  const isAdaptive = theme === "adaptive";

  async function copyDomain(domain: string) {
    try {
      await navigator.clipboard.writeText(`https://${domain}`);
      setCopiedDomain(domain);
      toast.success(`${domain} copied`);
      window.setTimeout(() => {
        setCopiedDomain((current) => (current === domain ? null : current));
      }, 1800);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function shareDomain(domain: string) {
    const url = `https://${domain}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: domain,
          text: `Official domain: ${domain}`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success(`${domain} copied for sharing`);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      toast.error("Share failed");
    }
  }

  return (
    <div
      className={cn(
        layout === "wrap" ? "flex flex-wrap gap-2" : "space-y-1",
        className,
      )}
    >
      {sortedDomains.map((domain, index) => {
        const isCopied = copiedDomain === domain;

        return (
          <div
            key={domain}
            className={cn(
              "group flex items-center gap-1.5 py-0.5 transition-all",
              isDark ? "text-white" : isAdaptive ? "text-black dark:text-white" : "text-black",
              index === 0 &&
                (isDark
                  ? "text-[#f8d66d]"
                  : isAdaptive
                    ? "text-black dark:text-[#f8d66d]"
                    : "text-black"),
              layout === "wrap" && "w-auto",
            )}
          >
            <button
              type="button"
              onClick={() => void copyDomain(domain)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 text-left transition-all",
                isDark
                  ? "hover:text-[#fff3bf]"
                  : isAdaptive
                    ? "hover:text-black dark:hover:text-[#fff3bf]"
                    : "hover:text-black",
              )}
            >
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-[0.22em]",
                  index === 0
                    ? "text-[#f0bf38]"
                    : isDark
                      ? "text-sky-300/90"
                      : isAdaptive
                        ? "text-sky-700 dark:text-sky-300/90"
                        : "text-sky-700",
                )}
              >
                {index === 0 ? "Main" : "Link"}
              </span>
              <span
                className={cn(
                  "truncate text-[10px] font-black leading-none",
                  isDark ? "text-white" : isAdaptive ? "text-black dark:text-white" : "text-black",
                  index === 0 &&
                    (isDark
                      ? "text-[#fff0b3]"
                      : isAdaptive
                        ? "dark:text-[#fff0b3]"
                        : ""),
                )}
              >
                {domain}
              </span>
              {isCopied ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
              ) : (
                <Copy
                  className={cn(
                    "h-3 w-3 shrink-0",
                    isDark
                      ? "text-white/90"
                      : isAdaptive
                        ? "text-black/75 dark:text-white/90"
                        : "text-black/75",
                  )}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => void shareDomain(domain)}
              aria-label={`Share ${domain}`}
              className={cn(
                "p-1 transition-all",
                isDark
                  ? "text-sky-200 hover:text-white"
                  : isAdaptive
                    ? "text-slate-700 hover:text-black dark:text-sky-200 dark:hover:text-white"
                    : "text-slate-700 hover:text-black",
              )}
            >
              <Share2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
