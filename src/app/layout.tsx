import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/components/shared/auth-bootstrap";
import { AuthHydrator } from "@/components/shared/auth-hydrator";
import { getInitialSession } from "@/lib/server-session";
import { resolvePreferredLanguage } from "@/lib/language";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Matka Online 24",
  description: "Online Lottery Platform",
  icons: {
    icon: "/faveicon.png",
    apple: "/faveicon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSession = await getInitialSession();
  const initialLanguage = resolvePreferredLanguage(
    initialSession.user?.preferredLanguage ?? initialSession.user?.language,
  );

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <body className={`${geist.className} bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50`}>
        <QueryProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <ThemeProvider>
              <AuthHydrator initialSession={initialSession} />
              <AuthBootstrap />
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
