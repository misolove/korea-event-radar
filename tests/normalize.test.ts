import { describe, expect, it } from "vitest";
import { normalizeExtractedEvent } from "@/ingestion/normalize";
import type { ExtractedEventDraft } from "@/ingestion/types";

function buildDraft(rawText: string, customTitle?: string, customSummary?: string): ExtractedEventDraft {
  return {
    title: customTitle ?? "AI Builder Meetup Seoul",
    summary: customSummary ?? undefined,
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

  it("filters out non-tech events by title", () => {
    expect(normalizeExtractedEvent(buildDraft("서울", "2026 부동산 투자 가이드"))).toBeNull();
    expect(normalizeExtractedEvent(buildDraft("서울", "보드게임 동호회 멤버 모집"))).toBeNull();
    expect(normalizeExtractedEvent(buildDraft("서울", "Language Exchange - 영어회화 교류"))).toBeNull();
  });

  it("filters out non-tech events by summary", () => {
    // Title might be somewhat generic, but summary clearly shows it's a non-tech hobby
    expect(normalizeExtractedEvent(buildDraft("서울", "주말 네트워킹", "야외스냅 촬영 함께해요!"))).toBeNull();
    expect(normalizeExtractedEvent(buildDraft("서울", "소셜 모임", "신나는 친목 파티!"))).toBeNull();
  });

  it("filters out irrelevant events lacking tech keywords", () => {
    // Both title and summary lack any IT/dev keywords, thus looksTechRelevant should fail.
    // Assuming the location is valid (Seoul) so it passes looksKoreanRelevant, but fails looksTechRelevant.
    expect(normalizeExtractedEvent(buildDraft("서울", "평일 저녁 독서 모임", "매주 책을 읽고 토론합니다."))).toBeNull();
  });
});
