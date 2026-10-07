import { Pool } from "pg";

import { env } from "../config/env.js";

// A pool is only created when DATABASE_URL is configured. This keeps the health
// endpoint useful during initial local setup without pretending a database exists.
export const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl })
  : null;

export async function checkDatabaseConnection(): Promise<"connected" | "unconfigured" | "unavailable"> {
  if (!pool) return "unconfigured";

  try {
    await pool.query("SELECT 1");
    return "connected";
  } catch {
    return "unavailable";
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) await pool.end();
}
