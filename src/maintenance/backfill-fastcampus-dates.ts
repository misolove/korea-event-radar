import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { hasDatabaseUrl } from "@/lib/env";
import { resolveFastCampusStartDate } from "@/ingestion/extractors/fastcampus";

type CliOptions = {
  apply: boolean;
};

type CourseInfo = {
  publicNotice: string;
  openAt: string | null;
};

function parseOptions(argv: string[]): CliOptions {
  return { apply: argv.includes("--apply") };
}

function courseIdFromUrl(url: string): string | null {
  return url.match(/fastcampus\.co\.kr\/products\/(\d+)/)?.[1] ?? null;
}

async function courseIdFromSlugPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SeminarScoutBot/1.0)" },
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    return html.match(/(?:courseId|course-id)[^\d]{1,20}(\d+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchCourseInfos(courseIds: string[]): Promise<Map<string, CourseInfo>> {
  const infos = new Map<string, CourseInfo>();
  const chunkSize = 15;

  for (let i = 0; i < courseIds.length; i += chunkSize) {
    const chunk = courseIds.slice(i, i + chunkSize);
    const query = chunk.map((id) => `id=${id}`).join("&");
    try {
      const response = await fetch(`https://fastcampus.co.kr/.api/courses?${query}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SeminarScoutBot/1.0)" },
      });
      if (!response.ok) {
        continue;
      }
      const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
      for (const course of json.data ?? []) {
        infos.set(String(course.id), {
          publicNotice: typeof course.publicNotice === "string" ? course.publicNotice : "",
          openAt: typeof course.openAt === "string" ? course.openAt : null,
        });
      }
    } catch {
      continue;
    }
  }

  return infos;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (!hasDatabaseUrl()) {
    throw new Error("TURSO_DATABASE_URL is required to backfill FastCampus dates.");
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(events)
    .where(and(eq(events.primarySource, "FastCampus"), isNull(events.startsAt)));

  const courseIdByEventId = new Map<string, string>();
  for (const row of rows) {
    const courseId =
      courseIdFromUrl(row.primarySourceUrl) ?? (await courseIdFromSlugPage(row.primarySourceUrl));
    if (courseId) {
      courseIdByEventId.set(row.id, courseId);
    }
  }

  const courseInfos = await fetchCourseInfos([...new Set(courseIdByEventId.values())]);
  const planned: Array<{ id: string; title: string; startsAt: Date }> = [];

  for (const row of rows) {
    const courseId = courseIdByEventId.get(row.id);
    const info = courseId ? courseInfos.get(courseId) : null;
    if (!info) {
      continue;
    }

    const text = [row.summary ?? "", info.publicNotice].filter(Boolean).join("\n");
    const startsAt = resolveFastCampusStartDate(text, info.openAt);
    if (startsAt) {
      planned.push({ id: row.id, title: row.title, startsAt });
    }
  }

  if (options.apply) {
    for (const update of planned) {
      await db
        .update(events)
        .set({ startsAt: update.startsAt, updatedAt: new Date() })
        .where(eq(events.id, update.id));
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        candidates: rows.length,
        resolved: planned.length,
        updates: planned.map((update) => ({
          title: update.title.slice(0, 60),
          startsAt: update.startsAt.toISOString(),
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
