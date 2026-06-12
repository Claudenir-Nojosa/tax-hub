"use client";

import { SessionProvider } from "next-auth/react";
// Auth
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
