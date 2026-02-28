/**
 * Auth.js v5 configuration
 *
 * Uses CredentialsProvider with bcrypt-verified passwords against the
 * `users` table. JWT sessions — no database sessions needed.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { isDbConfigured, getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// AUTH_SECRET is required by NextAuth v5 — set it in your .env.local file.
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is not set. Generate one with: openssl rand -base64 32");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!isDbConfigured()) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const db = getDb();
          const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);

          if (!user?.hashedPassword) return null;

          const valid = await bcrypt.compare(password, user.hashedPassword);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    jwt({ token, user }) {
      // Persist the user id into the JWT on first sign-in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      // Expose the user id to the client-side session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
