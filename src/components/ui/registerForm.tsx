// components/ui/registerForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import Form from "next/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import registerAction from "@/app/(auth)/signup/registerAction";
import { Toaster, toast } from "sonner";
import { useActionState } from "react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Icons } from "./loadingSpinner";
import { useTranslation } from "react-i18next";
import { signIn } from "next-auth/react";
import { getFallback } from "@/lib/i18nFallback";

interface RegisterFormProps {
  lang?: string;
}

// Tipos para força da senha
type PasswordStrength = "weak" | "medium" | "strong" | "empty";

export default function RegisterForm({ lang }: RegisterFormProps) {
  const params = useParams();
  const { t } = useTranslation("register");
  const currentLang = lang || (params?.lang as string) || "pt";

  const getTranslation = (key: string) => {
    const translation = t(key);
    if (translation && translation !== key) {
      return translation;
    }

    switch (key) {
      // Labels e placeholders
      case "formulario.nome":
        return getFallback(currentLang, "Nome", "Name");
      case "formulario.placeholderNome":
        return getFallback(currentLang, "Fulano de Tal", "John Doe");

      case "formulario.email":
        return getFallback(currentLang, "Email", "Email");
      case "formulario.placeholderEmail":
        return getFallback(currentLang, "eu@exemplo.com", "you@example.com");

      case "formulario.senha":
        return getFallback(currentLang, "Senha", "Password");
      case "formulario.placeholderSenha":
        return getFallback(currentLang, "********", "********");
      case "formulario.dicaSenha":
        return getFallback(
          currentLang,
          "Mínimo 6 caracteres com pelo menos um número e um caractere especial",
          "Minimum 6 characters with at least one number and one special character",
        );
      case "formulario.forcaSenhaFraca":
        return getFallback(currentLang, "Fraca", "Weak");
      case "formulario.forcaSenhaMedia":
        return getFallback(currentLang, "Média", "Medium");
      case "formulario.forcaSenhaForte":
        return getFallback(currentLang, "Forte", "Strong");

      case "formulario.confirmarSenha":
        return getFallback(currentLang, "Confirmar Senha", "Confirm Password");
      case "formulario.placeholderConfirmarSenha":
        return getFallback(currentLang, "********", "********");
      case "formulario.senhasNaoConferem":
        return getFallback(
          currentLang,
          "As senhas não conferem",
          "Passwords do not match",
        );
      case "formulario.senhaFraca":
        return getFallback(
          currentLang,
          "Senha muito fraca",
          "Password is too weak",
        );

      // Botões
      case "botoes.registrar":
        return getFallback(currentLang, "Registrar", "Register");
      case "botoes.registrando":
        return getFallback(currentLang, "Registrando...", "Registering...");

      // Mensagens de sucesso/erro
      case "mensagens.sucesso":
        return getFallback(
          currentLang,
          "Registro realizado com sucesso! Redirecionando...",
          "Registration successful! Redirecting...",
        );
      case "mensagens.erroDuplicado":
        return getFallback(
          currentLang,
          "Este email já está cadastrado",
          "This email is already registered",
        );
      case "mensagens.erroGenerico":
        return getFallback(
          currentLang,
          "Ocorreu um erro ao registrar. Tente novamente.",
          "An error occurred during registration. Please try again.",
        );
      case "mensagens.registroConcluido":
        return getFallback(
          currentLang,
          "Registro concluído! Faça login para continuar.",
          "Registration completed! Please log in to continue.",
        );
      case "mensagens.erroLoginAuto":
        return getFallback(
          currentLang,
          "Erro no login automático",
          "Error in automatic login",
        );

      default:
        return key;
    }
  };

  // Criar objeto de traduções
  const translations = {
    formulario: {
      nome: getTranslation("formulario.nome"),
      placeholderNome: getTranslation("formulario.placeholderNome"),
      email: getTranslation("formulario.email"),
      placeholderEmail: getTranslation("formulario.placeholderEmail"),
      senha: getTranslation("formulario.senha"),
      placeholderSenha: getTranslation("formulario.placeholderSenha"),
      dicaSenha: getTranslation("formulario.dicaSenha"),
      forcaSenhaFraca: getTranslation("formulario.forcaSenhaFraca"),
      forcaSenhaMedia: getTranslation("formulario.forcaSenhaMedia"),
      forcaSenhaForte: getTranslation("formulario.forcaSenhaForte"),
      confirmarSenha: getTranslation("formulario.confirmarSenha"),
      placeholderConfirmarSenha: getTranslation(
        "formulario.placeholderConfirmarSenha",
      ),
      senhasNaoConferem: getTranslation("formulario.senhasNaoConferem"),
      senhaFraca: getTranslation("formulario.senhaFraca"),
    },
    botoes: {
      registrar: getTranslation("botoes.registrar"),
      registrando: getTranslation("botoes.registrando"),
    },
    mensagens: {
      sucesso: getTranslation("mensagens.sucesso"),
      erroDuplicado: getTranslation("mensagens.erroDuplicado"),
      erroGenerico: getTranslation("mensagens.erroGenerico"),
      registroConcluido: getTranslation("mensagens.registroConcluido"),
      erroLoginAuto: getTranslation("mensagens.erroLoginAuto"),
    },
  };

  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [hasShownToast, setHasShownToast] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength>("empty");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();

  // Função para calcular força da senha
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) return "empty";
  
  let score = 0;
  
  // Comprimento
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  
  // Números
  if (/\d/.test(password)) score += 1;
  
  // Caracteres especiais
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Letras maiúsculas e minúsculas
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  
  // Determinar força baseada no score
  if (score < 3) return "weak";
  if (score < 5) return "medium";
  return "strong";
};

  // Função para validar força da senha (para validação do formulário)
  const validatePassword = (
    password: string,
  ): { isValid: boolean; message: string } => {
    if (password.length < 6) {
      return {
        isValid: false,
        message: getFallback(
          currentLang,
          "A senha deve ter pelo menos 6 caracteres",
          "Password must be at least 6 characters",
        ),
      };
    }

    // Verificar se tem pelo menos um número
    if (!/\d/.test(password)) {
      return {
        isValid: false,
        message: getFallback(
          currentLang,
          "A senha deve conter pelo menos um número",
          "Password must contain at least one number",
        ),
      };
    }

    // Verificar se tem pelo menos um caractere especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return {
        isValid: false,
        message: getFallback(
          currentLang,
          "A senha deve conter pelo menos um caractere especial",
          "Password must contain at least one special character",
        ),
      };
    }

    return {
      isValid: true,
      message: "",
    };
  };

  // Função para validar confirmação de senha
  const validateConfirmPassword = (
    password: string,
    confirmPassword: string,
  ): string => {
    if (password !== confirmPassword) {
      return translations.formulario.senhasNaoConferem;
    }
    return "";
  };

  // Manipuladores de mudança
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData((prev) => ({ ...prev, password: newPassword }));

    // Calcular força da senha
