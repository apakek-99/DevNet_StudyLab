import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getTutorConversations,
  createTutorConversation,
} from "@/lib/data";

/**
 * GET /api/tutor/conversations
 *
 * Returns all tutor conversations for the authenticated user.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const conversations = await getTutorConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error loading tutor conversations:", error);
    return NextResponse.json({ conversations: [] });
  }
}

/**
 * POST /api/tutor/conversations
 *
 * Creates a new tutor conversation. Returns { id } of the new conversation.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ id: null });
    }

    const body = await request.json();
    const { title, domainId } = body as {
      title: string;
      domainId: number | null;
    };

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const id = await createTutorConversation(userId, {
      title,
      domainId: domainId ?? null,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error creating tutor conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
