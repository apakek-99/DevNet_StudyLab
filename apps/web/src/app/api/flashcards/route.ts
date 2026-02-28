import { NextRequest, NextResponse } from "next/server";
import { getAllFlashcards } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const flashcards = await getAllFlashcards(domain ?? undefined);

    // Build per-domain counts from the full set
    const allCards = domain ? await getAllFlashcards() : flashcards;
    const byDomain: Record<string, number> = {};
    for (const card of allCards) {
      byDomain[card.domainSlug] = (byDomain[card.domainSlug] ?? 0) + 1;
    }

    return NextResponse.json({
      flashcards,
      total: flashcards.length,
      byDomain,
    });
  } catch (error) {
    console.error("Error loading flashcards:", error);
    return NextResponse.json(
      { error: "Failed to load flashcards" },
      { status: 500 },
    );
  }
}
