import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { eventEvidence, events, statusSnapshots } from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { parseBeforeDate, selectPastCleanupCandidates } from "@/maintenance/past-cleanup";

type CliOptions = {
  before: Date;
  apply: boolean;
  limit?: number;
};

function parseOptions(argv: string[]): CliOptions {
  let before: Date | undefined;
  let apply = false;
  let limit: number | undefined;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg.startsWith("--before=")) {
      before = parseBeforeDate(arg.slice("--before=".length));
      continue;
    }
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      continue;
    }
  }

  return {
    before: before ?? new Date(),
    apply,
    limit: Number.isFinite(limit) && limit && limit > 0 ? limit : undefined,
  };
}

async function main() {
  if (!getDatabaseUrl()) {
    throw new Error("TURSO_DATABASE_URL is required to clean persisted events.");
  }

  const options = parseOptions(process.argv.slice(2));
  const db = getDb();
  const rows = await db.select().from(events);
  const candidates = selectPastCleanupCandidates(rows, options.before);
  const limitedCandidates = options.limit ? candidates.slice(0, options.limit) : candidates;

  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          before: options.before.toISOString(),
          totalCandidates: candidates.length,
          showing: limitedCandidates.length,
          candidates: limitedCandidates.map((event) => ({
            id: event.id,
            title: event.title,
            primarySource: event.primarySource,
            registrationStatus: event.registrationStatus,
            startsAt: event.startsAt?.toISOString() ?? null,
            endsAt: event.endsAt?.toISOString() ?? null,
            referenceDate: event.referenceDate.toISOString(),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (limitedCandidates.length === 0) {
    console.log(
      JSON.stringify(
        {
          mode: "apply",
          before: options.before.toISOString(),
          deleted: 0,
        },
        null,
        2,
      ),
    );
    return;
  }

  const ids = limitedCandidates.map((event) => event.id);

  await db.delete(eventEvidence).where(inArray(eventEvidence.eventId, ids));
  await db.delete(statusSnapshots).where(inArray(statusSnapshots.eventId, ids));
  await db.delete(events).where(inArray(events.id, ids));

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        before: options.before.toISOString(),
        deleted: ids.length,
        deletedEvents: limitedCandidates.map((event) => ({
          id: event.id,
          title: event.title,
          primarySource: event.primarySource,
          referenceDate: formatDateTime(event.referenceDate.toISOString()),
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
