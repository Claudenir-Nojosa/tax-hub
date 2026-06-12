"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Home,
  Menu,
  LogOut,
  X,
  Crown,
  ChevronDown,
  ChevronUp,
  FlipHorizontal2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/app/(auth)/(logout)/logoutAction";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import LogoutButtonSimple from "./LogoutButton";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
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
      className={`flex flex-col h-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-r border-gray-200 dark:border-gray-800 shadow-lg dark:shadow-none transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <Image
              src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/logo.png?raw=true"
              alt="tax-hub Logo"
              width={40}
              height={40}
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              tax-hub
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
        {[
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/dashboard/de-para", label: "De-Para", icon: FlipHorizontal2 },
].map((item) => (
  <li key={item.href}>
    <Link
      href={createLink(item.href)}
      className={`flex items-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-200 ${isCollapsed ? "justify-center p-4" : "p-4"} ${isActiveRoute(item.href) ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-l-2 border-gray-300 dark:border-gray-700" : ""}`}
      onClick={handleLinkClick}
    >
      <item.icon className="h-5 w-5" />
      {!isCollapsed && (
        <span className="ml-4 text-sm font-medium">{item.label}</span>
      )}
    </Link>
  </li>
))}
        </ul>
      </nav>

      {/* Usuário */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        <Link
          href={createLink("/dashboard/perfil")}
          className={`flex items-center rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
          onClick={handleLinkClick}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={session?.user?.image || ""}
              alt={session?.user?.name || "Usuário"}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm">
              {getInitials(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
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