const strength = calculatePasswordStrength(newPassword);
setPasswordStrength(strength);

    // Validar senha (para mostrar mensagens de erro)
    const validation = validatePassword(newPassword);
    setPasswordError(validation.message);

    // Validar confirmação também
    if (formData.confirmPassword) {
      setConfirmPasswordError(
        validateConfirmPassword(newPassword, formData.confirmPassword),
      );
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newConfirmPassword = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword: newConfirmPassword }));

    const error = validateConfirmPassword(
      formData.password,
      newConfirmPassword,
    );
    setConfirmPasswordError(error);
  };

  // Obter texto da força da senha
const getStrengthText = (): string => {
  switch (passwordStrength) {
    case "weak":
      return getFallback(currentLang, "Fraca", "Weak");
    case "medium":
      return getFallback(currentLang, "Média", "Medium");
    case "strong":
      return getFallback(currentLang, "Forte", "Strong");
    default:
      return "";
  }
};
// Obter porcentagem da barra (0-100)
const getStrengthPercentage = (): number => {
  switch (passwordStrength) {
    case "weak":
      return 33;
    case "medium":
      return 66;
    case "strong":
      return 100;
    default:
      return 0;
  }
};

// Obter cor da barra baseada na força
const getStrengthBarColor = (): string => {
  switch (passwordStrength) {
    case "weak":
      return "bg-red-500";
    case "medium":
      return "bg-orange-500";
    case "strong":
      return "bg-green-500";
    default:
      return "bg-gray-300 dark:bg-gray-700";
  }
};
  // Obter cor da força da senha
  const getStrengthColor = (): string => {
    switch (passwordStrength) {
      case "weak":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "strong":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  // Validar formulário antes de enviar
  const handleFormAction = (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message);
      return;
    }

    // Validar confirmação de senha
    if (password !== confirmPassword) {
      toast.error(translations.formulario.senhasNaoConferem);
      return;
    }

    // Remover confirmPassword do formData antes de enviar
    formData.delete("confirmPassword");
    formData.append("lang", currentLang);
    formAction(formData);
  };

  // 🆕 Função para login automático após registro
  const handleAutoLogin = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        console.error("Erro no login automático:", result.error);
        toast.error(translations.mensagens.registroConcluido);
        setTimeout(() => {
          router.push(
            `/${currentLang}/login?email=${encodeURIComponent(email)}`,
          );
        }, 2000);
      } else {
        setTimeout(() => {
          router.push(`/${currentLang}/login/onboarding`);
        }, 1500);
      }
    } catch (error) {
      console.error("Erro no login automático:", error);
      toast.error(translations.mensagens.registroConcluido);
      setTimeout(() => {
        router.push(`/${currentLang}/login?email=${encodeURIComponent(email)}`);
      }, 2000);
    }
  };

  useEffect(() => {
    if (state && !hasShownToast) {
      if (state.success === false) {
        toast.error(state.message);
        setHasShownToast(true);
      } else if (state.success === true) {
        toast.success(translations.mensagens.sucesso);
        setHasShownToast(true);

        if (state.email && state.password) {
          setTimeout(() => {
            handleAutoLogin(state.email, state.password);
          }, 1000);
        } else {
          setTimeout(() => {
            router.push(`/${state.lang || currentLang}/login`);
          }, 2000);
        }
      }
    }
  }, [state, hasShownToast, router, currentLang, translations.mensagens]);

  useEffect(() => {
    if (!isPending) {
      setHasShownToast(false);
    }
  }, [isPending]);

  return (
    <>
      <Form action={handleFormAction}>
        <input type="hidden" name="lang" value={currentLang} />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {translations.formulario.nome}
            </Label>
            <Input
              type="text"
              name="name"
              placeholder={translations.formulario.placeholderNome}
              className="w-full"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {translations.formulario.email}
            </Label>
            <Input
              type="email"
              name="email"
              placeholder={translations.formulario.placeholderEmail}
              className="w-full"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {translations.formulario.senha}
            </Label>
            <Input
              type="password"
              name="password"
              placeholder={translations.formulario.placeholderSenha}
              className="w-full"
              required
              disabled={isPending}
              minLength={6}
              onChange={handlePasswordChange}
              value={formData.password}
            />

            {/* Feedback visual da força da senha */}
         {formData.password && (
  <div className="mt-2 space-y-1">
    {/* Barra de força única */}
    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
        style={{ width: `${getStrengthPercentage()}%` }}
      />
    </div>
    
    {/* Texto da força */}
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {getFallback(currentLang, "Força da senha:", "Password strength:")}
      </span>
      <span className={`text-xs font-medium ${getStrengthBarColor().replace('bg-', 'text-')}`}>
        {getStrengthText()}
      </span>
    </div>
  </div>
)}

            {passwordError && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                {passwordError}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {translations.formulario.dicaSenha}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {translations.formulario.confirmarSenha}
            </Label>
            <Input
              type="password"
              name="confirmPassword"
              placeholder={translations.formulario.placeholderConfirmarSenha}
              className="w-full"
              required
              disabled={isPending}
              minLength={6}
              onChange={handleConfirmPasswordChange}
              value={formData.confirmPassword}
            />
            {confirmPasswordError && (
              <p className="text-xs text-red-500 dark:text-red-400">
                {confirmPasswordError}
              </p>
            )}
          </div>

          <Button
            className="w-full mt-4 bg-gradient-to-r from-[#00cfec] to-[#007cca] hover:from-[#00cfec]/90 hover:to-[#007cca]/90 text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={
              isPending ||
              passwordError !== "" ||
              confirmPasswordError !== "" ||
              passwordStrength === "weak"
            }
          >
            {isPending ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {translations.botoes.registrando}
              </>
            ) : (
              translations.botoes.registrar
            )}
          </Button>
        </div>
      </Form>
    </>
  );
}
