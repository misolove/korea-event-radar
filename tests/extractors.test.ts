import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractEventUs } from "@/ingestion/extractors/eventus";
import { extractLuma } from "@/ingestion/extractors/luma";
import { extractMeetup } from "@/ingestion/extractors/meetup";
import { extractOnOffMix } from "@/ingestion/extractors/onoffmix";
import { normalizeExtractedEvent } from "@/ingestion/normalize";

function fixture(name: string) {
  return fs.readFileSync(path.resolve(__dirname, "fixtures", name), "utf8");
}

describe("domain extractors", () => {
  it("extracts EventUs open + free", () => {
    const normalized = normalizeExtractedEvent(
      extractEventUs("https://event-us.kr/tjoeunis/event/112077", fixture("eventus-open.html"), null)!,
    );
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
  });

  it("extracts Meetup open + free", () => {
    const normalized = normalizeExtractedEvent(
      extractMeetup(
        "https://www.meetup.com/ko-kr/codeseoul/events/314084114/",
        fixture("meetup-open.html"),
        null,
      )!,
    );
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
  });

  it("extracts Luma waitlist", () => {
    const normalized = normalizeExtractedEvent(
      extractLuma("https://luma.com/uab13j1b", fixture("luma-waitlist.html"), null)!,
    );
    expect(normalized?.registrationStatus).toBe("waitlist");
  });

  it("extracts OnOffMix closed", () => {
    const normalized = normalizeExtractedEvent(
      extractOnOffMix("https://onoffmix.com/event/31059", fixture("onoffmix-closed.html"), null)!,
    );
    expect(normalized?.registrationStatus).toBe("closed");
  });
});
