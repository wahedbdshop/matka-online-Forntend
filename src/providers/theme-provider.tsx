"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/ui.store";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
};
