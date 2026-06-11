"use client";

import { ReactNode, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/client";
import { useParams } from "next/navigation";

export function I18nProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const lang = (params?.lang as string) || "pt";

    // Sincroniza o idioma do i18n com o parâmetro da URL
    const syncLanguage = async () => {
      if (lang && i18n.language !== lang) {
        try {
          await i18n.changeLanguage(lang);
        } catch (error) {
          console.error("Erro ao mudar idioma:", error);
        }
      }
      setMounted(true);
    };

    syncLanguage();
  }, [params?.lang]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando traduções...</p>
        </div>
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
