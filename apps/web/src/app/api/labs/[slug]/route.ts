import { NextRequest, NextResponse } from "next/server";
import { getLab } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const lab = await getLab(slug);

    if (!lab) {
      return NextResponse.json(
        { error: `Lab "${slug}" not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(lab);
  } catch (error) {
    console.error("Error loading lab:", error);
    return NextResponse.json(
      { error: "Failed to load lab" },
      { status: 500 },
    );
  }
}
