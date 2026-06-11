"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ThemeToggle } from "../shared/themeToggle";
import { Button } from "../ui/button";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { LanguageSwitcher } from "../ui/language-switcher";
import { useTranslation } from "react-i18next";
import { getFallback } from "@/lib/i18nFallback";

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const { t } = useTranslation("navbar");
  const params = useParams();
  const currentLang = (params?.lang as string) || "pt";

  // Função para obter tradução com fallback
  const getTranslation = (key: string) => {
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    switch (key) {
      case "brand":
        return getFallback(currentLang, "tax-hub", "tax-hub");
      case "links.features":
        return getFallback(currentLang, "Recursos", "Features");
      case "links.howItWorks":
        return getFallback(currentLang, "Como Funciona", "How it Works");
      case "links.testimonials":
        return getFallback(currentLang, "Depoimentos", "Testimonials");
      case "links.pricing":
        return getFallback(currentLang, "Preços", "Pricing");
      case "buttons.login":
        return getFallback(currentLang, "Entrar", "Login");
      case "buttons.startFree":
        return getFallback(currentLang, "Começar Grátis", "Start Free");
      case "aria.goHome":
        return getFallback(
          currentLang,
          "Voltar para página inicial",
          "Go back to home page",
        );
      case "aria.navigateTo":
        return getFallback(currentLang, "Navegar para", "Navigate to");
      case "aria.openMenu":
        return getFallback(currentLang, "Abrir menu", "Open menu");
      case "aria.closeMenu":
        return getFallback(currentLang, "Fechar menu", "Close menu");
      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    brand: getTranslation("brand"),
    links: {
      features: getTranslation("links.features"),
      howItWorks: getTranslation("links.howItWorks"),
      testimonials: getTranslation("links.testimonials"),
      pricing: getTranslation("links.pricing"),
    },
    buttons: {
      login: getTranslation("buttons.login"),
      startFree: getTranslation("buttons.startFree"),
    },
    aria: {
      goHome: getTranslation("aria.goHome"),
      navigateTo: getTranslation("aria.navigateTo"),
      openMenu: getTranslation("aria.openMenu"),
      closeMenu: getTranslation("aria.closeMenu"),
    },
  };

  const NAV_LINKS: NavLink[] = [
    { label: translations.links.features, href: `/${currentLang}/#features` },
    {
      label: translations.links.howItWorks,
      href: `/${currentLang}/#how-it-works`,
    },
    {
      label: translations.links.testimonials,
      href: `/${currentLang}/#testimonials`,
    },
    { label: translations.links.pricing, href: `/${currentLang}/#pricing` },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <motion.div
      initial={false}
      animate={{
        height: isOpen ? "calc(100vh - 64px)" : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-16 left-0 right-0 md:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t border-gray-300 dark:border-gray-800 overflow-hidden z-40"
      style={{ backdropFilter: "blur(10px)" }}
      aria-hidden={!isOpen}
    >
      <div className="container mx-auto px-4 py-6 flex flex-col gap-3">
        {NAV_LINKS.map((link) => (
          <Link
            key={`mobile-${link.label}`}
            href={link.href}
            className={cn(
              "text-lg font-medium text-gray-900 dark:text-gray-100 py-3 px-4 rounded-lg transition-all duration-200",
              "hover:text-[#007cca] dark:hover:text-[#00cfec]",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-[#007cca] focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
            onClick={handleLinkClick}
            aria-label={`${translations.aria.navigateTo} ${link.label}`}
          >
            {link.label}
          </Link>
        ))}

        {/* Adicionando LanguageSwitcher na versão mobile */}
        <div className="py-3 px-4">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-gray-300 dark:border-gray-800">
          <Link href={`/${currentLang}/login`}>
            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={handleLinkClick}
            >
              {translations.buttons.login}
            </Button>
          </Link>
          <Link href={`/${currentLang}/signup`}>
            <Button
              className="w-full bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:opacity-90 transition-opacity"
              onClick={handleLinkClick}
            >
              {translations.buttons.startFree}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const DesktopNavLinks = () => {
  const { t } = useTranslation("navbar");
  const params = useParams();
  const currentLang = (params?.lang as string) || "pt";

  // Função para obter tradução com fallback
  const getTranslation = (key: string) => {
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    switch (key) {
      case "links.features":
        return getFallback(currentLang, "Recursos", "Features");
      case "links.howItWorks":
        return getFallback(currentLang, "Como Funciona", "How it Works");
      case "links.testimonials":
        return getFallback(currentLang, "Depoimentos", "Testimonials");
      case "links.pricing":
        return getFallback(currentLang, "Preços", "Pricing");
      case "aria.navigateTo":
        return getFallback(currentLang, "Navegar para", "Navigate to");
      default:
        return key;
    }
  };

  const NAV_LINKS: NavLink[] = [
    {
      label: getTranslation("links.features"),
      href: `/${currentLang}/#features`,
    },
    {
      label: getTranslation("links.howItWorks"),
      href: `/${currentLang}/#how-it-works`,
    },
    {
      label: getTranslation("links.testimonials"),
      href: `/${currentLang}/#testimonials`,
    },
    {
      label: getTranslation("links.pricing"),
      href: `/${currentLang}/#pricing`,
    },
  ];

  const pathname = usePathname();

  return (
    <div className="hidden md:flex items-center gap-6">
      {NAV_LINKS.map((link, index) => (
        <motion.div
          key={`desktop-${link.label}`}
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
            aria-label={`${getTranslation("aria.navigateTo")} ${link.label}`}
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
  const { t } = useTranslation("navbar");
  const params = useParams();
  const currentLang = (params?.lang as string) || "pt";
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  // Função para obter tradução com fallback
  const getTranslation = (key: string) => {
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    switch (key) {
      case "brand":
        return getFallback(currentLang, "tax-hub", "tax-hub");
      case "buttons.login":
        return getFallback(currentLang, "Entrar", "Login");
      case "buttons.startFree":
        return getFallback(currentLang, "Começar Grátis", "Start Free");
      case "aria.goHome":
        return getFallback(
          currentLang,
          "Voltar para página inicial",
          "Go back to home page",
        );
      case "aria.openMenu":
        return getFallback(currentLang, "Abrir menu", "Open menu");
      case "aria.closeMenu":
        return getFallback(currentLang, "Fechar menu", "Close menu");
      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    brand: getTranslation("brand"),
    buttons: {
      login: getTranslation("buttons.login"),
      startFree: getTranslation("buttons.startFree"),
    },
    aria: {
      goHome: getTranslation("aria.goHome"),
      openMenu: getTranslation("aria.openMenu"),
      closeMenu: getTranslation("aria.closeMenu"),
    },
  };

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const navbarStyles = {
    background: isScrolled
      ? "rgba(255, 255, 255, 0.98) dark:rgba(10, 10, 10, 0.98)"
      : "transparent",
    backdropFilter: isScrolled ? "blur(10px)" : "none",
    borderBottom: isScrolled
      ? "1px solid rgba(0, 0, 0, 0.1) dark:1px solid rgba(255, 255, 255, 0.1)"
      : "none",
    boxShadow: isScrolled
      ? "0 4px 20px rgba(0, 0, 0, 0.05) dark:0 4px 20px rgba(0, 0, 0, 0.3)"
      : "none",
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={navbarStyles}
      >
        <nav className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2"
            >
              <Link
                href={`/${currentLang}`}
                className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#007cca] focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg p-1"
                aria-label={translations.aria.goHome}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image
                    src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/tax-hub-Logo.png?raw=true"
                    alt="tax-hub Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-[#007cca] to-[#14a0b3] bg-clip-text text-transparent">
                  {translations.brand}
                </span>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <DesktopNavLinks />

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link href={`/${currentLang}/login`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
                >
                  {translations.buttons.login}
                </Button>
              </Link>
              <Link href={`/${currentLang}/signup`}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#00cfec] to-[#007cca] text-white hover:shadow-lg hover:shadow-blue-500/25 dark:hover:shadow-blue-500/50 transition-all duration-300 text-sm font-medium"
                >
                  {translations.buttons.startFree}
                </Button>
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={toggleMenu}
                className="p-2 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007cca] dark:focus:ring-offset-gray-900"
                aria-expanded={isOpen}
                aria-label={
                  isOpen
                    ? translations.aria.closeMenu
                    : translations.aria.openMenu
                }
              >
                {isOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isOpen} onClose={closeMenu} />

      {/* Backdrop */}
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
