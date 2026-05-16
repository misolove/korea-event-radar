import { NextResponse } from "next/server";
import { getEventBySlug } from "@/db/repository";
import { areWriteRoutesDisabled, hasDatabaseUrl } from "@/lib/env";
import { extractCandidate } from "@/ingestion/extractors";
import { normalizeExtractedEvent } from "@/ingestion/normalize";
import { persistEventDrafts } from "@/db/persist";

export const dynamic = "force-dynamic";

type RecheckBody = {
  slug?: string;
  url?: string;
  sourceName?: string;
};

export async function POST(request: Request) {
  if (areWriteRoutesDisabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = request.headers.get("x-ops-secret");
  if (!process.env.OPS_SECRET || secret !== process.env.OPS_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "TURSO_DATABASE_URL is required for recheck." }, { status: 400 });
  }

  const body = (await request.json()) as RecheckBody;
  let targetUrl = body.url ?? null;
  let sourceName = body.sourceName ?? "Manual";

  if (!targetUrl && body.slug) {
    const event = await getEventBySlug(body.slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    targetUrl = event.primarySourceUrl;
    sourceName = event.primarySource;
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "slug or url is required" }, { status: 400 });
  }

  const extracted = await extractCandidate({
    url: targetUrl,
    sourceName,
    sourceKind: "official",
    discoveredFromUrl: null,
  });

  if (!extracted) {
    return NextResponse.json({ error: "Unable to extract event" }, { status: 422 });
  }

  const normalized = normalizeExtractedEvent(extracted);
  if (!normalized) {
    return NextResponse.json({ error: "Unable to normalize event" }, { status: 422 });
  }

  const totalPersisted = await persistEventDrafts([normalized]);
  return NextResponse.json({ ok: true, totalPersisted, targetUrl });
}
