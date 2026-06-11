// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string | null;
      subscriptionStatus?: string;
      onboardingCompleto?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string | null;
    subscriptionStatus?: string;
    onboardingCompleto?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionStatus?: string;
    onboardingCompleto?: boolean;
  }
}