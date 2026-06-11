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
    };
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string | null;
    subscriptionStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionStatus?: string;
  }
}