import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getLabAttempts } from "@/lib/data";

/**
 * GET /api/labs/attempts
 *
 * Returns lab completion statuses for the authenticated user.
 * Returns an empty map when not authenticated or DB is unavailable.
 *
 * Response shape:
 * {
 *   "attempts": {
 *     "python-data-parsing": { labSlug, status, lastAttemptAt },
 *     ...
 *   }
 * }
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const attempts = await getLabAttempts(userId);
    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Error loading lab attempts:", error);
    return NextResponse.json({ attempts: {} });
  }
}
