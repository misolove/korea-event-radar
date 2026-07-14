import { describe, expect, it } from "vitest";
import { extractStartDateHint } from "@/lib/date-hint";

const NOW = new Date("2026-07-14T12:00:00+09:00");

describe("extractStartDateHint", () => {
  it("parses month-day with weekday and time (FastCampus style)", () => {
    const hinted = extractStartDateHint(
      ["📌6월 10일 (수) 19:00~20:00 진행되는 Zoom 온라인 클래스 수강권입니다."],
      NOW,
    );
    expect(hinted?.toISOString()).toBe(new Date("2026-06-10T19:00:00+09:00").toISOString());
  });

  it("parses full Korean date with dots", () => {
    const hinted = extractStartDateHint(["■ 일시: 2026. 07. 20.(월) 13:30 ~ 15:30"], NOW);
    expect(hinted?.toISOString()).toBe(new Date("2026-07-20T13:30:00+09:00").toISOString());
  });

  it("parses compact dotted date without time", () => {
    const hinted = extractStartDateHint(["교육기간 : 2026.06.11 ~ 2026.10.26"], NOW);
    expect(hinted?.toISOString()).toBe(new Date("2026-06-11T00:00:00+09:00").toISOString());
  });

  it("resolves year across boundaries for bare month-day", () => {
    const january = new Date("2026-01-10T12:00:00+09:00");
    const hinted = extractStartDateHint(["12월 20일 (토) 10:00 진행"], january);
    expect(hinted?.getFullYear()).toBe(2025);
  });

  it("ignores month-day mentions without a time", () => {
    expect(extractStartDateHint(["7월에 다시 찾아 뵙겠습니다"], NOW)).toBeNull();
    expect(extractStartDateHint(["매주 화요일 저녁 모임"], NOW)).toBeNull();
  });

  it("returns null when no date-like text exists", () => {
    expect(extractStartDateHint([null, undefined, "행사 설명은 원문에서 확인해 주세요."], NOW)).toBeNull();
  });
});
