import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { eventEvidence, events, statusSnapshots } from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";
import { selectInvalidCleanupCandidates } from "@/maintenance/invalid-cleanup";

type CliOptions = {
  apply: boolean;
};

function parseOptions(argv: string[]): CliOptions {
  return {
    apply: argv.includes("--apply"),
  };
}

async function main() {
  if (!getDatabaseUrl()) {
    throw new Error("TURSO_DATABASE_URL is required to clean persisted events.");
  }

  const options = parseOptions(process.argv.slice(2));
  const db = getDb();
  const rows = await db.select().from(events);
  const candidates = selectInvalidCleanupCandidates(rows);

  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          totalCandidates: candidates.length,
          candidates: candidates.map((event) => ({
            id: event.id,
            title: event.title,
            primarySource: event.primarySource,
            primarySourceUrl: event.primarySourceUrl,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (candidates.length === 0) {
    console.log(JSON.stringify({ mode: "apply", deleted: 0 }, null, 2));
    return;
  }

  const ids = candidates.map((event) => event.id);
  await db.delete(eventEvidence).where(inArray(eventEvidence.eventId, ids));
  await db.delete(statusSnapshots).where(inArray(statusSnapshots.eventId, ids));
  await db.delete(events).where(inArray(events.id, ids));

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        deleted: ids.length,
        deletedEvents: candidates.map((event) => ({
          id: event.id,
          title: event.title,
          primarySource: event.primarySource,
        })),
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
