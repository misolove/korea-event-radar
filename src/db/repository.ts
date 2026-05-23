import { and, desc, eq, or } from "drizzle-orm";
import { eventEvidence, events, ingestionRuns, statusSnapshots } from "@/db/schema";
import { getDb } from "@/db/client";
import { hasDatabaseUrl } from "@/lib/env";
import { compareEvents, inferPastStatus, isPastEvent, looksHistoricalWithoutDates } from "@/lib/format";
import {
  type EventDetail,
  type EventEvidence,
  type EventSummary,
  type ListEventsInput,
  type EventKind,
  type PriceType,
  type RegistrationStatus,
  type SourceKind,
  type StatusOrigin,
  type DeliveryType,
} from "@/lib/event-model";
import { sampleEvents } from "@/lib/sample-data";
import { normalizeWhitespace } from "@/lib/text";

type SourceRunStat = {
  sourceName: string;
  seeds: number;
  candidates: number;
  extracted: number;
  persisted: number;
  failed: number;
};

type RunReport = {
  notes?: string[];
  totalExtracted?: number;
  sourceStats?: SourceRunStat[];
};

type EvidenceStatusSignal = {
  registrationStatus: RegistrationStatus;
  statusOrigin: StatusOrigin;
};

function dedupeEvidenceRows(rows: Array<typeof eventEvidence.$inferSelect>) {
  const uniqueRows = new Map<string, typeof eventEvidence.$inferSelect>();

  for (const row of rows) {
    const key = [
      row.sourceName,
      row.sourceUrl,
      row.registrationUrl ?? "",
      row.extractedStatusText ?? "",
      row.extractedPriceText ?? "",
      row.extractedLocationText ?? "",
    ].join("|");

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  return [...uniqueRows.values()];
}

function fallbackSummaries(): EventSummary[] {
  return sampleEvents.map(({ evidence: _evidence, history: _history, ...event }) => event);
}

function fallbackDetail(slug: string): EventDetail | null {
  return sampleEvents.find((event) => event.slug === slug) ?? null;
}

function parseRunReport(value: unknown): RunReport | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const runReport = value as RunReport;
  return {
    notes: Array.isArray(runReport.notes) ? runReport.notes.filter((note) => typeof note === "string") : [],
    totalExtracted: typeof runReport.totalExtracted === "number" ? runReport.totalExtracted : 0,
    sourceStats: Array.isArray(runReport.sourceStats)
      ? runReport.sourceStats.filter((stat) => stat && typeof stat.sourceName === "string")
      : [],
  };
}

function deriveStatusFromEvidenceText(
  text: string | null | undefined,
): EvidenceStatusSignal | null {
  if (!text) {
    return null;
  }

  if (/(sold out|application closed|모집마감|접수마감|마감)/i.test(text)) {
    return {
      registrationStatus: "closed",
      statusOrigin: "direct",
    };
  }

  if (/(waitlist|대기)/i.test(text)) {
    return {
      registrationStatus: "waitlist",
      statusOrigin: "direct",
    };
  }

  if (/(now open|register|rsvp|모집중|접수중|신청가능|신청하기)/i.test(text)) {
    return {
      registrationStatus: "open",
      statusOrigin: "direct",
    };
  }

  return null;
}

function resolveEffectiveStatus(
  row: typeof events.$inferSelect,
  latestEvidence?: Pick<typeof eventEvidence.$inferSelect, "extractedStatusText"> | null,
): EvidenceStatusSignal {
  const evidenceSignal = deriveStatusFromEvidenceText(latestEvidence?.extractedStatusText);
  if (evidenceSignal) {
    return evidenceSignal;
  }

  return {
    registrationStatus: row.registrationStatus as RegistrationStatus,
    statusOrigin: row.statusOrigin as StatusOrigin,
  };
}

