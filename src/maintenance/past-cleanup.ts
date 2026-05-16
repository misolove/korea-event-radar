import { isPastEvent, looksHistoricalWithoutDates } from "@/lib/format";
import { type RegistrationStatus } from "@/lib/event-model";

export type CleanupEventLike = {
  id: string;
  title: string;
  summary?: string | null;
  primarySource: string;
  registrationStatus: RegistrationStatus | string;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type CleanupCandidate = CleanupEventLike & {
  referenceDate: Date;
};

export function selectPastCleanupCandidates(
  events: CleanupEventLike[],
  before: Date,
): CleanupCandidate[] {
  return events
    .map((event) => {
      const historicalWithoutDates = looksHistoricalWithoutDates(
        event.title,
        event.summary,
        event.startsAt,
        event.endsAt,
        before.getFullYear(),
      );
      const referenceDate = event.endsAt ?? event.startsAt ?? before;
      if (!historicalWithoutDates && !isPastEvent(event.startsAt, event.endsAt, before.getTime())) {
        return null;
      }

      return {
        ...event,
        referenceDate,
      };
    })
    .filter((event): event is CleanupCandidate => Boolean(event))
    .sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
}

export function parseBeforeDate(rawValue?: string) {
  if (!rawValue || rawValue === "today" || rawValue === "now") {
    return new Date();
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --before value: ${rawValue}`);
  }

  return parsed;
}
