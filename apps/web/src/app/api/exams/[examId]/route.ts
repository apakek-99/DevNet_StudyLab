import { NextRequest, NextResponse } from "next/server";
import { getExam } from "@/lib/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const { examId } = await params;
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const exam = getExam(examId, {
      domain: domain ?? undefined,
      stripAnswers: true,
    });

    if (!exam) {
      return NextResponse.json(
        { error: `Exam "${examId}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error loading exam:", error);
    return NextResponse.json(
      { error: "Failed to load exam" },
      { status: 500 },
    );
  }
}
