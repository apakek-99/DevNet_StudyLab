import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { saveTutorMessage } from "@/lib/data";

/**
 * POST /api/tutor/conversations/[id]/messages
 *
 * Saves a message to a conversation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ id: null });
    }

    const body = await request.json();
    const { role, content } = body as {
      role: "user" | "assistant";
      content: string;
    };

    if (!role || !content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 },
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "role must be 'user' or 'assistant'" },
        { status: 400 },
      );
    }

    const messageId = await saveTutorMessage(userId, id, { role, content });
    return NextResponse.json({ id: messageId });
  } catch (error) {
    console.error("Error saving tutor message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }
}
