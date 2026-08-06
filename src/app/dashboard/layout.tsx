"use client";

import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";
import { ThemeToggle } from "@/components/shared/themeToggle";
import NotificationBell from "@/components/shared/NotificationBell";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/components/shared/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 
            transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
            lg:translate-x-0 transition-transform duration-300 ease-in-out
          `}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              TAX Hub
            </h1>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>

          <div className="hidden lg:flex items-center gap-1 fixed top-4 right-6 z-30">
            <NotificationBell />
            <ThemeToggle />
          </div>

          <div className="flex-1 overflow-y-auto bg-background">
            <main className="min-h-full p-4 lg:p-6">
              <div className="max-w-7xl mx-auto w-full">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}