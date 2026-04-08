import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/components/shared/auth-bootstrap";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Matka Online 24",
  description: "Online Lottery Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthBootstrap />
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
