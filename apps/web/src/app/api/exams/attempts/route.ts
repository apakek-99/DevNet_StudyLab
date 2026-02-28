import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getExamAttempts } from "@/lib/data";

/**
 * GET /api/exams/attempts
 *
 * Returns past exam attempts for the authenticated user (newest first).
 * Returns an empty array when not authenticated or DB is unavailable.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const attempts = await getExamAttempts(userId);
    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Error loading exam attempts:", error);
    return NextResponse.json({ attempts: [] });
  }
}
