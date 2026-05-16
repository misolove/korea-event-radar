import { looksLikeJunkEventPage } from "@/ingestion/extractors/common";

export type InvalidCleanupEventLike = {
  id: string;
  title: string;
  primarySource: string;
  primarySourceUrl: string;
  registrationUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function selectInvalidCleanupCandidates(events: InvalidCleanupEventLike[]) {
  return events.filter((event) => {
    if (event.primarySource === "LinkedIn") {
      return true;
    }

    if (
      looksLikeJunkEventPage(event.title, event.primarySourceUrl, event.startsAt, event.endsAt)
    ) {
      return true;
    }

    return false;
  });
}
