import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasEventStarted, inferPastStatus, isPastEvent } from "@/lib/format";

describe("date visibility helpers", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00+09:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("treats an event as past when it ended before now", () => {
    expect(
      isPastEvent(
        "2025-04-02T10:00:00+09:00",
        "2025-04-02T18:00:00+09:00",
        new Date("2026-04-03T09:00:00+09:00").getTime(),
      ),
    ).toBe(true);
  });

  it("keeps not-yet-started range events out of past status", () => {
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

  it("marks started-but-not-ended long courses as past for display", () => {
    expect(
      inferPastStatus(
        "open",
        "2026-03-01T09:00:00+09:00",
        "2026-09-30T18:00:00+09:00",
      ),
    ).toBe("past");
  });

  it("hasEventStarted uses startsAt even when endsAt is in the future", () => {
    const now = new Date("2026-07-14T12:00:00+09:00").getTime();
    expect(
      hasEventStarted("2026-06-04T00:00:00+09:00", "2026-09-29T23:59:59+09:00", now),
    ).toBe(true);
    expect(
      hasEventStarted("2026-07-20T19:00:00+09:00", null, now),
    ).toBe(false);
    expect(hasEventStarted(null, "2026-08-01T18:00:00+09:00", now)).toBe(false);
  });

  it("isPastEvent stays endsAt-based so cleanup keeps ongoing courses", () => {
    const now = new Date("2026-07-14T12:00:00+09:00").getTime();
    expect(
      isPastEvent("2026-06-04T00:00:00+09:00", "2026-09-29T23:59:59+09:00", now),
    ).toBe(false);
  });
});
