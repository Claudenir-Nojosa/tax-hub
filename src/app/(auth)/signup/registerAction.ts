// app/[locale]/signup/actions.ts (ou onde está seu registerAction)
"use server";

import db from "@/lib/db";
import { hashSync } from "bcrypt-ts";
import { redirect } from "next/navigation";

interface ErrorMessages {
  [key: string]: {
    success: string;
    error: {
      required: string;
      email: string;
      password: string;
      passwordStrength: string;
      confirmPassword: string;
      duplicate: string;
      generic: string;
    };
  };
}

const messages: ErrorMessages = {
  pt: {
    success: "Registro realizado com sucesso! Redirecionando...",
    error: {
      required: "Por favor, preencha todos os campos",
      email: "Por favor, insira um email válido",
      password: "A senha deve ter pelo menos 6 caracteres",
      passwordStrength:
        "A senha deve conter pelo menos um número e um caractere especial",
      confirmPassword: "As senhas não conferem",
      duplicate: "Este email já está cadastrado",
      generic: "Ocorreu um erro ao registrar. Tente novamente.",
    },
  },
  en: {
    success: "Registration successful! Redirecting...",
    error: {
      required: "Please fill in all fields",
      email: "Please enter a valid email",
      password: "Password must be at least 6 characters",
      passwordStrength:
        "Password must contain at least one number and one special character",
      confirmPassword: "Passwords do not match",
      duplicate: "This email is already registered",
      generic: "An error occurred during registration. Please try again.",
    },
  },
};

// Função para validar força da senha no servidor
function validatePasswordStrength(password: string): boolean {
  // Mínimo 6 caracteres
  if (password.length < 6) return false;

  // Pelo menos um número
  if (!/\d/.test(password)) return false;

  // Pelo menos um caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;

  return true;
}

export default async function registerAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _prevState: any,
  formData: FormData,
) {
  const entries = Array.from(formData.entries());
  const data = Object.fromEntries(entries) as {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    lang?: string;
  };

  const lang = data.lang || "pt";
  const t = messages[lang as keyof typeof messages] || messages.pt;

  try {
    // Validação básica
    if (!data.email || !data.name || !data.password) {
      return {
        message: t.error.required,
        success: false,
        lang: lang,
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        message: t.error.email,
        success: false,
        lang: lang,
      };
    }

    // Validar força da senha
    if (!validatePasswordStrength(data.password)) {
      return {
        message: t.error.passwordStrength,
        success: false,
        lang: lang,
      };
    }

    // Validar confirmação de senha (se enviada)
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      return {
        message: t.error.confirmPassword,
        success: false,
        lang: lang,
      };
    }

    // Verificar se usuário já existe
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return {
        message: t.error.duplicate,
        success: false,
        lang: lang,
      };
    }

    // 🆕 CRIAÇÃO DO USUÁRIO COM ONBOARDING INCOMPLETO
    const newUser = await db.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashSync(data.password),
        subscriptionStatus: "free",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log("------ Server Action - Registrar Usuário ------");
    console.log({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      lang: lang,
    });

    return {
      message: t.success,
      success: true,
      lang: lang,
      userId: newUser.id,
      email: newUser.email,
      password: data.password, // Para login automático
    };
  } catch (error) {
    console.error("Error in registerAction:", error);

    return {
      message: t.error.generic,
      success: false,
      lang: lang,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
