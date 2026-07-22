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
import Link from "next/link";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    if (state) {
      if (state.success === false && !hasShownToast) {
        toast.error("Erro ao fazer login. Verifique suas credenciais.");
        setHasShownToast(true);
      }
    }
  }, [state, hasShownToast]);

  useEffect(() => {
    if (!isPending) {
      setHasShownToast(false);
    }
  }, [isPending]);

  return (
    <Form action={formAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            type="email"
            name="email"
            placeholder="seu@email.com"
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">
              Senha
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[hsl(var(--primary))] dark:text-[hsl(var(--chart-4))] hover:underline"
            >
              Esqueceu sua senha?
            </Link>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="********"
            className="w-full"
            required
            disabled={isPending}
          />
        </div>

        <Button
          className="w-full mt-2 bg-gradient-to-r from-[hsl(var(--chart-4))] to-[hsl(var(--primary))] hover:from-[hsl(var(--chart-4))]/90 hover:to-[hsl(var(--primary))]/90 text-white font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </div>
    </Form>
  );
}