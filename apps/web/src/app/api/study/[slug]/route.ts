import { NextRequest, NextResponse } from "next/server";
import { getStudyGuide } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const guide = getStudyGuide(slug);

    if (!guide) {
      return NextResponse.json(
        { error: `Study guide "${slug}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(guide);
  } catch (error) {
    console.error("Error loading study guide:", error);
    return NextResponse.json(
      { error: "Failed to load study guide" },
      { status: 500 },
    );
  }
}
