import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/components/shared/auth-bootstrap";
import { AuthHydrator } from "@/components/shared/auth-hydrator";
import { getInitialSession } from "@/lib/server-session";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Matka Online 24",
  description: "Online Lottery Platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialSession = await getInitialSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthHydrator initialSession={initialSession} />
            <AuthBootstrap />
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
