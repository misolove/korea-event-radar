import type {
  DeliveryType,
  EventKind,
  PriceType,
  RegistrationStatus,
  SourceKind,
  StatusOrigin,
} from "@/lib/event-model";

export type SeedMode = "event-page" | "list-page" | "official-page" | "social-page";

export type SourceSeed = {
  id: string;
  label: string;
  url: string;
  sourceName: string;
  sourceKind: SourceKind;
  mode: SeedMode;
  tags?: string[];
  enabledByDefault?: boolean;
};

export type DiscoveredCandidate = {
  url: string;
  sourceName: string;
  sourceKind: SourceKind;
  discoveredFromUrl: string | null;
};

export type EvidenceDraft = {
  sourceKind: SourceKind;
  sourceName: string;
  sourceUrl: string;
  discoveredFromUrl: string | null;
  extractedTitle: string | null;
  extractedStatusText: string | null;
  extractedPriceText: string | null;
  extractedLocationText: string | null;
  extractedStartText: string | null;
  registrationUrl: string | null;
  registrationStatus: RegistrationStatus;
  statusOrigin: StatusOrigin;
  priceType: PriceType;
  confidenceScore: number;
  payload: Record<string, unknown> | null;
};

export type ExtractedEventDraft = {
  slug?: string;
  title: string;
  summary?: string | null;
  organizer?: string | null;
  primarySource: string;
  primarySourceUrl: string;
  registrationUrl?: string | null;
  city?: string | null;
  venueName?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  registrationDeadline?: Date | null;
  registrationStatus?: RegistrationStatus;
  statusOrigin?: StatusOrigin;
  priceType?: PriceType;
  priceText?: string | null;
  eventKind?: EventKind;
  deliveryType?: DeliveryType;
  topicTags?: string[];
  confidenceScore?: number;
  isRelevant?: boolean;
  evidence: EvidenceDraft[];
  rawText?: string;
};

export type IngestionSummary = {
  runId: string | null;
  totalSeeds: number;
  totalCandidates: number;
  totalExtracted: number;
  totalPersisted: number;
  totalFailed: number;
  newEventIds: string[];   // 이번 수집에서 새로 삽입된 이벤트 ID 목록
  notes: string[];
  sourceStats: Array<{
    sourceName: string;
    seeds: number;
    candidates: number;
    extracted: number;
    persisted: number;
    failed: number;
  }>;
};
