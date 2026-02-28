/**
 * Tutor Data Access Layer
 *
 * CRUD operations for tutor conversations and messages.
 * If userId is null or the DB is unavailable, operations are silent no-ops.
 */

import { eq, and, desc, asc } from "drizzle-orm";
import { isDbConfigured, getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function dbAvailable(): boolean {
  return isDbConfigured();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TutorConversationRecord {
  id: string;
  title: string | null;
  domainId: number | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface TutorMessageRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO
}

export interface TutorConversationWithMessages extends TutorConversationRecord {
  messages: TutorMessageRecord[];
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/**
 * Get all conversations for a user (without messages), ordered by most recent.
 */
export async function getTutorConversations(
  userId: string | null,
): Promise<TutorConversationRecord[]> {
  if (!userId || !dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.tutorConversations.id,
        title: schema.tutorConversations.title,
        domainId: schema.tutorConversations.domainId,
        createdAt: schema.tutorConversations.createdAt,
        updatedAt: schema.tutorConversations.updatedAt,
      })
      .from(schema.tutorConversations)
      .where(eq(schema.tutorConversations.userId, userId))
      .orderBy(desc(schema.tutorConversations.updatedAt));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      domainId: r.domainId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.warn("Failed to fetch tutor conversations:", err);
    return [];
  }
}

/**
 * Get a single conversation with all its messages.
 */
export async function getTutorConversation(
  userId: string | null,
  conversationId: string,
): Promise<TutorConversationWithMessages | null> {
  if (!userId || !dbAvailable()) return null;

  try {
    const db = getDb();

    // Verify conversation belongs to user
    const [conv] = await db
      .select({
        id: schema.tutorConversations.id,
        title: schema.tutorConversations.title,
        domainId: schema.tutorConversations.domainId,
        createdAt: schema.tutorConversations.createdAt,
        updatedAt: schema.tutorConversations.updatedAt,
      })
      .from(schema.tutorConversations)
      .where(
        and(
          eq(schema.tutorConversations.id, conversationId),
          eq(schema.tutorConversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conv) return null;

    const messages = await db
      .select({
        id: schema.tutorMessages.id,
        role: schema.tutorMessages.role,
        content: schema.tutorMessages.content,
        createdAt: schema.tutorMessages.createdAt,
      })
      .from(schema.tutorMessages)
      .where(eq(schema.tutorMessages.conversationId, conversationId))
      .orderBy(asc(schema.tutorMessages.createdAt));

    return {
      id: conv.id,
      title: conv.title,
      domainId: conv.domainId,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.warn("Failed to fetch tutor conversation:", err);
    return null;
  }
}

/**
 * Create a new conversation. Returns the new conversation ID.
 */
export async function createTutorConversation(
  userId: string | null,
  data: { title: string; domainId: number | null },
): Promise<string | null> {
  if (!userId || !dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .insert(schema.tutorConversations)
      .values({
        userId,
        title: data.title,
        domainId: data.domainId,
      })
      .returning({ id: schema.tutorConversations.id });

    return row?.id ?? null;
  } catch (err) {
    console.warn("Failed to create tutor conversation:", err);
    return null;
  }
}

/**
 * Update a conversation's title.
 */
export async function updateTutorConversation(
  userId: string | null,
  conversationId: string,
  data: { title?: string },
): Promise<void> {
  if (!userId || !dbAvailable()) return;

  try {
    const db = getDb();
    await db
      .update(schema.tutorConversations)
      .set(data)
      .where(
        and(
          eq(schema.tutorConversations.id, conversationId),
          eq(schema.tutorConversations.userId, userId),
        ),
      );
  } catch (err) {
    console.warn("Failed to update tutor conversation:", err);
  }
}

/**
 * Delete a conversation (cascades to messages).
 */
export async function deleteTutorConversation(
  userId: string | null,
  conversationId: string,
): Promise<boolean> {
  if (!userId || !dbAvailable()) return false;

  try {
    const db = getDb();
    await db
      .delete(schema.tutorConversations)
      .where(
        and(
          eq(schema.tutorConversations.id, conversationId),
          eq(schema.tutorConversations.userId, userId),
        ),
      );

    return true;
  } catch (err) {
    console.warn("Failed to delete tutor conversation:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Save a message to a conversation. Returns the message ID.
 */
export async function saveTutorMessage(
  userId: string | null,
  conversationId: string,
  data: { role: "user" | "assistant"; content: string },
): Promise<number | null> {
  if (!userId || !dbAvailable()) return null;

  try {
    const db = getDb();

    // Verify conversation belongs to user
    const [conv] = await db
      .select({ id: schema.tutorConversations.id })
      .from(schema.tutorConversations)
      .where(
        and(
          eq(schema.tutorConversations.id, conversationId),
          eq(schema.tutorConversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conv) return null;

    const [row] = await db
      .insert(schema.tutorMessages)
      .values({
        conversationId,
        role: data.role,
        content: data.content,
      })
      .returning({ id: schema.tutorMessages.id });

    return row?.id ?? null;
  } catch (err) {
    console.warn("Failed to save tutor message:", err);
    return null;
  }
}
