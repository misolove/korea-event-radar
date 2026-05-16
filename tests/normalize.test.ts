import { describe, expect, it } from "vitest";
import { normalizeExtractedEvent } from "@/ingestion/normalize";
import type { ExtractedEventDraft } from "@/ingestion/types";

function buildDraft(rawText: string): ExtractedEventDraft {
  return {
    title: "AI Builder Meetup Seoul",
    primarySource: "Test",
    primarySourceUrl: "https://example.com/events/1",
    evidence: [
      {
        sourceKind: "official",
        sourceName: "Test",
        sourceUrl: "https://example.com/events/1",
        discoveredFromUrl: null,
        extractedTitle: "AI Builder Meetup Seoul",
        extractedStatusText: rawText,
        extractedPriceText: rawText,
        extractedLocationText: "서울",
        extractedStartText: "04월 10일 19:00",
        registrationUrl: "https://example.com/events/1",
        registrationStatus: "unknown",
        statusOrigin: "inferred",
        priceType: "unknown",
        confidenceScore: 40,
        payload: null,
      },
    ],
    rawText,
  };
}

describe("normalizeExtractedEvent", () => {
  it("maps open expressions", () => {
    const normalized = normalizeExtractedEvent(buildDraft("모집중 Now Open Register 무료 서울 AI meetup"));
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
  });

  it("maps waitlist expressions", () => {
    const normalized = normalizeExtractedEvent(buildDraft("Waitlist 서울 AI meetup"));
    expect(normalized?.registrationStatus).toBe("waitlist");
  });

  it("maps closed expressions", () => {
    const normalized = normalizeExtractedEvent(buildDraft("Application Closed 접수마감 서울 AI meetup"));
    expect(normalized?.registrationStatus).toBe("closed");
  });
});
