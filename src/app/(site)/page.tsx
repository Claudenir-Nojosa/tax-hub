// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LandingPage from "@/components/landingpage/LandingPage";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      // Usuário está logado, redirecionar para o dashboard
      const pathname = window.location.pathname;
      const lang = pathname.startsWith("/en") ? "en" : "pt";
      router.push(`/${lang}/dashboard`);
    }
  }, [session, status, router]);

  // Se estiver carregando, mostrar loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não estiver logado, mostrar a landing page
  if (!session?.user) {
    return <LandingPage />;
  }

  // Se estiver logado, mostrar nada (já será redirecionado)
  return null;
}