import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractEventUs } from "@/ingestion/extractors/eventus";
import { discoverFastCampusCards, extractFastCampusCard } from "@/ingestion/extractors/fastcampus";
import { extractLuma } from "@/ingestion/extractors/luma";
import { extractMeetup } from "@/ingestion/extractors/meetup";
import { extractOnOffMix } from "@/ingestion/extractors/onoffmix";
import { normalizeExtractedEvent } from "@/ingestion/normalize";

function fixture(name: string) {
  return fs.readFileSync(path.resolve(__dirname, "fixtures", name), "utf8");
}

describe("domain extractors", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00+09:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

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

  it("extracts FastCampus open seminar cards from Next flight payload", () => {
    const contentHtml =
      '<span class="align-icon"><span class="fc-h6">2099. 06. 16(화) 20:00 온라인 세미나</span></span>' +
      '<a href="https://fastcampus.co.kr/products/650226"><span>무료 세미나 신청하기</span></a>' +
      '<a href="https://fastcampus.co.kr/open_sem_vibeplaybook"><b>세부 내용 확인하기</b></a>' +
      "<span><b>1부</b> 바이브코딩으로 프로토타입 제작 및 검증하기</span>";
    const flightPayload = [
      `39:T${contentHtml.length.toString(16)},${contentHtml}`,
      `10:[{"values":{"title":"<span>90분 바이브코딩 라이브 플레이북 : 프로토타입 & MVP 제작 및 개선</span>","content":"$39","imageUrl":"https://cdn.example.com/thumb.png"},"meta":{"hidden":true},"hidden":true,"layout":"206"}]`,
    ].join("");
    const html = `<script>self.__next_f.push(${JSON.stringify([1, flightPayload])})</script>`;

    const cards = discoverFastCampusCards("https://fastcampus.co.kr/openseminar_new", html);
    expect(cards).toHaveLength(1);
    expect(cards[0].registrationUrl).toBe("https://fastcampus.co.kr/products/650226");
    expect(cards[0].detailUrl).toBe("https://fastcampus.co.kr/open_sem_vibeplaybook");

    const normalized = normalizeExtractedEvent(
      extractFastCampusCard(cards[0], "https://fastcampus.co.kr/openseminar_new"),
    );
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
    expect(normalized?.deliveryType).toBe("online");
    expect(normalized?.startsAt?.toISOString()).toBe("2099-06-16T11:00:00.000Z");
  });
});
