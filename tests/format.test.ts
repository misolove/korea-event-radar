import { describe, expect, it } from "vitest";
import { inferPastStatus, isPastEvent } from "@/lib/format";

describe("date visibility helpers", () => {
  it("treats an event as past when it ended before now", () => {
    expect(
      isPastEvent(
        "2025-04-02T10:00:00+09:00",
        "2025-04-02T18:00:00+09:00",
        new Date("2026-04-03T09:00:00+09:00").getTime(),
      ),
    ).toBe(true);
  });

  it("keeps ongoing range events out of past status", () => {
    expect(
      inferPastStatus(
        "open",
        "2026-04-01T09:00:00+09:00",
        "2026-04-10T18:00:00+09:00",
      ),
    ).toBe("open");
  });

  it("marks single-date old events as past", () => {
    expect(inferPastStatus("closed", "2025-05-01T19:00:00+09:00", null)).toBe("past");
  });
});
