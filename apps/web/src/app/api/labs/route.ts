import { NextRequest, NextResponse } from "next/server";
import { listLabs } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const domainFilter = searchParams.get("domain");

    const labs = await listLabs({
      type: typeFilter ?? undefined,
      domain: domainFilter ?? undefined,
    });

    return NextResponse.json({ labs });
  } catch (error) {
    console.error("Error loading labs:", error);
    return NextResponse.json(
      { error: "Failed to load labs" },
      { status: 500 },
    );
  }
}
