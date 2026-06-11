import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

const locales = ["pt", "en"];
const defaultLocale = "pt";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/api/webhooks/stripe",
];

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

function removeLocaleFromPath(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.replace(`/${locale}`, "") || "/";
    }
  }
  return pathname;
}

function isRouteInList(pathname: string, routeList: string[]): boolean {
  return routeList.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function getPreferredLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  return acceptLanguage.toLowerCase().startsWith("en") ? "en" : defaultLocale;
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (pathname === "/api/webhooks/stripe") return NextResponse.next();

    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const currentLocale = getLocaleFromPath(pathname);
    const pathWithoutLocale = removeLocaleFromPath(pathname);

    // Rota raiz sem locale → redirecionar para locale preferido
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(`/${getPreferredLocale(request)}`, request.url),
      );
    }

    // Sem locale na URL → adicionar
    if (!currentLocale) {
      return NextResponse.redirect(
        new URL(`/${getPreferredLocale(request)}${pathname}`, request.url),
      );
    }

    const locale = currentLocale;

    // Raiz com locale (ex: /pt) → redirecionar para dashboard
    if (pathname === `/${locale}`) {
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard`, request.url),
      );
    }

    // Verificar autenticação
    let isAuthenticated = false;
    try {
      const session = await auth();
      isAuthenticated = !!session?.user;
    } catch (error) {
      console.error("❌ [MIDDLEWARE] Erro ao verificar autenticação:", error);
    }

    const isPublicRoute = isRouteInList(pathWithoutLocale, publicRoutes);

    // Autenticado tentando acessar rota pública → dashboard
    if (isPublicRoute && isAuthenticated) {
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard`, request.url),
      );
    }

    // Não autenticado tentando acessar rota protegida → login
    if (!isPublicRoute && !isAuthenticated) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Erro no middleware:", error);
    return NextResponse.redirect(
      new URL(`/${defaultLocale}/login`, request.url),
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};