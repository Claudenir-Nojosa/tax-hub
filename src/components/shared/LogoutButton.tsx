// components/shared/LogoutButtonSimple.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Icons } from "../ui/loadingSpinner";

interface LogoutButtonSimpleProps {
  locale: string;
  isCollapsed?: boolean;
  translations?: {
    sair: string;
    saindo: string;
    erroLogout: string;
  };
}

// Função auxiliar para obter tradução com fallback
const getFallback = (lang: string, pt: string, en: string) => {
  return lang === "en" ? en : pt;
};

export default function LogoutButtonSimple({
  locale,
  isCollapsed = false,
  translations,
}: LogoutButtonSimpleProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fallback padrão para traduções
  const defaultTranslations = {
    sair: getFallback(locale, "Sair", "Logout"),
    saindo: getFallback(locale, "Saindo...", "Logging out..."),
    erroLogout: getFallback(
      locale,
      "Erro ao fazer logout",
      "Error logging out",
    ),
  };

  // Usar traduções fornecidas ou fallback padrão
  const t = { ...defaultTranslations, ...translations };

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      // Fazer logout
      await signOut({
        redirect: true, // ← MUDADO PARA true
        callbackUrl: `/${locale}/login`,
      });

      // O signOut com redirect:true já vai redirecionar automaticamente
      // Não precisamos fazer mais nada
    } catch (error) {
      console.error("❌ [LOGOUT SIMPLE] Erro:", error);
      toast.error(t.erroLogout);

      // Fallback: redirecionar manualmente
      setTimeout(() => {
        window.location.href = `/${locale}/login`;
      }, 300);
    }
  };

  return (
    <Button
      variant="ghost"
      className={`
        w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
        text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white 
        transition-all duration-200
        ${isCollapsed ? "justify-center p-3" : "justify-start p-3"}
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <Icons.spinner className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}

      {!isCollapsed && !isLoading && (
        <span className="ml-3 text-sm">{t.sair}</span>
      )}

      {!isCollapsed && isLoading && (
        <span className="ml-3 text-sm">{t.saindo}</span>
      )}
    </Button>
  );
}
