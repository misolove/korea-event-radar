import { describe, expect, it } from "vitest";
import { extractYearHint, parseKoreanDateRange } from "@/ingestion/extractors/common";

describe("year hint parsing", () => {
  it("extracts a year hint from title text", () => {
    expect(extractYearHint("[2025 HRD트렌드] ChatGPT 활용 트렌드 리포트 공개!")).toBe(2025);
  });

  it("uses year hint when date text omits the year", () => {
    const range = parseKoreanDateRange("04월 15일(화) 00:00 ~ 05월 15일(금) 23:30", {
      yearHint: 2025,
    });

    expect(range.startsAt?.toISOString()).toBe("2025-04-14T15:00:00.000Z");
    expect(range.endsAt?.toISOString()).toBe("2025-05-15T14:30:00.000Z");
  });
});
