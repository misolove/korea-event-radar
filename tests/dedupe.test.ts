import { describe, expect, it } from "vitest";
import { dedupeDrafts } from "@/ingestion/dedupe";
import type { ExtractedEventDraft } from "@/ingestion/types";

const baseDraft: ExtractedEventDraft = {
  title: "AI Builder Meetup Seoul",
  primarySource: "Meetup",
  primarySourceUrl: "https://meetup.com/events/1?utm_source=x",
  registrationUrl: "https://register.example.com/event/123?utm_medium=social",
  organizer: "Code Seoul",
  startsAt: new Date("2026-05-01T19:00:00+09:00"),
  registrationStatus: "open",
  statusOrigin: "direct",
  priceType: "free",
  eventKind: "meetup",
  deliveryType: "offline",
  confidenceScore: 90,
  evidence: [],
};

describe("dedupeDrafts", () => {
  it("merges same event discovered from different URLs", () => {
    const merged = dedupeDrafts([
      baseDraft,
      {
        ...baseDraft,
        primarySource: "LinkedIn",
        primarySourceUrl: "https://www.linkedin.com/posts/test",
        registrationUrl: "https://register.example.com/event/123?utm_campaign=test",
        evidence: [],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.primarySource).toBe("Meetup");
  });
});
