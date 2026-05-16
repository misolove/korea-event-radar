export const registrationStatuses = [
  "open",
  "waitlist",
  "closed",
  "past",
  "unknown",
] as const;

export const statusOrigins = ["direct", "inferred"] as const;
export const priceTypes = ["free", "paid", "mixed", "unknown"] as const;
export const eventKinds = [
  "conference",
  "seminar",
  "meetup",
  "webinar",
  "hackathon",
  "bootcamp",
  "exhibition",
  "demo_day",
  "networking",
  "program",
  "other",
] as const;
export const deliveryTypes = ["offline", "online", "hybrid", "unknown"] as const;
export const sourceKinds = ["platform", "official", "social"] as const;

export type RegistrationStatus = (typeof registrationStatuses)[number];
export type StatusOrigin = (typeof statusOrigins)[number];
export type PriceType = (typeof priceTypes)[number];
export type EventKind = (typeof eventKinds)[number];
export type DeliveryType = (typeof deliveryTypes)[number];
export type SourceKind = (typeof sourceKinds)[number];

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  organizer: string | null;
  primarySource: string;
  primarySourceUrl: string;
  registrationUrl: string | null;
  city: string | null;
  venueName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  registrationDeadline: string | null;
  registrationStatus: RegistrationStatus;
  statusOrigin: StatusOrigin;
  priceType: PriceType;
  priceText: string | null;
  eventKind: EventKind;
  deliveryType: DeliveryType;
  topicTags: string[];
  confidenceScore: number;
  lastCheckedAt: string;
  lastSeenAt: string;
};

export type EventEvidence = {
  id: string;
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
  extractedAt: string;
  payload: Record<string, unknown> | null;
};

export type StatusSnapshot = {
  id: string;
  registrationStatus: RegistrationStatus;
  statusOrigin: StatusOrigin;
  priceType: PriceType;
  confidenceScore: number;
  observedAt: string;
  sourceName: string;
  sourceUrl: string;
};

export type EventDetail = EventSummary & {
  evidence: EventEvidence[];
  history: StatusSnapshot[];
};

export type ListEventsInput = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  includePast?: boolean;
  city?: string;
  deliveryType?: DeliveryType | "all";
  priceType?: PriceType | "all";
  registrationStatus?: RegistrationStatus | "all";
  eventKind?: EventKind | "all";
  source?: string | "all";
  topic?: string | "all";
  sort?: 'score' | 'date' | 'free';
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  open: "등록 가능",
  waitlist: "대기 가능",
  closed: "마감",
  past: "지난 행사",
  unknown: "확인 필요",
};

export const priceTypeLabels: Record<PriceType, string> = {
  free: "무료",
  paid: "유료",
  mixed: "무료/유료 혼합",
  unknown: "가격 확인 필요",
};

export const statusOriginLabels: Record<StatusOrigin, string> = {
  direct: "직접 확인",
  inferred: "텍스트 추론",
};

export const deliveryTypeLabels: Record<DeliveryType, string> = {
  offline: "오프라인",
  online: "온라인",
  hybrid: "온·오프라인",
  unknown: "형태 확인 필요",
};

export const eventKindLabels: Record<EventKind, string> = {
  conference: "컨퍼런스",
  seminar: "세미나",
  meetup: "밋업",
  webinar: "웨비나",
  hackathon: "해커톤",
  bootcamp: "부트캠프",
  exhibition: "전시",
  demo_day: "데모데이",
  networking: "네트워킹",
  program: "교육과정",
  other: "기타",
};

export const registrationStatusSortOrder: Record<RegistrationStatus, number> = {
  open: 0,
  waitlist: 1,
  unknown: 2,
  closed: 3,
  past: 4,
};

export function normalizeSearchParams(
  input: Record<string, string | string[] | undefined>,
): ListEventsInput {
  const getValue = (key: string) => {
    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    q: getValue("q") ?? undefined,
    dateFrom: getValue("date_from") ?? undefined,
    dateTo: getValue("date_to") ?? undefined,
    includePast: getValue("include_past") === "1" || getValue("include_past") === "true",
    city: getValue("city") ?? undefined,
    deliveryType: (getValue("delivery_type") as DeliveryType | "all" | undefined) ?? "all",
    priceType: (getValue("price_type") as PriceType | "all" | undefined) ?? "all",
    registrationStatus:
      (getValue("registration_status") as RegistrationStatus | "all" | undefined) ?? "all",
    eventKind: (getValue("event_kind") as EventKind | "all" | undefined) ?? "all",
    source: getValue("source") ?? "all",
    topic: getValue("topic") ?? "all",
    sort: ['score','date','free'].includes(String(getValue("sort") ?? '')) ? (getValue("sort") as 'score'|'date'|'free') : undefined,
  };
}
