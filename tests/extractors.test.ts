import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractEventUs } from "@/ingestion/extractors/eventus";
import { discoverFastCampusCards, extractFastCampusCard } from "@/ingestion/extractors/fastcampus";
import { extractLuma } from "@/ingestion/extractors/luma";
import { extractMeetup } from "@/ingestion/extractors/meetup";
import { extractOnOffMix } from "@/ingestion/extractors/onoffmix";
import { discoverTicketa, extractTicketa } from "@/ingestion/extractors/ticketa";
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
    expect(normalized?.organizer).toBe("더조은컴퓨터아카데미");
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

  it("extracts FastCampus open seminar cards via dynamic API", async () => {
    const html = '<div data-course-id="264090"></div>';
    
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(".api/courses/products")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              "264090": [
                {
                  id: 821746,
                  courseId: 264090,
                  title: "[무료 세미나] Claude Code 5월 최신 기능 뽀개기",
                  description: "📢 세미나 일정은 2099. 06. 16(화) 20:00 온라인 세미나이며...",
                }
              ]
            }
          }),
        };
      }
      if (url.includes(".api/courses")) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 264090,
                state: "READY",
                slug: "event_online_claudecode0526",
                publicTitle: "[무료 세미나] Claude Code 5월 최신 기능 뽀개기",
                desktopCardAsset: "https://cdn.example.com/thumb.png",
              }
            ]
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal("fetch", fetchMock);

    const cards = await discoverFastCampusCards("https://fastcampus.co.kr/openseminar_new", html);
    expect(cards).toHaveLength(1);
    expect(cards[0].registrationUrl).toBe("https://fastcampus.co.kr/event_online_claudecode0526");
    expect(cards[0].detailUrl).toBe("https://fastcampus.co.kr/event_online_claudecode0526");

    const normalized = normalizeExtractedEvent(
      extractFastCampusCard(cards[0], "https://fastcampus.co.kr/openseminar_new"),
    );
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
    expect(normalized?.deliveryType).toBe("online");
    expect(normalized?.startsAt?.toISOString()).toBe("2099-06-16T11:00:00.000Z");

    vi.unstubAllGlobals();
  });

  it("falls back to publicNotice and openAt for FastCampus dates", async () => {
    const html = '<div data-course-id="264974"></div><div data-course-id="263403"></div>';

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(".api/courses/products")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              "264974": [{ id: 1, courseId: 264974, description: "온라인 세미나 안내" }],
              "263403": [{ id: 2, courseId: 263403, description: "온라인 세미나 안내" }],
            },
          }),
        };
      }
      if (url.includes(".api/courses")) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 264974,
                state: "ONGOING",
                slug: null,
                publicTitle: "[무료 세미나] 공지에만 일정이 있는 세미나",
                publicNotice:
                  "【실시간 세미나 안내】\n– 세미나 일정은 2099년 7월 3일 (금) 19:00 ~ 20:30이며, 당일 안내드립니다.",
                openAt: "2099-07-02T15:00:00.000Z",
              },
              {
                id: 263403,
                state: "ONGOING",
                slug: null,
                publicTitle: "[무료 세미나] openAt만 있는 세미나",
                publicNotice: "ZOOM으로 진행됩니다.",
                openAt: "2099-05-05T15:00:00.000Z",
              },
            ],
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    vi.stubGlobal("fetch", fetchMock);

    const cards = await discoverFastCampusCards("https://fastcampus.co.kr/openseminar_new", html);
    expect(cards).toHaveLength(2);

    const noticeCard = cards.find((card) => card.title.includes("공지에만"));
    expect(noticeCard?.startsAt?.toISOString()).toBe("2099-07-03T10:00:00.000Z");

    const openAtCard = cards.find((card) => card.title.includes("openAt만"));
    expect(openAtCard?.startsAt?.toISOString()).toBe("2099-05-05T15:00:00.000Z");

    vi.unstubAllGlobals();
  });

  it("discovers Ticketa events via Supabase API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "871axvkx" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = await discoverTicketa(
      {
        id: "ticketa-home",
        label: "Ticketa 홈",
        url: "https://ticketa.co",
        sourceName: "Ticketa",
        sourceKind: "platform",
        mode: "list-page",
      },
      "",
    );

    expect(urls).toEqual(["https://ticketa.co/event/871axvkx"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vlizxsubseudvtswwsjd.supabase.co/rest/v1/single_events?select=id&status=eq.PUBLIC",
      expect.any(Object),
    );
    vi.unstubAllGlobals();
  });

  it("extracts Ticketa event details via Supabase API", async () => {
    const mockEvent = {
      id: "871axvkx",
      title: "테스트 Golang 세미나",
      description: "Golang 관련 기술 세미나입니다.",
      image_url: "https://cdn.example.com/image.png",
      start_date: "2026-04-16T09:00:00+00:00",
      end_date: "2026-04-16T13:00:00+00:00",
      status: "PUBLIC",
      venues: {
        id: 88,
        place_name: "포스트매스",
        place_detail: "1005호",
        address: "서울 구로구 디지털로 272",
        district: "구로구",
        province: "서울",
      },
      organizations: {
        id: "khkxupxsed",
        name: "Golang Korea",
      },
      ticket_types: [
        {
          id: 186,
          name: "일반티켓",
          price: 0,
          open_at: "2026-03-04T12:39:00+00:00",
          close_at: "2026-04-16T10:59:00+00:00",
          sold_count: 5,
          total_count: 10,
          visibility: "PUBLIC",
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockEvent],
    });
    vi.stubGlobal("fetch", fetchMock);

    const extracted = await extractTicketa("https://ticketa.co/event/871axvkx", "", null);
    expect(extracted).not.toBeNull();
    
    const normalized = normalizeExtractedEvent(extracted!);
    expect(normalized?.title).toBe("테스트 Golang 세미나");
    expect(normalized?.organizer).toBe("Golang Korea");
    expect(normalized?.city).toBe("서울");
    expect(normalized?.venueName).toBe("포스트매스 1005호");
    expect(normalized?.registrationStatus).toBe("open");
    expect(normalized?.priceType).toBe("free");
    expect(normalized?.priceText).toBe("일반티켓: 무료");
    expect(normalized?.startsAt?.toISOString()).toBe("2026-04-16T09:00:00.000Z");

    vi.unstubAllGlobals();
  });
});
