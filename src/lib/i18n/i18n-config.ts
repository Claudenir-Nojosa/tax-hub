export const i18nConfig = {
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "always",
} as const;

export type Locale = (typeof i18nConfig)["locales"][number];
