import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getTutorConversation,
  updateTutorConversation,
  deleteTutorConversation,
} from "@/lib/data";

/**
 * GET /api/tutor/conversations/[id]
 *
 * Returns a single conversation with all its messages.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    const conversation = await getTutorConversation(userId, id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Error loading tutor conversation:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tutor/conversations/[id]
 *
 * Updates conversation metadata (title).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false });
    }

    const body = await request.json();
    const { title } = body as { title?: string };

    await updateTutorConversation(userId, id, { title });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating tutor conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tutor/conversations/[id]
 *
 * Deletes a conversation and all its messages.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false });
    }

    await deleteTutorConversation(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tutor conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
