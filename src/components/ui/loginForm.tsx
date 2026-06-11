// components/ui/loginForm.tsx
"use client";

import loginAction from "@/app/(auth)/login/loginAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Form from "next/form";
import { useActionState } from "react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Icons } from "./loadingSpinner";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { getFallback } from "@/lib/i18nFallback";

interface LoginFormProps {
  lang?: string;
}

export default function LoginForm({ lang }: LoginFormProps) {
  const params = useParams();
  const { t } = useTranslation("auth");
  const currentLang = lang || (params?.lang as string) || "pt";
  
  // Função auxiliar para obter tradução com fallback
  const getTranslation = (key: string) => {
    // Primeiro tenta usar o i18n
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    // Fallback manual baseado nas chaves
    switch (key) {
      // Labels
      case "formulario.email":
        return getFallback(currentLang, "Email", "Email");
      case "formulario.senha":
        return getFallback(currentLang, "Senha", "Password");
      case "formulario.placeholderEmail":
        return getFallback(currentLang, "seu@email.com", "your@email.com");
      case "formulario.placeholderSenha":
        return getFallback(currentLang, "********", "********");
      
      // Links
      case "links.esqueciSenha":
        return getFallback(currentLang, "Esqueceu sua senha?", "Forgot your password?");
      
      // Botões
      case "botoes.entrar":
        return getFallback(currentLang, "Entrar", "Sign In");
      case "botoes.entrando":
        return getFallback(currentLang, "Entrando...", "Signing in...");
      
      // Mensagens de erro
      case "mensagens.erroLogin":
        return getFallback(currentLang, "Erro ao fazer login. Verifique suas credenciais.", "Error logging in. Please check your credentials.");

      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    form: {
      email: getTranslation("formulario.email"),
      senha: getTranslation("formulario.senha"),
      placeholderEmail: getTranslation("formulario.placeholderEmail"),
      placeholderSenha: getTranslation("formulario.placeholderSenha"),
    },
    links: {
      esqueciSenha: getTranslation("links.esqueciSenha"),
    },
    buttons: {
      entrar: getTranslation("botoes.entrar"),
      entrando: getTranslation("botoes.entrando"),
    },
    messages: {
      erroLogin: getTranslation("mensagens.erroLogin"),
    },
  };

  console.log("🔍 [LOGIN FORM] currentLang:", currentLang);

  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [hasShownToast, setHasShownToast] = useState(false);

  const handleFormAction = (formData: FormData) => {
    console.log("🔍 [LOGIN FORM] Enviando lang:", currentLang);
    formData.append("lang", currentLang);
    formAction(formData);
  };

  useEffect(() => {
    if (state) {
      console.log("🔍 [LOGIN FORM] State recebido:", state);
      
      // Mostrar toast apenas para erros
      if (state.success === false && !hasShownToast) {
        toast.error(translations.messages.erroLogin);
        setHasShownToast(true);
      }
      
      // Se foi bem sucedido, não fazer nada - o redirect server-side vai acontecer
      if (state.success === true) {
        console.log("✅ [LOGIN FORM] Login bem sucedido, aguardando redirect...");
        // Não mostrar toast de sucesso nem redirecionar aqui
        // O redirect server-side no loginAction já cuidará disso
      }
    }
  }, [state, hasShownToast, translations.messages.erroLogin]);

  useEffect(() => {
    if (!isPending) {
      setHasShownToast(false);
    }
  }, [isPending]);

  return (
    <Form action={handleFormAction}>
      <input type="hidden" name="lang" value={currentLang} />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {translations.form.email}
          </Label>
          <Input
            type="email"
            name="email"
            placeholder={translations.form.placeholderEmail}
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {translations.form.senha}
            </Label>
            <Link
              href={`/${currentLang}/forgot-password`}
              className="text-xs text-[#007cca] dark:text-[#00cfec] hover:underline"
            >
              {translations.links.esqueciSenha}
            </Link>
          </div>
          <Input
            type="password"
            name="password"
            placeholder={translations.form.placeholderSenha}
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <Button
          className="w-full mt-2 bg-gradient-to-r from-[#00cfec] to-[#007cca] hover:from-[#00cfec]/90 hover:to-[#007cca]/90 text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              {translations.buttons.entrando}
            </>
          ) : (
            translations.buttons.entrar
          )}
        </Button>
      </div>
    </Form>
  );
}