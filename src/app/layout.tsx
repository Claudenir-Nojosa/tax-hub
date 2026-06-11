// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// @ts-ignore
import "./globals.css";
import { ThemeProvider } from "@/lib/providers/next-theme-provider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "../../auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tax-hub",
  description: "tax-hub",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950`}
      >
        <SessionProvider session={session} refetchOnWindowFocus={false}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <Toaster />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
