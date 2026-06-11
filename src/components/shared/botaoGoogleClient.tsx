"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "../ui/button";
import { useState } from "react";
import { Icons } from "../ui/loadingSpinner";

export default function BotaoGoogleClient() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: `/dashboard`,
        redirect: true,
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <Button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        variant="outline"
        className="flex items-center justify-center gap-3 w-full px-4 py-3 border rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 shadow-sm hover:shadow-md"
      >
        {isLoading ? (
          <>
            <Icons.spinner className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Conectando...</span>
          </>
        ) : (
          <>
            <div className="relative h-5 w-5">
              <Image
                src="/google.svg"
                alt="Ícone do Google"
                height={20}
                width={20}
                className="object-contain"
              />
            </div>
            <span className="text-sm font-medium">Continuar com Google</span>
          </>
        )}
      </Button>
    </div>
  );
}