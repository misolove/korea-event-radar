import { describe, expect, it } from "vitest";
import {
  extractOrganizerName,
  looksLikeJunkEventPage,
  pickSafeRegistrationUrl,
} from "@/ingestion/extractors/common";

describe("extractor helpers", () => {
  it("extracts organizer name from schema.org objects", () => {
    expect(
      extractOrganizerName({
        "@type": "Organization",
        name: "AI Seoul Public",
      }),
    ).toBe("AI Seoul Public");
  });

  it("avoids direct join links as registration links", () => {
    expect(
      pickSafeRegistrationUrl("https://www.meetup.com/foo/events/1/", [
        "https://meet.google.com/qjx-pcvd-xyw",
        "https://docs.google.com/presentation/d/abc",
      ]),
    ).toBe("https://www.meetup.com/foo/events/1");
  });

  it("rejects obvious junk pages", () => {
    expect(
      looksLikeJunkEventPage(
        "LinkedIn에 지금 가입하세요. 회원 가입은 무료입니다.",
        "https://www.linkedin.com/signup/cold-join",
        null,
        null,
      ),
    ).toBe(true);
    expect(
      looksLikeJunkEventPage(
        "예정된 개발자 이벤트 및 컨퍼런스 - 개발자를 위한 Google | Google for Developers",
        "https://developers.google.com/events?hl=ko",
        null,
        null,
      ),
    ).toBe(true);
  });
});
