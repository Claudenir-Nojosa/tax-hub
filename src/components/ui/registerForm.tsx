// components/ui/registerForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import Form from "next/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import registerAction from "@/app/(auth)/signup/registerAction";
import { toast } from "sonner";
import { useActionState } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./loadingSpinner";
import { signIn } from "next-auth/react";

type PasswordStrength = "weak" | "medium" | "strong" | "empty";

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [hasShownToast, setHasShownToast] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>("empty");
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const router = useRouter();

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (password.length === 0) return "empty";

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;

    if (score < 3) return "weak";
    if (score < 5) return "medium";
    return "strong";
  };

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 6)
      return { isValid: false, message: "A senha deve ter pelo menos 6 caracteres" };
    if (!/\d/.test(password))
      return { isValid: false, message: "A senha deve conter pelo menos um número" };
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      return { isValid: false, message: "A senha deve conter pelo menos um caractere especial" };
    return { isValid: true, message: "" };
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    return password !== confirmPassword ? "As senhas não conferem" : "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData((prev) => ({ ...prev, password: newPassword }));
    setPasswordStrength(calculatePasswordStrength(newPassword));
    setPasswordError(validatePassword(newPassword).message);
    if (formData.confirmPassword) {
      setConfirmPasswordError(validateConfirmPassword(newPassword, formData.confirmPassword));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword: newConfirmPassword }));
    setConfirmPasswordError(validateConfirmPassword(formData.password, newConfirmPassword));
  };

  const getStrengthText = (): string => {
    switch (passwordStrength) {
      case "weak": return "Fraca";
      case "medium": return "Média";
      case "strong": return "Forte";
      default: return "";
    }
  };

  const getStrengthPercentage = (): number => {
    switch (passwordStrength) {
      case "weak": return 33;
      case "medium": return 66;
      case "strong": return 100;
      default: return 0;
    }
  };

  const getStrengthBarColor = (): string => {
    switch (passwordStrength) {
      case "weak": return "bg-red-500";
      case "medium": return "bg-orange-500";
      case "strong": return "bg-green-500";
      default: return "bg-gray-300 dark:bg-gray-700";
    }
  };

  const handleFormAction = (formData: FormData) => {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    formData.delete("confirmPassword");
    formAction(formData);
  };

  const handleAutoLogin = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        toast.error("Registro concluído! Faça login para continuar.");
        setTimeout(() => router.push(`/login?email=${encodeURIComponent(email)}`), 2000);
      } else {
        setTimeout(() => router.push("/login/onboarding"), 1500);
      }
    } catch (error) {
      toast.error("Registro concluído! Faça login para continuar.");
      setTimeout(() => router.push(`/login?email=${encodeURIComponent(email)}`), 2000);
    }
  };

  useEffect(() => {
    if (state && !hasShownToast) {
      if (state.success === false) {
        toast.error(state.message);
        setHasShownToast(true);
      } else if (state.success === true) {
        toast.success("Registro realizado com sucesso! Redirecionando...");
        setHasShownToast(true);

        if (state.email && state.password) {
          setTimeout(() => handleAutoLogin(state.email, state.password), 1000);
        } else {
          setTimeout(() => router.push("/login"), 2000);
        }
      }
    }
  }, [state, hasShownToast]);

  useEffect(() => {
    if (!isPending) setHasShownToast(false);
  }, [isPending]);

  return (
    <Form action={handleFormAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</Label>
          <Input
            type="text"
            name="name"
            placeholder="Fulano de Tal"
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
          <Input
            type="email"
            name="email"
            placeholder="eu@exemplo.com"
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</Label>
          <Input
            type="password"
            name="password"
            placeholder="********"
            className="w-full"
            required
            disabled={isPending}
            minLength={6}
            onChange={handlePasswordChange}
            value={formData.password}
          />

          {formData.password && (
            <div className="mt-2 space-y-1">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getStrengthBarColor()}`}
                  style={{ width: `${getStrengthPercentage()}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">Força da senha:</span>
                <span className={`text-xs font-medium ${getStrengthBarColor().replace("bg-", "text-")}`}>
                  {getStrengthText()}
                </span>
              </div>
            </div>
          )}

          {passwordError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{passwordError}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mínimo 6 caracteres com pelo menos um número e um caractere especial
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirmar Senha
          </Label>
          <Input
            type="password"
            name="confirmPassword"
            placeholder="********"
            className="w-full"
            required
            disabled={isPending}
            minLength={6}
            onChange={handleConfirmPasswordChange}
            value={formData.confirmPassword}
          />
          {confirmPasswordError && (
            <p className="text-xs text-red-500 dark:text-red-400">{confirmPasswordError}</p>
          )}
        </div>

        <Button
          className="w-full mt-4 bg-gradient-to-r from-[#00cfec] to-[#007cca] hover:from-[#00cfec]/90 hover:to-[#007cca]/90 text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isPending || passwordError !== "" || confirmPasswordError !== "" || passwordStrength === "weak"}
        >
          {isPending ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            "Registrar"
          )}
        </Button>
      </div>
    </Form>
  );
}