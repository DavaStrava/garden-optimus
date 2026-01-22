import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { isDevAuthEnabled, isValidDevEmail } from "./auth-utils";
import { isRegistrationOpen } from "./user-limit";

const isDev = isDevAuthEnabled();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: isDev ? "jwt" : "database",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // Development-only credentials provider
    ...(isDev
      ? [
          Credentials({
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;

              const email = String(credentials.email);

              // Only allow dev domain emails
              if (!isValidDevEmail(email)) {
                console.warn("[DEV AUTH] Rejected email outside dev domain:", email);
                return null;
              }

              // Check if registration is open
              const canRegister = await isRegistrationOpen(email);
              if (!canRegister) {
                console.warn("[DEV AUTH] Registration closed, user limit reached");
                return null;
              }

              // Find or create dev user
              let user = await prisma.user.findUnique({
                where: { email },
              });

              if (!user) {
                console.log("[DEV AUTH] Creating dev user:", email);
                user = await prisma.user.create({
                  data: {
                    email,
                    name: "Dev User",
                  },
                });
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Skip check for credentials provider (already checked in authorize)
      if (account?.provider === "credentials") {
        return true;
      }

      // Check if registration is open for OAuth users
      if (user.email) {
        const canRegister = await isRegistrationOpen(user.email);
        if (!canRegister) {
          // Redirect to registration closed page
          return "/registration-closed";
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, user, token }) {
      if (session.user) {
        // JWT mode (dev) uses token, database mode uses user
        const userId = user?.id ?? token?.id;
        if (typeof userId === "string") {
          session.user.id = userId;
        }
      }
      return session;
    },
  },
});
