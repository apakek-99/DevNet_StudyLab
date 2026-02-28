/**
 * Progress Data Access Layer
 *
 * CRUD operations for all user progress tables:
 * - flashcardProgress (SM-2 state)
 * - practiceAttempts + practiceAnswers (exam history)
 * - labAttempts (lab completion)
 * - studyProgress (objective checkboxes)
 *
 * All functions accept a userId. If userId is null or the DB is
 * unavailable, operations are silent no-ops so the UI never breaks.
 */

import { eq, and, desc } from "drizzle-orm";
import { isDbConfigured, getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbAvailable(): boolean {
  return isDbConfigured();
}

// ---------------------------------------------------------------------------
// Flashcard Progress
// ---------------------------------------------------------------------------

export interface FlashcardProgressRecord {
  flashcardId: string;
  ease: number;
  interval: number;
  repetitions: number;
  nextReview: string; // ISO
  lastReview: string; // ISO
}

/**
 * Get all flashcard SM-2 progress for a user.
 * Returns a map keyed by flashcardId for easy client-side merge.
 */
export async function getFlashcardProgress(
  userId: string | null,
): Promise<Record<string, FlashcardProgressRecord>> {
  if (!userId || !dbAvailable()) return {};

  try {
    const db = getDb();
    const rows = await db
      .select({
        flashcardId: schema.flashcardProgress.flashcardId,
        ease: schema.flashcardProgress.ease,
        interval: schema.flashcardProgress.interval,
        repetitions: schema.flashcardProgress.repetitions,
        nextReview: schema.flashcardProgress.nextReview,
        lastReview: schema.flashcardProgress.lastReview,
      })
      .from(schema.flashcardProgress)
      .where(eq(schema.flashcardProgress.userId, userId));

    const map: Record<string, FlashcardProgressRecord> = {};
    for (const row of rows) {
      map[row.flashcardId] = {
        flashcardId: row.flashcardId,
        ease: row.ease,
        interval: row.interval,
        repetitions: row.repetitions,
        nextReview: row.nextReview?.toISOString() ?? new Date().toISOString(),
        lastReview: row.lastReview?.toISOString() ?? new Date().toISOString(),
      };
    }
    return map;
  } catch (err) {
    console.warn("Failed to load flashcard progress from DB:", err);
    return {};
  }
}

/**
 * Upsert a single flashcard's SM-2 progress for a user.
 */
export async function upsertFlashcardProgress(
  userId: string | null,
  data: {
    flashcardId: string;
    ease: number;
    interval: number;
    repetitions: number;
    nextReview: string;
    lastReview: string;
  },
): Promise<void> {
  if (!userId || !dbAvailable()) return;

  try {
    const db = getDb();

    // Check if row exists
    const existing = await db
      .select({ id: schema.flashcardProgress.id })
      .from(schema.flashcardProgress)
      .where(
        and(
          eq(schema.flashcardProgress.userId, userId),
          eq(schema.flashcardProgress.flashcardId, data.flashcardId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.flashcardProgress)
        .set({
          ease: data.ease,
          interval: data.interval,
          repetitions: data.repetitions,
          nextReview: new Date(data.nextReview),
          lastReview: new Date(data.lastReview),
        })
        .where(eq(schema.flashcardProgress.id, existing[0].id));
    } else {
      await db.insert(schema.flashcardProgress).values({
        userId,
        flashcardId: data.flashcardId,
        ease: data.ease,
        interval: data.interval,
        repetitions: data.repetitions,
        nextReview: new Date(data.nextReview),
        lastReview: new Date(data.lastReview),
      });
    }
  } catch (err) {
    console.warn("Failed to upsert flashcard progress:", err);
  }
}

// ---------------------------------------------------------------------------
// Exam Attempts
// ---------------------------------------------------------------------------

export interface ExamAttemptRecord {
  id: string;
  score: number;
  totalQuestions: number;
  domainFilter: string | null;
  startedAt: string;
  completedAt: string | null;
}

/**
 * Get all past exam attempts for a user, newest first.
 */
export async function getExamAttempts(
  userId: string | null,
): Promise<ExamAttemptRecord[]> {
  if (!userId || !dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.practiceAttempts.id,
        score: schema.practiceAttempts.score,
        totalQuestions: schema.practiceAttempts.totalQuestions,
        domainFilter: schema.practiceAttempts.domainFilter,
        startedAt: schema.practiceAttempts.startedAt,
        completedAt: schema.practiceAttempts.completedAt,
      })
      .from(schema.practiceAttempts)
      .where(eq(schema.practiceAttempts.userId, userId))
      .orderBy(desc(schema.practiceAttempts.startedAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      score: r.score ?? 0,
      totalQuestions: r.totalQuestions ?? 0,
      domainFilter: r.domainFilter,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  } catch (err) {
    console.warn("Failed to load exam attempts from DB:", err);
    return [];
  }
}

/**
 * Save an exam attempt with individual answers.
 */
export async function saveExamAttempt(
  userId: string | null,
  data: {
    score: number;
    totalQuestions: number;
    domainFilter?: string;
    timeTakenSeconds: number;
    answers: Array<{
      questionId: string;
      userAnswer: unknown;
      isCorrect: boolean;
      timeSpent?: number;
    }>;
  },
): Promise<string | null> {
  if (!userId || !dbAvailable()) return null;

  try {
    const db = getDb();
    const now = new Date();
    const startedAt = new Date(now.getTime() - data.timeTakenSeconds * 1000);

    const [attempt] = await db
      .insert(schema.practiceAttempts)
      .values({
        userId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        domainFilter: data.domainFilter ?? null,
        startedAt,
        completedAt: now,
      })
      .returning({ id: schema.practiceAttempts.id });

    if (attempt && data.answers.length > 0) {
      await db.insert(schema.practiceAnswers).values(
        data.answers.map((a) => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          userAnswer: a.userAnswer,
          isCorrect: a.isCorrect,
          timeSpent: a.timeSpent ?? null,
        })),
      );
    }

    return attempt?.id ?? null;
  } catch (err) {
    console.warn("Failed to save exam attempt:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lab Attempts
// ---------------------------------------------------------------------------

export interface LabAttemptRecord {
  labSlug: string;
  status: "started" | "completed" | "failed";
  lastAttemptAt: string;
}

/**
 * Get all lab attempt statuses for a user.
 * Returns the most recent status per lab slug.
 */
export async function getLabAttempts(
  userId: string | null,
): Promise<Record<string, LabAttemptRecord>> {
  if (!userId || !dbAvailable()) return {};

  try {
    const db = getDb();
    const rows = await db
      .select({
        labId: schema.labAttempts.labId,
        status: schema.labAttempts.status,
        startedAt: schema.labAttempts.startedAt,
        completedAt: schema.labAttempts.completedAt,
        labSlug: schema.labs.slug,
      })
      .from(schema.labAttempts)
      .innerJoin(schema.labs, eq(schema.labAttempts.labId, schema.labs.id))
      .where(eq(schema.labAttempts.userId, userId))
      .orderBy(desc(schema.labAttempts.startedAt));

    // Keep only the latest attempt per lab slug
    const map: Record<string, LabAttemptRecord> = {};
    for (const row of rows) {
      if (!map[row.labSlug]) {
        map[row.labSlug] = {
          labSlug: row.labSlug,
          status: row.status,
          lastAttemptAt: (row.completedAt ?? row.startedAt).toISOString(),
        };
      }
    }
    return map;
  } catch (err) {
    console.warn("Failed to load lab attempts from DB:", err);
    return {};
  }
}

/**
 * Save or update a lab attempt.
 */
export async function saveLabAttempt(
  userId: string | null,
  labSlug: string,
  status: "started" | "completed" | "failed",
  userCode?: string,
): Promise<void> {
  if (!userId || !dbAvailable()) return;

  try {
    const db = getDb();

    // Look up lab id from slug
    const [lab] = await db
      .select({ id: schema.labs.id })
      .from(schema.labs)
      .where(eq(schema.labs.slug, labSlug))
      .limit(1);

    if (!lab) return;

    await db.insert(schema.labAttempts).values({
      userId,
      labId: lab.id,
      status,
      userCode: userCode ?? null,
      completedAt: status === "completed" ? new Date() : null,
    });
  } catch (err) {
    console.warn("Failed to save lab attempt:", err);
  }
}

// ---------------------------------------------------------------------------
// Study Progress (objective checkboxes)
// ---------------------------------------------------------------------------

/**
 * Get completed objective codes for a user.
 * Returns a Set of objective codes like "1.1", "2.3", etc.
 */
export async function getStudyProgress(
  userId: string | null,
): Promise<string[]> {
  if (!userId || !dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select({
        code: schema.objectives.code,
      })
      .from(schema.studyProgress)
      .innerJoin(
        schema.objectives,
        eq(schema.studyProgress.objectiveId, schema.objectives.id),
      )
      .where(eq(schema.studyProgress.userId, userId));

    return rows.map((r) => r.code);
  } catch (err) {
    console.warn("Failed to load study progress from DB:", err);
    return [];
  }
}

/**
 * Toggle an objective's completion status.
 * If completed=true, inserts a row. If false, deletes it.
 */
export async function saveStudyObjective(
  userId: string | null,
  objectiveCode: string,
  completed: boolean,
): Promise<void> {
  if (!userId || !dbAvailable()) return;

  try {
    const db = getDb();

    // Look up objective by code
    const [objective] = await db
      .select({
        id: schema.objectives.id,
        domainId: schema.objectives.domainId,
      })
      .from(schema.objectives)
      .where(eq(schema.objectives.code, objectiveCode))
      .limit(1);

    if (!objective) return;

    if (completed) {
      // Check if already exists
      const existing = await db
        .select({ id: schema.studyProgress.id })
        .from(schema.studyProgress)
        .where(
          and(
            eq(schema.studyProgress.userId, userId),
            eq(schema.studyProgress.objectiveId, objective.id),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.studyProgress).values({
          userId,
          domainId: objective.domainId,
          objectiveId: objective.id,
          completedAt: new Date(),
        });
      }
    } else {
      // Delete the row
      await db
        .delete(schema.studyProgress)
        .where(
          and(
            eq(schema.studyProgress.userId, userId),
            eq(schema.studyProgress.objectiveId, objective.id),
          ),
        );
    }
  } catch (err) {
    console.warn("Failed to save study objective:", err);
  }
}
