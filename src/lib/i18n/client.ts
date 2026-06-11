"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Cria uma nova instância do i18n
const i18nInstance = i18n.createInstance();

i18nInstance
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "pt",
    supportedLngs: ["pt", "en"],
    debug: process.env.NODE_ENV === "development",

    // Namespaces
    defaultNS: "common",
    ns: ["common", "dashboard", "limites", "dashboardTable", "metasCard", "sidebar", "categorias", "bicla", "vincularTelefone", "metas", "upload", "cartoes", "faturas", "relatorios", "limites", "colaboradores", "editCartoes", "navbar", "hero", "tech", "features", "launchMethods", "faq", "sharedExpenses", "pricing", "footer", "cta", "metaVerified", "productivityGains", "howItWorks", "register", "auth", "suporte", "onboarding", "perfil"],

    // Interpolação
    interpolation: {
      escapeValue: false,
    },

    // Backend configuration
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    // Detecção de idioma
    detection: {
      order: ["path", "cookie", "htmlTag", "navigator"],
      caches: ["cookie"],
    },

    // React
    react: {
      useSuspense: false,
    },
  });

export default i18nInstance;
