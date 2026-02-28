import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getStudyProgress, saveStudyObjective } from "@/lib/data";

/**
 * GET /api/study/progress
 *
 * Returns an array of completed objective codes (e.g. ["1.1", "2.3"])
 * for the authenticated user. Returns empty array when not authenticated.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const completed = await getStudyProgress(userId);
    return NextResponse.json({ completed });
  } catch (error) {
    console.error("Error loading study progress:", error);
    return NextResponse.json({ completed: [] });
  }
}

/**
 * POST /api/study/progress
 *
 * Toggle an objective's completion status.
 * Body: { objectiveCode: "1.1", completed: true }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      // No user — silently succeed (client-side state still works)
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const { objectiveCode, completed } = body as {
      objectiveCode: string;
      completed: boolean;
    };

    if (!objectiveCode || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "objectiveCode (string) and completed (boolean) are required" },
        { status: 400 },
      );
    }

    await saveStudyObjective(userId, objectiveCode, completed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving study progress:", error);
    return NextResponse.json(
      { error: "Failed to save study progress" },
      { status: 500 },
    );
  }
}
