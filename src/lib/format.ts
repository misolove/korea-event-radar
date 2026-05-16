import {
  registrationStatusSortOrder,
  type EventSummary,
  type RegistrationStatus,
} from "@/lib/event-model";

const seoulFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const seoulDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeZone: "Asia/Seoul",
});

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "행사 페이지에서 일정 확인";
  }
  try {
    return seoulFormatter.format(new Date(value));
  } catch {
    return "행사 페이지에서 일정 확인";
  }
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "미정";
  }
  return seoulDateFormatter.format(new Date(value));
}

export function formatLocation(city: string | null, venueName: string | null) {
  if (city && venueName) {
    return venueName.includes(city) ? venueName : `${city} · ${venueName}`;
  }
  return venueName ?? city ?? "장소 확인 필요";
}

export function buildSortTuple(event: EventSummary): [number, number, number] {
  const statusRank = registrationStatusSortOrder[event.registrationStatus];
  const freeRank = event.priceType === "free" ? 0 : event.priceType === "mixed" ? 1 : 2;
  const dateRank = event.startsAt ? new Date(event.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
  return [statusRank, freeRank, dateRank];
}

export function compareEvents(a: EventSummary, b: EventSummary): number {
  const [aStatus, aFree, aDate] = buildSortTuple(a);
  const [bStatus, bFree, bDate] = buildSortTuple(b);
  return aStatus - bStatus || aFree - bFree || aDate - bDate;
}

function toMillis(value: string | Date | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

export function isPastEvent(
  startsAt: string | Date | null,
  endsAt: string | Date | null,
  now = Date.now(),
) {
  const reference = toMillis(endsAt) ?? toMillis(startsAt);
  if (reference === null) {
    return false;
  }
  return reference < now;
}

export function looksHistoricalWithoutDates(
  title: string | null | undefined,
  summary: string | null | undefined,
  startsAt: string | Date | null,
  endsAt: string | Date | null,
  nowYear = new Date().getFullYear(),
) {
  if (toMillis(startsAt) !== null || toMillis(endsAt) !== null) {
    return false;
  }

  const text = `${title ?? ""} ${summary ?? ""}`.trim();
  if (!text) {
    return false;
  }

  if (/(종료되었습니다|종료|ended|past event|closed)/i.test(text)) {
    return true;
  }

  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  return years.some((year) => year < nowYear);
}

export function inferPastStatus(
  status: RegistrationStatus,
  startsAt: string | null,
  endsAt: string | null,
  title?: string | null,
  summary?: string | null,
): RegistrationStatus {
  if (isPastEvent(startsAt, endsAt) && status !== "waitlist") {
    return "past";
  }

  if (looksHistoricalWithoutDates(title, summary, startsAt, endsAt)) {
    return "past";
  }

  return status;
}
