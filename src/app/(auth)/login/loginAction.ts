// app/[lang]/login/loginAction.ts - VERSÃO SIMPLIFICADA
"use server";

import { redirect } from "next/navigation";
import { signIn } from "../../../../auth";

export default async function loginAction(_prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const lang = (formData.get("lang") as string) || "pt";

  console.log("🔍 [LOGIN ACTION] Tentando login para:", email);

  const errorMessages = {
    pt: {
      credentials: "Dados de login incorretos",
      generic: "Ops, algum erro aconteceu!",
    },
    en: {
      credentials: "Incorrect login credentials",
      generic: "Oops, something went wrong!",
    },
  };

  const t = errorMessages[lang as keyof typeof errorMessages] || errorMessages.pt;

  try {
    // Tentar fazer login diretamente com redirect: true
    // Isso fará com que o NextAuth cuide de todo o fluxo
    await signIn("credentials", {
      email,
      password,
      redirect: true, // Mudado para true
      callbackUrl: `/${lang}/dashboard`, // URL de callback
    });

    // Se chegou aqui, algo deu errado
    return {
      success: false,
      message: t.generic,
      lang: lang,
    };
  } catch (error: any) {
    console.error("❌ [LOGIN ACTION] Erro:", error);
    
    // Se for um erro de redirect do Next.js, lançar novamente
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      console.log("✅ [LOGIN ACTION] Redirect do Next.js");
      throw error;
    }

    // Se for um erro de autenticação
    if (error?.type === "CredentialsSignin" || error?.message?.includes("credentials")) {
      return {
        success: false,
        message: t.credentials,
        lang: lang,
      };
    }

    return {
      success: false,
      message: t.generic,
      lang: lang,
    };
  }
}