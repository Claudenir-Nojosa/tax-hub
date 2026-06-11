// app/(site)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const HomePageLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      // Extrair a linguagem do pathname
      const lang = pathname?.startsWith("/en") ? "en" : "pt";

      // Forçar refresh e redirecionar
      router.refresh();
      router.replace(`/${lang}/dashboard`);
    }
  }, [session, status, router, pathname]);

  // Se estiver carregando ou usuário logado (durante redirecionamento)
  if (status === "loading" || session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <main>{children}</main>;
};

export default HomePageLayout;
