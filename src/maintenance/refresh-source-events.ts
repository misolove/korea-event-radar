import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { extractCandidate } from "@/ingestion/extractors";
import { normalizeExtractedEvent } from "@/ingestion/normalize";
import { persistEventDrafts } from "@/db/persist";

async function main() {
  const sourceName = process.argv[2];
  if (!sourceName) {
    throw new Error("Usage: npm run refresh:source -- <SourceName>");
  }

  if (!hasDatabaseUrl()) {
    throw new Error("TURSO_DATABASE_URL is required to refresh persisted events.");
  }

  const db = getDb();
  const rows = await db.select().from(events).where(eq(events.primarySource, sourceName));
  const drafts = [];

  for (const row of rows) {
    const extracted = await extractCandidate({
      url: row.primarySourceUrl,
      sourceName: row.primarySource,
      sourceKind: "platform",
      discoveredFromUrl: null,
    });

    if (!extracted) {
      continue;
    }

    const normalized = normalizeExtractedEvent(extracted);
    if (normalized) {
      drafts.push(normalized);
    }
  }

  const persisted = await persistEventDrafts(drafts);
  console.log(
    JSON.stringify(
      {
        sourceName,
        refreshed: drafts.length,
        persisted,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
