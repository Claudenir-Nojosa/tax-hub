// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { findUserByCredentials } from "@/lib/user";
import { AuthError } from "next-auth";
import db from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // @ts-ignore - Ignorar erro de tipos temporariamente
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {


        if (!credentials?.email || !credentials?.password) {
       
          return null;
        }

        try {
        

          const user = await findUserByCredentials(
            credentials.email as string,
            credentials.password as string,
          );

        

          if (!user) {
           
            return null;
          }

          

          // ✅ Retornar objeto compatível com NextAuth
          return {
            id: user.id,
            email: user.email || "",
            name: user.name || "",
          };
        } catch (error) {
          console.error("❌ [AUTHORIZE] Erro no catch:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
     

      if (account?.provider === "google") {
        const email = profile?.email || user.email;

        if (!email) {
          throw new AuthError("O e-mail é obrigatório para login com Google.");
        }

        try {
          const existingUser = await db.user.findUnique({
            where: { email },
          });

         

          if (existingUser) {
            user.id = existingUser.id;

            // Usar casting para evitar erro de tipo
            (user as any).onboardingCompleto =
              existingUser.onboardingCompleto || false;

            const existingAccount = await db.account.findFirst({
              where: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });

            if (!existingAccount) {
              console.log("Vinculando conta Google ao usuário existente");
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              });
            }
          }

          return true;
        } catch (error) {
          console.error("Erro no signIn callback:", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.onboardingCompleto = (user as any).onboardingCompleto || false;
      }
      return token;
    },

    async session({ session, token }) {
      const userId = token.sub || token.id;

      if (session.user && userId) {
        session.user.id = userId as string;
        (session.user as any).onboardingCompleto =
          token.onboardingCompleto || false;

        try {
          const user = await db.user.findUnique({
            where: { id: userId as string },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              subscriptionStatus: true,
              onboardingCompleto: true,
            },
          });

          if (user) {
            session.user.id = user.id;
            session.user.name = user.name;
            session.user.email = user.email;
            session.user.image = user.image;
            (session.user as any).subscriptionStatus = user.subscriptionStatus;
            (session.user as any).onboardingCompleto = user.onboardingCompleto;
          }
        } catch (error) {
          console.error("Erro ao buscar usuário na session:", error);
        }
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
    

      // Para login com credentials, o redirect é feito pelo loginAction
      // Então devemos retornar a URL original ou uma padrão
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }

      // Se já é uma URL completa com locale, manter
      if (url.includes("/") || url.includes("/en/")) {
        return url;
      }

      // URLs relativas, adicionar locale padrão
      if (url.startsWith("/")) {
        return `${baseUrl}/pt${url}`;
      }

      // Fallback para dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login", // ✅ COM LOCALE
    error: "/login", // ✅ COM LOCALE
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
