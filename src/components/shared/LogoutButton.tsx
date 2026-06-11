"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Icons } from "../ui/loadingSpinner";

interface LogoutButtonSimpleProps {
  isCollapsed?: boolean;
}

export default function LogoutButtonSimple({ isCollapsed = false }: LogoutButtonSimpleProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: true, callbackUrl: "/login" });
    } catch (error) {
      console.error("Erro no logout:", error);
      toast.error("Erro ao fazer logout");
      setTimeout(() => { window.location.href = "/login"; }, 300);
    }
  };

  return (
    <Button
      variant="ghost"
      className={`
        w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
        text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white 
        transition-all duration-200
        ${isCollapsed ? "justify-center p-3" : "justify-start p-3"}
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <Icons.spinner className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}

      {!isCollapsed && (
        <span className="ml-3 text-sm">
          {isLoading ? "Saindo..." : "Sair"}
        </span>
      )}
    </Button>
  );
}