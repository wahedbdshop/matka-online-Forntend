"use client";

import { useLayoutEffect } from "react";
import { useUIStore } from "@/store/ui.store";

const applyThemeClass = (theme: "dark" | "light") => {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useLayoutEffect(() => {
    applyThemeClass(useUIStore.getState().theme);

    const unsubscribe = useUIStore.subscribe((state, previousState) => {
      if (state.theme !== previousState.theme) {
        applyThemeClass(state.theme);
      }
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};
