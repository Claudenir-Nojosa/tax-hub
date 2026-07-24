"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Target,
  FileSearch,
  GraduationCap,
  Scale,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButtonSimple from "./LogoutButton";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarState");
    if (savedState) {
      const { isCollapsed: savedCollapsed } = JSON.parse(savedState);
      setIsCollapsed(savedCollapsed);
    } else {
      setIsCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (isCollapsed !== null) {
      localStorage.setItem(
        "sidebarState",
        JSON.stringify({ isCollapsed, openSubmenus: { lancamentos: false } }),
      );
    }
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose();
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const isActiveRoute = (route: string) => {
    const pathWithoutLang = pathname.replace(/^\/(pt|en)/, "");
    const routeWithoutLang = route.replace(/^\/(pt|en)/, "");
    return pathWithoutLang === routeWithoutLang;
  };

  const createLink = (path: string) =>
    path.startsWith("/") ? path : `/${path}`;

  if (isCollapsed === null) return <div className="w-20 lg:w-64" />;

  return (
    <div
      className={`relative flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* botão de recolher/expandir — flutuante na borda, padrão de app shell moderno (Linear/Notion/Vercel) */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        className="hidden lg:flex absolute -right-3 top-7 h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:text-sidebar-primary hover:border-sidebar-primary/50 shadow-sm transition-colors z-10"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5">
        {!isCollapsed && (
          <div className="flex items-center">
            <Image
              src="/icons/taxhub_logo_claro.svg"
              alt="TAX Hub"
              width={130}
              height={38}
              className="block dark:hidden"
              unoptimized
              priority
            />
            <Image
              src="/icons/taxhub_logo_escuro.svg"
              alt="TAX Hub"
              width={130}
              height={38}
              className="hidden dark:block"
              unoptimized
              priority
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground h-10 w-10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Ícone quando colapsado */}
      {isCollapsed && (
        <div className="flex items-center justify-center py-2">
          <Image
            src="/icons/taxhub_icone_claro.svg"
            alt="TAX Hub"
            width={44}
            height={44}
            className="block dark:hidden"
            unoptimized
            priority
          />
          <Image
            src="/icons/taxhub_icone_escuro.svg"
            alt="TAX Hub"
            width={44}
            height={44}
            className="hidden dark:block"
            unoptimized
            priority
          />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Menu
          </div>
        )}
        <ul className="space-y-0.5">
        {[
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/dashboard/automacoes", label: "Automações", icon: Sparkles },
  { href: "/dashboard/legislacoes", label: "Legislações", icon: BookOpen },
  { href: "/dashboard/planejador-tributario", label: "Planejador", icon: Target },
  { href: "/dashboard/recuperacao-credito", label: "Recuperação", icon: FileSearch },
  { href: "/dashboard/estudo", label: "Estudo", icon: GraduationCap },
  { href: "/dashboard/reforma-tributaria", label: "Reforma Tributária", icon: Scale },
].map((item) => {
  const active = isActiveRoute(item.href);
  return (
  <li key={item.href}>
    <Link
      href={createLink(item.href)}
      title={item.label}
      className={`group relative flex items-center rounded-xl transition-all duration-200 ${isCollapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2"} ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      }`}
      onClick={handleLinkClick}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
      )}
      <span
        className={`flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0 transition-colors ${
          active
            ? "bg-sidebar-primary/15 text-sidebar-primary shadow-[0_0_12px_hsl(var(--sidebar-primary)/0.35)]"
            : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
        }`}
      >
        <item.icon className="h-[18px] w-[18px]" />
      </span>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
    </Link>
  </li>
  );
})}
        </ul>
      </nav>

      {/* Usuário */}
      <div className="border-t border-sidebar-border/60 p-3 space-y-2">
        <Link
          href={createLink("/dashboard/perfil")}
          title="Meu perfil"
          className={`flex items-center rounded-xl p-2.5 border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent/40 transition-all duration-200 ${isCollapsed ? "justify-center" : ""}`}
          onClick={handleLinkClick}
        >
          <div className="relative flex-shrink-0">
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/25">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || "Usuário"}
                className="object-cover"
              />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-sidebar-primary ring-2 ring-sidebar" />
          </div>
          {!isCollapsed && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {session?.user?.email}
              </p>
            </div>
          )}
        </Link>

        <LogoutButtonSimple isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
