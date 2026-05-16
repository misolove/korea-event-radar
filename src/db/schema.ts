import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import {
  type DeliveryType,
  type EventKind,
  type PriceType,
  type RegistrationStatus,
  type SourceKind,
  type StatusOrigin,
  deliveryTypes,
  eventKinds,
  priceTypes,
  registrationStatuses,
  sourceKinds,
  statusOrigins,
} from "@/lib/event-model";

const now = () => new Date();
const createId = () => crypto.randomUUID();

export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(createId),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  organizer: text("organizer"),
  primarySource: text("primary_source").notNull(),
  primarySourceUrl: text("primary_source_url").notNull(),
  registrationUrl: text("registration_url"),
  city: text("city"),
  venueName: text("venue_name"),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  registrationDeadline: integer("registration_deadline", { mode: "timestamp_ms" }),
  registrationStatus: text("registration_status", { enum: registrationStatuses })
    .$type<RegistrationStatus>()
    .notNull()
    .default("unknown"),
  statusOrigin: text("status_origin", { enum: statusOrigins })
    .$type<StatusOrigin>()
    .notNull()
    .default("inferred"),
  priceType: text("price_type", { enum: priceTypes }).$type<PriceType>().notNull().default("unknown"),
  priceText: text("price_text"),
  eventKind: text("event_kind", { enum: eventKinds }).$type<EventKind>().notNull().default("other"),
  deliveryType: text("delivery_type", { enum: deliveryTypes })
    .$type<DeliveryType>()
    .notNull()
    .default("unknown"),
  topicTags: text("topic_tags", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
  confidenceScore: integer("confidence_score").notNull().default(50),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

export const eventEvidence = sqliteTable("event_evidence", {
  id: text("id").primaryKey().$defaultFn(createId),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  sourceKind: text("source_kind", { enum: sourceKinds }).$type<SourceKind>().notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  discoveredFromUrl: text("discovered_from_url"),
  extractedTitle: text("extracted_title"),
  extractedStatusText: text("extracted_status_text"),
  extractedPriceText: text("extracted_price_text"),
  extractedLocationText: text("extracted_location_text"),
  extractedStartText: text("extracted_start_text"),
  registrationUrl: text("registration_url"),
  registrationStatus: text("registration_status", { enum: registrationStatuses })
    .$type<RegistrationStatus>()
    .notNull()
    .default("unknown"),
  statusOrigin: text("status_origin", { enum: statusOrigins })
    .$type<StatusOrigin>()
    .notNull()
    .default("inferred"),
  priceType: text("price_type", { enum: priceTypes }).$type<PriceType>().notNull().default("unknown"),
  confidenceScore: integer("confidence_score").notNull().default(50),
  extractedAt: integer("extracted_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown> | null>(),
});

export const statusSnapshots = sqliteTable("status_snapshots", {
  id: text("id").primaryKey().$defaultFn(createId),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  registrationStatus: text("registration_status", { enum: registrationStatuses })
    .$type<RegistrationStatus>()
    .notNull(),
  statusOrigin: text("status_origin", { enum: statusOrigins }).$type<StatusOrigin>().notNull(),
  priceType: text("price_type", { enum: priceTypes }).$type<PriceType>().notNull(),
  confidenceScore: integer("confidence_score").notNull().default(50),
  observedAt: integer("observed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const ingestionRuns = sqliteTable("ingestion_runs", {
  id: text("id").primaryKey().$defaultFn(createId),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("running"),
  totalSeeds: integer("total_seeds").notNull().default(0),
  totalCandidates: integer("total_candidates").notNull().default(0),
  totalUpserted: integer("total_upserted").notNull().default(0),
  totalFailed: integer("total_failed").notNull().default(0),
  runReport: text("run_report", { mode: "json" }).$type<Record<string, unknown> | null>(),
});
