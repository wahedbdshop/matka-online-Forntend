"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, ChevronLeft, Languages, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AppLanguage,
  LANGUAGE_OPTIONS,
  resolvePreferredLanguage,
} from "@/lib/language";
import { useLanguage } from "@/providers/language-provider";
import { useAuthStore } from "@/store/auth.store";
import { useProfileQuery } from "@/hooks/use-profile-query";
import { UserService } from "@/services/user.service";
import { cn } from "@/lib/utils";

export default function ProfileLanguagePage() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const updateUser = useAuthStore((state) => state.updateUser);
  const { data } = useProfileQuery();
  const profile = data?.data;
  const profileLanguage = resolvePreferredLanguage(
    profile?.preferredLanguage ?? profile?.language,
  );

  const { mutate: saveLanguage, isPending } = useMutation({
    mutationFn: (nextLanguage: AppLanguage) =>
      UserService.updateProfile({ preferredLanguage: nextLanguage }),
    onSuccess: (_, nextLanguage) => {
      setLanguage(nextLanguage);
      updateUser({ preferredLanguage: nextLanguage, language: nextLanguage });
      toast.success(t.profile.languageSaved);
    },
    onError: () => {
      toast.error(t.profile.languageSaveFailed);
    },
  });

  return (
    <div className="space-y-4 pb-6">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex items-center gap-1 rounded-full border border-[#295487] bg-gradient-to-r from-[#0b1730] to-[#10203a] px-2.5 py-1 text-white/90 shadow-[0_8px_18px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4f8fcc] hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="text-[10px] font-semibold tracking-[0.06em]">
            Back
          </span>
        </button>
        <h1 className="text-xl font-bold text-slate-950 dark:text-white">
          {t.profile.languageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.profile.languageDescription}
        </p>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-none">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              {t.common.selectLanguage}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose your preferred language for the full app experience.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.value === profileLanguage;

            return (
              <button
                key={option.value}
                type="button"
                disabled={isPending}
                onClick={() => saveLanguage(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all duration-200",
                  isActive
                    ? "border-sky-300 bg-sky-50 shadow-[0_10px_25px_rgba(14,165,233,0.12)] dark:border-sky-500/40 dark:bg-sky-500/10"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900",
                  isPending && "cursor-not-allowed opacity-70",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {option.nativeLabel}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {option.englishLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isPending && isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                  ) : null}
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border",
                      isActive
                        ? "border-sky-300 bg-sky-500 text-white dark:border-sky-500 dark:bg-sky-500"
                        : "border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => router.back()}
        className="w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Back to Profile
      </Button>
    </div>
  );
}
