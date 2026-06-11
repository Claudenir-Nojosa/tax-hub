// lib/i18nFallback.ts
export function getFallback(
  lang: string,
  pt: string,
  en: string,
) {
  return lang === "en" ? en : pt;
}
