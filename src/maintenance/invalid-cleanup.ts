import { looksLikeJunkEventPage } from "@/ingestion/extractors/common";
import { looksNonTech, looksTechRelevant } from "@/ingestion/normalize";

export type InvalidCleanupEventLike = {
  id: string;
  title: string;
  primarySource: string;
  primarySourceUrl: string;
  registrationUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  summary: string | null;
  organizer: string | null;
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

    const coreCorpus = [
      event.title,
      event.summary ?? "",
      event.organizer ?? "",
    ].join(" ");

    if (looksNonTech(event.title, event.summary ?? "")) {
      return true;
    }

    if (!looksTechRelevant(coreCorpus)) {
      return true;
    }

    return false;
  });
}
