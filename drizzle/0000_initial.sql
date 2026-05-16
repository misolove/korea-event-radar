CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `summary` text,
  `organizer` text,
  `primary_source` text NOT NULL,
  `primary_source_url` text NOT NULL,
  `registration_url` text,
  `city` text,
  `venue_name` text,
  `starts_at` integer,
  `ends_at` integer,
  `registration_deadline` integer,
  `registration_status` text NOT NULL DEFAULT 'unknown',
  `status_origin` text NOT NULL DEFAULT 'inferred',
  `price_type` text NOT NULL DEFAULT 'unknown',
  `price_text` text,
  `event_kind` text NOT NULL DEFAULT 'other',
  `delivery_type` text NOT NULL DEFAULT 'unknown',
  `topic_tags` text NOT NULL,
  `confidence_score` integer NOT NULL DEFAULT 50,
  `last_checked_at` integer NOT NULL,
  `last_seen_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);

CREATE TABLE `event_evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `source_kind` text NOT NULL,
  `source_name` text NOT NULL,
  `source_url` text NOT NULL,
  `discovered_from_url` text,
  `extracted_title` text,
  `extracted_status_text` text,
  `extracted_price_text` text,
  `extracted_location_text` text,
  `extracted_start_text` text,
  `registration_url` text,
  `registration_status` text NOT NULL DEFAULT 'unknown',
  `status_origin` text NOT NULL DEFAULT 'inferred',
  `price_type` text NOT NULL DEFAULT 'unknown',
  `confidence_score` integer NOT NULL DEFAULT 50,
  `extracted_at` integer NOT NULL,
  `payload` text,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
);

CREATE TABLE `status_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `registration_status` text NOT NULL,
  `status_origin` text NOT NULL,
  `price_type` text NOT NULL,
  `confidence_score` integer NOT NULL DEFAULT 50,
  `observed_at` integer NOT NULL,
  `source_name` text NOT NULL,
  `source_url` text NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
);

CREATE TABLE `ingestion_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `started_at` integer NOT NULL,
  `finished_at` integer,
  `status` text NOT NULL DEFAULT 'running',
  `total_seeds` integer NOT NULL DEFAULT 0,
  `total_candidates` integer NOT NULL DEFAULT 0,
  `total_upserted` integer NOT NULL DEFAULT 0,
  `total_failed` integer NOT NULL DEFAULT 0,
  `run_report` text
);
