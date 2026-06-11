"use client";

import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useParams } from "next/navigation";

export const Footer = () => {
  const { t } = useTranslation("footer");
  const params = useParams();
  const currentLang = (params?.lang as string) || "pt";
  const footerLinks = {
    product: [
      { label: t("links.product.features", "Recursos"), href: "#features" },
      { label: t("links.product.pricing", "Preços"), href: "#pricing" },
      { label: t("links.product.security", "Segurança"), href: "#security" },
    ],
    legal: [
      {
        label: t("links.legal.privacy", "Privacidade"),
        href: `/${currentLang}/privacy-policy`,
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        label: t("links.legal.terms", "Termos"),
        href: `/${currentLang}/terms-of-service`,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],
  };

  const socialLinks = [
    {
      Icon: Instagram,
      href: "https://www.instagram.com/tax-hub.app/",
      label: "Instagram",
      target: "_blank",
      rel: "noopener noreferrer",
    },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 md:py-16 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Coluna da logo e descrição - ocupa 2 colunas */}
          <div className="lg:col-span-2">
            <motion.a
              href="#"
              className="flex items-center gap-2 mb-4 group"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <Image
                  src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/tax-hub-Logo.png?raw=true"
                  alt={t("brandAlt", "tax-hub Logo")}
                  width={40}
                  height={40}
                  className="w-10 h-10"
                  loading="lazy"
                />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-[#00cfec] to-[#007cca] bg-clip-text text-transparent">
                {t("brand", "tax-hub")}
              </span>
            </motion.a>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm text-sm md:text-base leading-relaxed">
              {t(
                "description",
                "Seu assistente financeiro inteligente. Economize mais, invista melhor e alcance seus objetivos.",
              )}
            </p>
            <div className="flex gap-3 md:gap-4">
              {socialLinks.map(({ Icon, href, label, target, rel }, index) => (
                <motion.a
                  key={index}
                  href={href}
                  aria-label={label}
                  target={target}
                  rel={rel}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-[#007cca] dark:hover:text-[#00cfec] transition-colors group"
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Coluna Produto */}
          <div className="md:col-start-3">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white text-sm">
              {t("sections.product", "Produto")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      if (link.href === "#pricing") {
                        e.preventDefault();
                        const element = document.getElementById("pricing");
                        if (element) {
                          // Ajuste para navbar fixa
                          const yOffset = -80;
                          const y =
                            element.getBoundingClientRect().top +
                            window.pageYOffset +
                            yOffset;
                          window.scrollTo({ top: y, behavior: "smooth" });
                        }
                      }
                    }}
                    className="text-gray-600 dark:text-gray-400 hover:text-[#007cca] dark:hover:text-[#00cfec] transition-colors text-sm hover:pl-1 duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white text-sm">
              {t("sections.legal", "Legal")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.target}
                    rel={link.rel}
                    className="text-gray-600 dark:text-gray-400 hover:text-[#007cca] dark:hover:text-[#00cfec] transition-colors text-sm hover:pl-1 duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center md:text-left">
            {t(
              "copyright",
              "© {{year}} tax-hub. Todos os direitos reservados.",
              { year: currentYear },
            )}
          </p>
        </div>
      </div>
    </footer>
  );
};
