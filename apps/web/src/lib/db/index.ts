import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Lazy database connection
//
// The connection is only created when `getDb()` is first called. This allows
// the Next.js app to start and serve pages that don't need the database even
// when DATABASE_URL is not set (e.g. during E2E tests, static builds, or
// when running without Docker).
// ---------------------------------------------------------------------------

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;

/**
 * Returns the Drizzle database instance. Creates the connection lazily on
 * first call. Throws if DATABASE_URL is not configured.
 */
export function getDb(): DrizzleDB {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Start PostgreSQL with: docker compose -f docker/docker-compose.yml up -d postgres"
    );
  }

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Returns true if the database is configured (DATABASE_URL is set).
 * Does NOT test connectivity — use this for fast feature-flag checks.
 */
export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Re-export for backward compatibility & convenience.
// Importing `db` will NOT throw at import time anymore — only when used.
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