function rowToSummary(
  row: typeof events.$inferSelect,
  latestEvidence?: Pick<typeof eventEvidence.$inferSelect, "extractedStatusText"> | null,
): EventSummary {
  const effectiveStatus = resolveEffectiveStatus(row, latestEvidence);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    organizer: row.organizer,
    primarySource: row.primarySource,
    primarySourceUrl: row.primarySourceUrl,
    registrationUrl: row.registrationUrl,
    city: row.city,
    venueName: row.venueName,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    registrationDeadline: row.registrationDeadline?.toISOString() ?? null,
    registrationStatus: inferPastStatus(
      effectiveStatus.registrationStatus,
      row.startsAt?.toISOString() ?? null,
      row.endsAt?.toISOString() ?? null,
      row.title,
      row.summary,
    ),
    statusOrigin: effectiveStatus.statusOrigin,
    priceType: row.priceType as PriceType,
    priceText: row.priceText,
    eventKind: row.eventKind as EventKind,
    deliveryType: row.deliveryType as DeliveryType,
    topicTags: row.topicTags,
    confidenceScore: row.confidenceScore,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

function evidenceRowToModel(row: typeof eventEvidence.$inferSelect): EventEvidence {
  return {
    id: row.id,
    sourceKind: row.sourceKind as SourceKind,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    discoveredFromUrl: row.discoveredFromUrl,
    extractedTitle: row.extractedTitle,
    extractedStatusText: row.extractedStatusText,
    extractedPriceText: row.extractedPriceText,
    extractedLocationText: row.extractedLocationText,
    extractedStartText: row.extractedStartText,
    registrationUrl: row.registrationUrl,
    registrationStatus: row.registrationStatus as RegistrationStatus,
    statusOrigin: row.statusOrigin as StatusOrigin,
    priceType: row.priceType as PriceType,
    confidenceScore: row.confidenceScore,
    extractedAt: row.extractedAt.toISOString(),
    payload: row.payload,
  };
}

function matchesFilters(event: EventSummary, filters: ListEventsInput): boolean {
  const shouldIncludePast = filters.includePast || filters.registrationStatus === "past";

  if (
    !shouldIncludePast &&
    (isPastEvent(event.startsAt, event.endsAt) ||
      looksHistoricalWithoutDates(event.title, event.summary, event.startsAt, event.endsAt))
  ) {
    return false;
  }

  // 등록마감(closed) 행사는 기본 목록에서 숨김 (registrationStatus 필터로 명시 요청 시에만 표시)
  if (!shouldIncludePast && !filters.registrationStatus && event.registrationStatus === "closed") {
    return false;
  }

  if (filters.q) {
    const haystack = [event.title, event.summary, event.organizer, event.topicTags.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) {
      return false;
    }
  }

  if (filters.city && normalizeWhitespace(event.city).toLowerCase() !== filters.city.toLowerCase()) {
    return false;
  }

  if (filters.deliveryType && filters.deliveryType !== "all" && event.deliveryType !== filters.deliveryType) {
    return false;
  }

  if (filters.priceType && filters.priceType !== "all" && event.priceType !== filters.priceType) {
    return false;
  }

  if (
    filters.registrationStatus &&
    filters.registrationStatus !== "all" &&
    event.registrationStatus !== filters.registrationStatus
  ) {
    return false;
  }

  if (filters.eventKind && filters.eventKind !== "all" && event.eventKind !== filters.eventKind) {
    return false;
  }

  if (filters.source && filters.source !== "all" && event.primarySource !== filters.source) {
    return false;
  }

  if (filters.topic && filters.topic !== "all" && !event.topicTags.includes(filters.topic)) {
    return false;
  }

  if (filters.dateFrom && event.startsAt && new Date(event.startsAt) < new Date(filters.dateFrom)) {
    return false;
  }

  if (filters.dateTo && event.startsAt && new Date(event.startsAt) > new Date(filters.dateTo)) {
    return false;
  }

  return true;
}

export async function listEvents(filters: ListEventsInput = {}): Promise<EventSummary[]> {
  const baseEvents = hasDatabaseUrl()
    ? await Promise.all([
        getDb().select().from(events),
        getDb().select().from(eventEvidence).orderBy(desc(eventEvidence.extractedAt)),
      ])
        .then(([rows, evidenceRows]) => {
          const latestEvidenceByEventId = new Map<string, typeof eventEvidence.$inferSelect>();
          for (const evidence of evidenceRows) {
            if (!latestEvidenceByEventId.has(evidence.eventId)) {
              latestEvidenceByEventId.set(evidence.eventId, evidence);
            }
          }

          return rows
            .map((row) => rowToSummary(row, latestEvidenceByEventId.get(row.id)))
            .filter((event) => matchesFilters(event, filters))
            .sort((a, b) => {
              if (filters.sort === 'date') {
                const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
                const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
                return aTime - bTime;
              }
              if (filters.sort === 'free') {
                const aFree = a.priceType === 'free' ? 0 : 1;
                const bFree = b.priceType === 'free' ? 0 : 1;
                if (aFree !== bFree) return aFree - bFree;
                const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
                const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
                return aTime - bTime;
              }
              return compareEvents(a, b);
            });
        })
        .catch(() => fallbackSummaries())
    : fallbackSummaries();

  return baseEvents;
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  if (!hasDatabaseUrl()) {
    return fallbackDetail(slug);
  }

  try {
    const db = getDb();
    const row = await db.query.events.findFirst({
      where: eq(events.slug, slug),
    });

    if (!row) {
      return fallbackDetail(slug);
    }

    const [evidenceRows, historyRows] = await Promise.all([
      db
        .select()
        .from(eventEvidence)
        .where(eq(eventEvidence.eventId, row.id))
        .orderBy(desc(eventEvidence.extractedAt)),
      db
        .select()
        .from(statusSnapshots)
        .where(eq(statusSnapshots.eventId, row.id))
        .orderBy(desc(statusSnapshots.observedAt)),
    ]);

    return {
      ...rowToSummary(row, evidenceRows[0]),
      evidence: dedupeEvidenceRows(evidenceRows).slice(0, 6).map(evidenceRowToModel),
      history: historyRows.map((snapshot) => ({
        id: snapshot.id,
        registrationStatus: snapshot.registrationStatus as RegistrationStatus,
        statusOrigin: snapshot.statusOrigin as StatusOrigin,
        priceType: snapshot.priceType as PriceType,
        confidenceScore: snapshot.confidenceScore,
        observedAt: snapshot.observedAt.toISOString(),
        sourceName: snapshot.sourceName,
        sourceUrl: snapshot.sourceUrl,
      })),
    };
  } catch {
    return fallbackDetail(slug);
  }
}

export async function getOpsOverview() {
  if (!hasDatabaseUrl()) {
    return {
      runs: [],
      events: sampleEvents,
      sourceStats: [],
      note: "TURSO_DATABASE_URL이 없어 데모 데이터로 표시 중입니다.",
    };
  }

  try {
    const db = getDb();
    const [runs, eventRows] = await Promise.all([
      db.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(10),
      db.select().from(events).orderBy(desc(events.lastCheckedAt)).limit(30),
    ]);

    return {
      runs,
      events: eventRows.map((row) => rowToSummary(row)),
      sourceStats: parseRunReport(runs[0]?.runReport)?.sourceStats ?? [],
      note: null,
    };
  } catch {
    return {
      runs: [],
      events: sampleEvents,
      sourceStats: [],
      note: "Turso 연결에 실패해 데모 데이터로 표시 중입니다.",
    };
  }
}

export async function findExistingEventId(
  slug: string,
  registrationUrl: string | null,
  primarySourceUrl: string,
  title: string,
  organizer: string | null,
  startsAt: Date | null,
) {
  const db = getDb();
  const byUrl = registrationUrl
    ? await db.query.events.findFirst({
        where: or(
          eq(events.registrationUrl, registrationUrl),
          eq(events.primarySourceUrl, primarySourceUrl),
          eq(events.slug, slug),
        ),
      })
    : await db.query.events.findFirst({
        where: or(eq(events.primarySourceUrl, primarySourceUrl), eq(events.slug, slug)),
      });

  if (byUrl) {
    return byUrl.id;
  }

  if (!organizer || !startsAt) {
    return null;
  }

  const byShape = await db.query.events.findFirst({
    where: and(
      eq(events.title, title),
      eq(events.organizer, organizer),
      eq(events.startsAt, startsAt),
    ),
  });

  return byShape?.id ?? null;
}

export async function loadEventById(id: string) {
  return getDb().query.events.findFirst({
    where: eq(events.id, id),
  });
}

export async function loadLatestSnapshot(eventId: string) {
  return getDb().query.statusSnapshots.findFirst({
    where: eq(statusSnapshots.eventId, eventId),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.observedAt)],
  });
}

/** Returns the ISO timestamp of the most recent completed ingestion run, or null. */
export async function getLastIngestTime(): Promise<string | null> {
  if (!hasDatabaseUrl()) return null;
  try {
    const db = getDb();
    const row = await db.query.ingestionRuns.findFirst({
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.startedAt)],
    });
    return row?.finishedAt?.toISOString() ?? row?.startedAt?.toISOString() ?? null;
  } catch {
    return null;
  }
}
