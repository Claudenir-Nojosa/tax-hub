"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/landingpage/NavBar";
import { SessionProvider, useSession } from "next-auth/react";

function AuthContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isLoginPage = pathname?.includes("/login");
  const isSignupPage = pathname?.includes("/signup");
  const isAuthPage = isLoginPage || isSignupPage;

  // Não mostra navbar se está autenticado ou ainda carregando
  const showNavbar = isAuthPage && !session && status !== "loading";

  return (
    <section className="flex flex-col items-center py-40">
      {showNavbar && <Navbar />}
      {children}
    </section>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AuthContent>{children}</AuthContent>
    </SessionProvider>
  );
}