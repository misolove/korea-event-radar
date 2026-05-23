import { describe, expect, it } from "vitest";
import { selectInvalidCleanupCandidates } from "@/maintenance/invalid-cleanup";

describe("invalid cleanup", () => {
  it("selects obvious junk event rows", () => {
    const candidates = selectInvalidCleanupCandidates([
      {
        id: "1",
        title: "로그인",
        primarySource: "Google Developers",
        primarySourceUrl: "https://gdg.community.dev/accounts/social/signup/?next=/",
        registrationUrl: null,
        startsAt: null,
        endsAt: null,
        summary: null,
        organizer: null,
      },
      {
        id: "2",
        title: "LinkedIn에 지금 가입하세요. 회원 가입은 무료입니다.",
        primarySource: "LinkedIn",
        primarySourceUrl: "https://www.linkedin.com/signup/cold-join",
        registrationUrl: null,
        startsAt: null,
        endsAt: null,
        summary: null,
        organizer: null,
      },
      {
        id: "3",
        title: "Coding with AI: The Shift - Part 1/3",
        primarySource: "Meetup",
        primarySourceUrl: "https://www.meetup.com/ko-kr/codeseoul/events/314084114/",
        registrationUrl: null,
        startsAt: new Date("2026-04-10T09:00:00+09:00"),
        endsAt: new Date("2026-04-10T11:00:00+09:00"),
        summary: null,
        organizer: null,
      },
    ]);

    expect(candidates.map((event) => event.id)).toEqual(["1", "2"]);
  });
});
