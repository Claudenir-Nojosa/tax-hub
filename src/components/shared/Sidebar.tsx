"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  X,
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
      className={`flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <div className="flex items-center">
            <Image
              src="/icons/taxhub_logo_principal_claro_transparente.png"
              alt="TAX Hub"
              width={130}
              height={36}
              className="block dark:hidden"
              priority
            />
            <Image
              src="/icons/taxhub_logo_principal_escuro_transparente.png"
              alt="TAX Hub"
              width={130}
              height={36}
              className="hidden dark:block"
              priority
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Ícone quando colapsado */}
      {isCollapsed && (
        <div className="flex items-center justify-center py-4">
          <Image
            src="/icons/taxhub_icone_claro_transparente.png"
            alt="TAX Hub"
            width={56}
            height={56}
            className="block dark:hidden"
            priority
          />
          <Image
            src="/icons/taxhub_icone_escuro_transparente.png"
            alt="TAX Hub"
            width={56}
            height={56}
            className="hidden dark:block"
            priority
          />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
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
      className={`flex items-center rounded-xl transition-all duration-200 ${isCollapsed ? "justify-center p-3.5" : "px-3.5 py-3"} ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      }`}
      onClick={handleLinkClick}
    >
      <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-sidebar-primary" : ""}`} />
      {!isCollapsed && (
        <span className="ml-3 text-sm font-medium truncate">{item.label}</span>
      )}
    </Link>
  </li>
  );
})}
        </ul>
      </nav>

      {/* Usuário */}
      <div className="p-3 space-y-2">
        <Link
          href={createLink("/dashboard/perfil")}
          className={`flex items-center rounded-xl p-3 hover:bg-sidebar-accent/60 transition-all duration-200 cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
          onClick={handleLinkClick}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-sidebar-primary/30">
            <AvatarImage
              src={session?.user?.image || ""}
              alt={session?.user?.name || "Usuário"}
              className="object-cover"
            />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
              {getInitials(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
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
