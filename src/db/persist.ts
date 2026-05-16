import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { findExistingEventId, loadEventById, loadLatestSnapshot } from "@/db/repository";
import { eventEvidence, events, ingestionRuns, statusSnapshots } from "@/db/schema";
import type { ExtractedEventDraft, IngestionSummary } from "@/ingestion/types";

export async function startIngestionRun(totalSeeds: number) {
  const [run] = await getDb()
    .insert(ingestionRuns)
    .values({
      totalSeeds,
      status: "running",
    })
    .returning();
  return run.id;
}

export async function finishIngestionRun(runId: string, summary: IngestionSummary) {
  await getDb()
    .update(ingestionRuns)
    .set({
      finishedAt: new Date(),
      status: "completed",
      totalCandidates: summary.totalCandidates,
      totalUpserted: summary.totalPersisted,
      totalFailed: summary.totalFailed,
      runReport: {
        notes: summary.notes,
        totalExtracted: summary.totalExtracted,
        sourceStats: summary.sourceStats,
      },
    })
    .where(eq(ingestionRuns.id, runId));
}

export async function persistEventDrafts(drafts: ExtractedEventDraft[]) {
  const db = getDb();
  let totalPersisted = 0;
  const newEventIds: string[] = [];

  for (const draft of drafts) {
    const existingId = await findExistingEventId(
      draft.slug!,
      draft.registrationUrl ?? null,
      draft.primarySourceUrl,
      draft.title,
      draft.organizer ?? null,
      draft.startsAt ?? null,
    );

    const values = {
      slug: draft.slug!,
      title: draft.title,
      summary: draft.summary ?? null,
      organizer: draft.organizer ?? null,
      primarySource: draft.primarySource,
      primarySourceUrl: draft.primarySourceUrl,
      registrationUrl: draft.registrationUrl ?? null,
      city: draft.city ?? null,
      venueName: draft.venueName ?? null,
      startsAt: draft.startsAt ?? null,
      endsAt: draft.endsAt ?? null,
      registrationDeadline: draft.registrationDeadline ?? null,
      registrationStatus: draft.registrationStatus ?? "unknown",
      statusOrigin: draft.statusOrigin ?? "inferred",
      priceType: draft.priceType ?? "unknown",
      priceText: draft.priceText ?? null,
      eventKind: draft.eventKind ?? "other",
      deliveryType: draft.deliveryType ?? "unknown",
      topicTags: draft.topicTags ?? [],
      confidenceScore: draft.confidenceScore ?? 50,
      lastCheckedAt: new Date(),
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    } as const;

    let eventId = existingId;
    let isNew = false;
    if (eventId) {
      await db.update(events).set(values).where(eq(events.id, eventId));
    } else {
      const [inserted] = await db.insert(events).values(values).returning();
      eventId = inserted.id;
      isNew = true;
    }

    const storedEvent = await loadEventById(eventId);
    if (!storedEvent) {
      continue;
    }

    // 신규 삽입 기록
    if (isNew) newEventIds.push(eventId);
    await db.insert(eventEvidence).values(
      draft.evidence.map((evidence) => ({
        eventId,
        sourceKind: evidence.sourceKind,
        sourceName: evidence.sourceName,
        sourceUrl: evidence.sourceUrl,
        discoveredFromUrl: evidence.discoveredFromUrl,
        extractedTitle: evidence.extractedTitle,
        extractedStatusText: evidence.extractedStatusText,
        extractedPriceText: evidence.extractedPriceText,
        extractedLocationText: evidence.extractedLocationText,
        extractedStartText: evidence.extractedStartText,
        registrationUrl: evidence.registrationUrl,
        registrationStatus: evidence.registrationStatus,
        statusOrigin: evidence.statusOrigin,
        priceType: evidence.priceType,
        confidenceScore: evidence.confidenceScore,
        payload: evidence.payload,
      })),
    );

    const latest = await loadLatestSnapshot(eventId);
    const changed =
      !latest ||
      latest.registrationStatus !== storedEvent.registrationStatus ||
      latest.priceType !== storedEvent.priceType ||
      latest.statusOrigin !== storedEvent.statusOrigin;

    if (changed) {
      await db.insert(statusSnapshots).values({
        eventId,
        registrationStatus: storedEvent.registrationStatus,
        statusOrigin: storedEvent.statusOrigin,
        priceType: storedEvent.priceType,
        confidenceScore: storedEvent.confidenceScore,
        sourceName: storedEvent.primarySource,
        sourceUrl: storedEvent.primarySourceUrl,
      });
    }

    totalPersisted += 1;
  }

  return { totalPersisted, newEventIds };
}
