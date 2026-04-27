"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AppLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  resolvePreferredLanguage,
} from "@/lib/language";
import { translations } from "@/lib/translations";
import { useAuthStore } from "@/store/auth.store";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (typeof translations)["en"];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getClientPreferredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLanguage) {
    return resolvePreferredLanguage(storedLanguage);
  }

  const browserLanguage = window.navigator.language.toLowerCase();

  if (browserLanguage.startsWith("bn")) {
    return "bn";
  }

  if (browserLanguage.startsWith("hi")) {
    return "hi";
  }

  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);
  const userLanguage = useAuthStore(
    (state) => state.user?.preferredLanguage ?? state.user?.language,
  );
  const resolvedLanguage = resolvePreferredLanguage(userLanguage ?? language);

  useEffect(() => {
    if (userLanguage || initialLanguage !== DEFAULT_LANGUAGE) return;

    const preferredLanguage = getClientPreferredLanguage();
    if (preferredLanguage === language) return;

    const timeoutId = window.setTimeout(() => {
      setLanguageState(preferredLanguage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialLanguage, language, userLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  }, [resolvedLanguage]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo(
    () => ({
      language: resolvedLanguage,
      setLanguage,
      t: translations[resolvedLanguage],
    }),
    [resolvedLanguage, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
