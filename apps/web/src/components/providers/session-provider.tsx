"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Wraps children with the NextAuth SessionProvider so `useSession()`
 * works in client components. This is a thin wrapper to allow the
 * root layout (a server component) to include a client provider.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
