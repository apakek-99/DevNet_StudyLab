/**
 * Server-side auth helpers for API routes.
 *
 * Provides `getCurrentUserId()` which safely returns the authenticated
 * user's ID from the JWT session, or null when auth is bypassed
 * (SKIP_AUTH mode) or unavailable.
 */

import { auth } from "./auth";

/**
 * Returns the current user's ID from the JWT session.
 * Returns null when auth is bypassed or the user is not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  // When auth is skipped (E2E tests, no DB), there's no session
  if (process.env.SKIP_AUTH === "true" || !process.env.DATABASE_URL) {
    return null;
  }

  try {
    const session = await auth();
    return (session?.user?.id as string) ?? null;
  } catch {
    return null;
  }
}
