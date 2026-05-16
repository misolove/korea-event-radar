import { describe, expect, it } from "vitest";
import { parseBeforeDate, selectPastCleanupCandidates } from "@/maintenance/past-cleanup";

describe("past cleanup helpers", () => {
  it("selects past events before the cutoff", () => {
    const candidates = selectPastCleanupCandidates(
      [
        {
          id: "old-1",
          title: "DevFest 2024",
          primarySource: "GDG Community",
          registrationStatus: "past",
          startsAt: new Date("2024-11-12T09:00:00+09:00"),
          endsAt: new Date("2024-11-12T18:00:00+09:00"),
        },
        {
          id: "new-1",
          title: "Build with AI 2026",
          primarySource: "GDG Community",
          registrationStatus: "open",
          startsAt: new Date("2026-04-10T09:00:00+09:00"),
          endsAt: new Date("2026-04-10T18:00:00+09:00"),
        },
      ],
      new Date("2026-04-03T00:00:00+09:00"),
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.id).toBe("old-1");
  });

  it("keeps ongoing range events out of cleanup candidates", () => {
    const candidates = selectPastCleanupCandidates(
      [
        {
          id: "ongoing",
          title: "AI Creator Program",
          primarySource: "EventUs",
          registrationStatus: "open",
          startsAt: new Date("2026-04-01T09:00:00+09:00"),
          endsAt: new Date("2026-04-10T18:00:00+09:00"),
        },
      ],
      new Date("2026-04-03T00:00:00+09:00"),
    );

    expect(candidates).toHaveLength(0);
  });

  it("parses today as current date", () => {
    const before = parseBeforeDate("today");
    expect(before).toBeInstanceOf(Date);
  });
});
