import { NextRequest, NextResponse } from "next/server";
import { gradeExam, saveExamAttempt } from "@/lib/data";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const { examId } = await params;

    // Extract optional domain filter from query params
    const domainFilter = request.nextUrl.searchParams.get("domain") ?? undefined;

    // Parse and validate request body
    let body: { answers: Record<string, string | string[]>; timeTaken?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { answers, timeTaken } = body;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: '"answers" object is required' },
        { status: 400 },
      );
    }

    // Default timeTaken to 0 if not provided
    const resolvedTimeTaken = typeof timeTaken === "number" ? timeTaken : 0;

    const result = gradeExam(examId, answers, resolvedTimeTaken, domainFilter);

    if (!result) {
      return NextResponse.json(
        { error: `Exam "${examId}" not found` },
        { status: 404 },
      );
    }

    // Fire-and-forget: persist the attempt to DB if user is authenticated
    const userId = await getCurrentUserId();
    if (userId && result.questionResults) {
      saveExamAttempt(userId, {
        score: result.score,
        totalQuestions: result.totalQuestions,
        domainFilter,
        timeTakenSeconds: resolvedTimeTaken,
        answers: result.questionResults.map((q) => ({
          questionId: q.questionId,
          userAnswer: q.userAnswer,
          isCorrect: q.correct,
        })),
      }).catch((err) =>
        console.warn("Background exam attempt save failed:", err),
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error grading exam:", error);
    return NextResponse.json(
      { error: "Failed to grade exam" },
      { status: 500 },
    );
  }
}
