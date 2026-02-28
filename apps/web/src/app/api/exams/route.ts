import { NextRequest, NextResponse } from "next/server";
import { listExams } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const exams = listExams(domain ?? undefined);

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Error loading exams:", error);
    return NextResponse.json(
      { error: "Failed to load exams" },
      { status: 500 },
    );
  }
}
