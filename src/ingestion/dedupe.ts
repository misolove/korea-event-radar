import type { ExtractedEventDraft } from "@/ingestion/types";
import { normalizeUrl } from "@/lib/text";

function compositeKey(draft: ExtractedEventDraft) {
  const normalizedRegistrationUrl = draft.registrationUrl ? normalizeUrl(draft.registrationUrl) : null;
  if (normalizedRegistrationUrl) {
    return normalizedRegistrationUrl;
  }

  return [
    draft.primarySourceUrl ? normalizeUrl(draft.primarySourceUrl) : null,
    draft.title.toLowerCase(),
    draft.organizer?.toLowerCase() ?? "",
    draft.startsAt?.toISOString().slice(0, 10) ?? "",
  ]
    .filter(Boolean)
    .join("|");
}

function qualityScore(draft: ExtractedEventDraft) {
  return (
    (draft.statusOrigin === "direct" ? 30 : 0) +
    (draft.priceType !== "unknown" ? 20 : 0) +
    (draft.registrationUrl ? 15 : 0) +
    (draft.startsAt ? 15 : 0) +
    (draft.confidenceScore ?? 0)
  );
}

function mergeDrafts(a: ExtractedEventDraft, b: ExtractedEventDraft): ExtractedEventDraft {
  const preferred = qualityScore(a) >= qualityScore(b) ? a : b;
  const secondary = preferred === a ? b : a;

  return {
    ...preferred,
    summary: preferred.summary ?? secondary.summary ?? null,
    organizer: preferred.organizer ?? secondary.organizer ?? null,
    registrationUrl: preferred.registrationUrl ?? secondary.registrationUrl ?? null,
    city: preferred.city ?? secondary.city ?? null,
    venueName: preferred.venueName ?? secondary.venueName ?? null,
    startsAt: preferred.startsAt ?? secondary.startsAt ?? null,
    endsAt: preferred.endsAt ?? secondary.endsAt ?? null,
    registrationDeadline: preferred.registrationDeadline ?? secondary.registrationDeadline ?? null,
    topicTags: [...new Set([...(preferred.topicTags ?? []), ...(secondary.topicTags ?? [])])],
    confidenceScore: Math.max(preferred.confidenceScore ?? 0, secondary.confidenceScore ?? 0),
    evidence: [...preferred.evidence, ...secondary.evidence],
  };
}

export function dedupeDrafts(drafts: ExtractedEventDraft[]): ExtractedEventDraft[] {
  const map = new Map<string, ExtractedEventDraft>();

  for (const draft of drafts) {
    const key = compositeKey(draft);
    const existing = map.get(key);
    map.set(key, existing ? mergeDrafts(existing, draft) : draft);
  }

  return [...map.values()];
}
