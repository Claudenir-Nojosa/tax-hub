"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/landingpage/NavBar";
import Image from "next/image";
import Link from "next/link";
import { SessionProvider } from "next-auth/react"; // ✅ adiciona

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname?.includes("/login/onboarding");

  return (
    <SessionProvider> {/* ✅ envolve tudo */}
      <section
        className={`flex flex-col items-center ${isOnboardingPage ? "py-0" : "py-40"}`}
      >
        {!isOnboardingPage && <Navbar />}

        {!isOnboardingPage && (
          <Link href={"/"}>
          </Link>
        )}

        {children}
      </section>
    </SessionProvider>
  );
}