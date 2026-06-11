"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader, Menu, Plane } from "lucide-react"; // Ícone do menu hambúrguer
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"; // Para o menu mobile
import {} from "@/components/ui/navigation-menu";
import { NavigationMenuDemo } from "./navigationMenu";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 backdrop-blur-md border-b z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo no lado esquerdo */}
          <Link href="/" className="text-xl font-bold">
            <Loader className="text-fuchsia-400 animate-pulse" />
          </Link>
          {/* Links no centro (visível apenas em telas maiores) */}
          <div className="hidden md:flex items-center gap-6">
            <NavigationMenuDemo />
            <Button variant="link" className="text-washed-purple-700">
              <Link href="/docs">Docs</Link>
            </Button>
            <Button variant="link" className="text-washed-purple-700">
              Pricing
            </Button>
          </div>

          {/* Links no lado direito (visível apenas em telas maiores) */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="link">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>

          {/* Menu de hambúrguer para telas menores */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/products" className="text-sm font-medium">
                  Products
                </Link>
                <Link href="/features" className="text-sm font-medium">
                  Features
                </Link>
                <Link href="/docs" className="text-sm font-medium">
                  Docs
                </Link>
                <Button
                  variant="ghost"
                  className="text-sm font-medium justify-start"
                >
                  Pricing
                </Button>
                <div className="border-t pt-4">
                  <Link
                    href="/signin"
                    className="text-sm font-medium block mb-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 block text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
