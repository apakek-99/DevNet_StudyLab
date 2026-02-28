/**
 * Data Access Layer — Labs
 *
 * Queries the database first; falls back to file reads when
 * DATABASE_URL is not configured or the query fails.
 *
 * Fields that only exist in the JSON files (hints, learningObjectives)
 * are supplemented from the file even when using the DB path.
 */

import fs from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";

import { isDbConfigured, getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LabMetadata {
  slug: string;
  title: string;
  description: string;
  domain: string;
  domainSlug: string;
  objectiveCode: string;
  difficulty: string;
  estimatedMinutes: number;
  type: string;
  tags: string[];
}

export interface LabDetail extends LabMetadata {
  instructions: string;
  starterCode: string;
  hints: string[];
  learningObjectives: string[];
}

interface LabFull extends LabDetail {
  solutionCode: string;
  expectedOutput: string;
}

// ---------------------------------------------------------------------------
// File loading helpers
// ---------------------------------------------------------------------------

function getLabsDir(): string {
  return path.join(process.cwd(), "..", "..", "content", "labs");
}

function loadAllLabFiles(): LabFull[] {
  const dir = getLabsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map(
      (f) =>
        JSON.parse(
          fs.readFileSync(path.join(dir, f), "utf-8"),
        ) as LabFull,
    );
}

function loadLabFile(slug: string): LabFull | null {
  const dir = getLabsDir();
  const filePath = path.join(dir, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as LabFull;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns lab metadata for listing. Strips code, solutions, and
 * instruction detail. Supports optional type and domain filters.
 */
export async function listLabs(options?: {
  type?: string;
  domain?: string;
}): Promise<LabMetadata[]> {
  if (isDbConfigured()) {
    try {
      const dbLabs = await listLabsFromDb(options);
      // If the DB has results, use them — but if the DB is connected
      // yet has fewer labs than files (partial seed), fall through
      // to file-based loading so nothing is missing from the listing.
      const fileLabs = listLabsFromFiles(options);
      if (dbLabs.length >= fileLabs.length) return dbLabs;
    } catch (err) {
      console.warn("DB labs query failed, falling back to files:", err);
    }
  }
  return listLabsFromFiles(options);
}

/**
 * Returns a single lab with all detail needed by the lab page
 * (instructions, starter code, hints, learning objectives).
 * Solution code and expected output are excluded.
 */
export async function getLab(slug: string): Promise<LabDetail | null> {
  if (isDbConfigured()) {
    try {
      const result = await getLabFromDb(slug);
      // If the DB is connected but the lab isn't seeded, fall through
      // to the file-based path instead of returning null.
      if (result) return result;
    } catch (err) {
      console.warn("DB lab query failed, falling back to file:", err);
    }
  }
  return getLabFromFile(slug);
}

/**
 * Returns the solution code and expected output for a lab.
 * Always file-based — solutions are not stored in the database.
 */
export function getLabSolution(
  slug: string,
): { solutionCode: string; expectedOutput: string } | null {
  const lab = loadLabFile(slug);
  if (!lab) return null;
  return { solutionCode: lab.solutionCode, expectedOutput: lab.expectedOutput };
}

/**
 * Loads minimal lab data for the run/execute endpoint.
 * Always file-based because expectedOutput isn't in the database.
 */
export function getLabForRun(
  slug: string,
): { type: string; expectedOutput: string } | null {
  const lab = loadLabFile(slug);
  if (!lab) return null;
  return { type: lab.type, expectedOutput: lab.expectedOutput };
}

// ---------------------------------------------------------------------------
// File-based implementations
// ---------------------------------------------------------------------------

function listLabsFromFiles(options?: {
  type?: string;
  domain?: string;
}): LabMetadata[] {
  let labs = loadAllLabFiles();
  if (options?.type) labs = labs.filter((l) => l.type === options.type);
  if (options?.domain) labs = labs.filter((l) => l.domainSlug === options.domain);

  return labs.map(
    ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      starterCode: _a,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      solutionCode: _b,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      expectedOutput: _c,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      hints: _d,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      instructions: _e,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      learningObjectives: _f,
      ...meta
    }) => meta,
  );
}

function getLabFromFile(slug: string): LabDetail | null {
  const lab = loadLabFile(slug);
  if (!lab) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { solutionCode: _, expectedOutput: _e, ...detail } = lab;
  return detail;
}

// ---------------------------------------------------------------------------
// Database implementations
// ---------------------------------------------------------------------------

async function listLabsFromDb(options?: {
  type?: string;
  domain?: string;
}): Promise<LabMetadata[]> {
  const db = getDb();

  const selectFields = {
    slug: schema.labs.slug,
    title: schema.labs.title,
    description: schema.labs.description,
    difficulty: schema.labs.difficulty,
    estimatedMinutes: schema.labs.estimatedMinutes,
    type: schema.labs.type,
    tags: schema.labs.tags,
    objectiveCode: schema.objectives.code,
    domainName: schema.domains.name,
    domainSlug: schema.domains.slug,
  };

  const conditions = [];
  if (options?.type) {
    conditions.push(eq(schema.labs.type, options.type as never));
  }
  if (options?.domain) {
    conditions.push(eq(schema.domains.slug, options.domain));
  }

  const baseQuery = db
    .select(selectFields)
    .from(schema.labs)
    .innerJoin(
      schema.objectives,
      eq(schema.labs.objectiveId, schema.objectives.id),
    )
    .innerJoin(
      schema.domains,
      eq(schema.objectives.domainId, schema.domains.id),
    );

  const rows =
    conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    domain: r.domainName,
    domainSlug: r.domainSlug,
    objectiveCode: r.objectiveCode,
    difficulty: r.difficulty,
    estimatedMinutes: r.estimatedMinutes ?? 0,
    type: r.type,
    tags: (r.tags as string[]) ?? [],
  }));
}

async function getLabFromDb(slug: string): Promise<LabDetail | null> {
  const db = getDb();

  const rows = await db
    .select({
      slug: schema.labs.slug,
      title: schema.labs.title,
      description: schema.labs.description,
      difficulty: schema.labs.difficulty,
      estimatedMinutes: schema.labs.estimatedMinutes,
      type: schema.labs.type,
      tags: schema.labs.tags,
      instructions: schema.labs.instructions,
      starterCode: schema.labs.starterCode,
      objectiveCode: schema.objectives.code,
      domainName: schema.domains.name,
      domainSlug: schema.domains.slug,
    })
    .from(schema.labs)
    .innerJoin(
      schema.objectives,
      eq(schema.labs.objectiveId, schema.objectives.id),
    )
    .innerJoin(
      schema.domains,
      eq(schema.objectives.domainId, schema.domains.id),
    )
    .where(eq(schema.labs.slug, slug))
    .limit(1);

  if (rows.length === 0) return null;

  const r = rows[0];

  // Supplement with hints and learningObjectives from the file
  // (these fields aren't stored in the database)
  const fileData = loadLabFile(slug);

  return {
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    domain: r.domainName,
    domainSlug: r.domainSlug,
    objectiveCode: r.objectiveCode,
    difficulty: r.difficulty,
    estimatedMinutes: r.estimatedMinutes ?? 0,
    type: r.type,
    tags: (r.tags as string[]) ?? [],
    instructions: r.instructions ?? "",
    starterCode: r.starterCode ?? "",
    hints: fileData?.hints ?? [],
    learningObjectives: fileData?.learningObjectives ?? [],
  };
}
