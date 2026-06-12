import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/api/webhooks/stripe",
];
// ts
function isRouteInList(pathname: string, routeList: string[]): boolean {
  return routeList.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Ignorar arquivos estáticos e APIs internas
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // Redirecionar raiz para dashboard ou login
    if (pathname === "/") {
      let isAuthenticated = false;
      try {
        const session = await auth();
        isAuthenticated = !!session?.user;
      } catch {}

      return NextResponse.redirect(
        new URL(isAuthenticated ? "/dashboard" : "/login", request.url),
      );
    }

    let isAuthenticated = false;
    try {
      const session = await auth();
      isAuthenticated = !!session?.user;
    } catch {}

    const isPublicRoute = isRouteInList(pathname, publicRoutes);

    // Autenticado em rota pública → dashboard
    if (isPublicRoute && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Não autenticado em rota protegida → login
    if (!isPublicRoute && !isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Erro no middleware:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
