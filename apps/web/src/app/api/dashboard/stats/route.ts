import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getDashboardStats } from "@/lib/data/dashboard";

/**
 * GET /api/dashboard/stats
 *
 * Returns aggregated dashboard stats for the authenticated user.
 * Returns null when not authenticated or DB is unavailable — the
 * dashboard page uses hardcoded defaults as fallback.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const stats = await getDashboardStats(userId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
    return NextResponse.json({ stats: null });
  }
}
