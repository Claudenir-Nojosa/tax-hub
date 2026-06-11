/* import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18nConfig } from "./i18n/i18n-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locales, defaultLocale } = i18nConfig;

  // Verifica se o pathname já tem um locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Se não tem locale, redireciona para o locale padrão
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Pular todas as rotas internas (_next)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
}; */
