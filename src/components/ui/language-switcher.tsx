"use client";

import { useTranslation } from "react-i18next";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Importe a instância do i18n diretamente
import i18n from "@/lib/i18n/client";

export function LanguageSwitcher() {
  const { t } = useTranslation(); // Ainda usamos useTranslation para o contexto
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const languages = [
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
  ];

  const handleLanguageChange = async (newLocale: string) => {
    try {
      // Use a instância do i18n diretamente
      await i18n.changeLanguage(newLocale);

      // Lógica para construir a nova URL
      const segments = pathname.split("/");
      
      // Verifica se a URL já tem um código de linguagem (ex: /pt, /en, /es)
      const hasLangParam = languages.some(lang => segments[1] === lang.code);
      
      let newPathname: string;
      
      if (hasLangParam) {
        // Se já tem linguagem, substitui pelo novo código
        segments[1] = newLocale;
        newPathname = segments.join("/");
      } else {
        // Se não tem linguagem, adiciona no início
        newPathname = `/${newLocale}${pathname === "/" ? "" : pathname}`;
      }

      // Navega para a nova URL
      router.push(newPathname);

      // Força um reload suave para atualizar os textos
      router.refresh();
    } catch (error) {
      console.error("Erro ao alterar idioma:", error);
    }
  };

  // Determina a linguagem atual baseada na URL ou i18n
  const getCurrentLanguage = () => {
    // Primeiro tenta pegar da URL
    const urlLang = pathname.split("/")[1];
    const langFromUrl = languages.find(lang => lang.code === urlLang);
    
    if (langFromUrl) {
      return langFromUrl;
    }
    
    // Se não encontrar na URL, usa do i18n
    return languages.find(lang => lang.code === i18n.language) || languages[0];
  };

  const currentLanguage = getCurrentLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">
            {currentLanguage.flag} {currentLanguage.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-none"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`
              cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 
              ${currentLanguage.code === language.code 
                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }
            `}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}