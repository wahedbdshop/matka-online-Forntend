export const SUPPORTED_LANGUAGES = ["en", "bn", "hi"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";
export const LANGUAGE_STORAGE_KEY = "app-language";

export const LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  nativeLabel: string;
  englishLabel: string;
}> = [
  { value: "en", nativeLabel: "English", englishLabel: "English" },
  { value: "bn", nativeLabel: "বাংলা", englishLabel: "Bangla" },
  { value: "hi", nativeLabel: "हिन्दी", englishLabel: "Hindi" },
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function resolvePreferredLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}
