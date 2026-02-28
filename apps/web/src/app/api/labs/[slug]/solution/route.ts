import { NextRequest, NextResponse } from "next/server";
import { getLabSolution } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const solution = getLabSolution(slug);

    if (!solution) {
      return NextResponse.json(
        { error: `Lab "${slug}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(solution);
  } catch (error) {
    console.error("Error loading lab solution:", error);
    return NextResponse.json(
      { error: "Failed to load lab solution" },
      { status: 500 },
    );
  }
}
