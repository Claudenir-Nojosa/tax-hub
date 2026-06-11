"use client";

import { Navbar } from "@/components/landingpage/NavBar";
import { SessionProvider } from "next-auth/react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <section className="flex flex-col items-center py-40">
        <Navbar />
        {children}
      </section>
    </SessionProvider>
  );
}