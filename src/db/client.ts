import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { getDatabaseAuthToken, getDatabaseUrl } from "@/lib/env";

declare global {
  var __eventRadarSql: ReturnType<typeof createClient> | undefined;
  var __eventRadarDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

export function getDb() {
  if (globalThis.__eventRadarDb) {
    return globalThis.__eventRadarDb;
  }

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is required for database operations.");
  }

  const sql =
    globalThis.__eventRadarSql ??
    createClient({
      url,
      authToken: getDatabaseAuthToken(),
    });
  const db = drizzle(sql, { schema });

  globalThis.__eventRadarSql = sql;
  globalThis.__eventRadarDb = db;

  return db;
}
