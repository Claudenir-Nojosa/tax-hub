"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState, useCallback } from "react";
import { ThemeToggle } from "../shared/themeToggle";
import { Button } from "../ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Recursos", href: "/#features" },
  { label: "Como Funciona", href: "/#how-it-works" },
  { label: "Depoimentos", href: "/#testimonials" },
  { label: "Preços", href: "/#pricing" },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  return (
    <motion.div
      initial={false}
      animate={{ height: isOpen ? "calc(100vh - 64px)" : 0, opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-16 left-0 right-0 md:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t border-gray-300 dark:border-gray-800 overflow-hidden z-40"
      aria-hidden={!isOpen}
    >
      <div className="container mx-auto px-4 py-6 flex flex-col gap-3">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={cn(
              "text-lg font-medium text-gray-900 dark:text-gray-100 py-3 px-4 rounded-lg transition-all duration-200",
              "hover:text-[#007cca] dark:hover:text-[#00cfec]",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-[#007cca] focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
            onClick={onClose}
          >
            {link.label}
          </Link>
        ))}

        <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-gray-300 dark:border-gray-800">
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onClose}
            >
              Entrar
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              className="w-full bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:opacity-90 transition-opacity"
              onClick={onClose}
            >
              Começar Grátis
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const DesktopNavLinks = () => {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex items-center gap-6">
      {NAV_LINKS.map((link, index) => (
        <motion.div
          key={link.label}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link
            href={link.href}
            className={cn(
              "relative text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white",
              "transition-colors duration-300 font-medium text-sm",
              "group py-2 px-1",
            )}
          >
            {link.label}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#00cfec] to-[#007cca] group-hover:w-full transition-all duration-300" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled &&
            "bg-white/98 dark:bg-gray-950/98 backdrop-blur-md border-b border-black/10 dark:border-white/10 shadow-sm",
        )}
      >
        <nav className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/"
                className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#007cca] focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg p-1"
                aria-label="Voltar para página inicial"
              >
                <Image
                  src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/logo.png?raw=true"
                  alt="tax-hub Logo"
                  width={40}
                  height={40}
                />
                <span className="text-lg font-bold bg-gradient-to-r from-[#007cca] to-[#14a0b3] bg-clip-text text-transparent">
                  tax-hub
                </span>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <DesktopNavLinks />

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
                >
                  Entrar
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:shadow-lg hover:shadow-blue-500/25 dark:hover:shadow-blue-500/50 transition-all duration-300 text-sm font-medium"
                >
                  Começar Grátis
                </Button>
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-3">
              <ThemeToggle />
              <button
                onClick={toggleMenu}
                className="p-2 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007cca] dark:focus:ring-offset-gray-900"
                aria-expanded={isOpen}
                aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      <MobileMenu isOpen={isOpen} onClose={closeMenu} />

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
};