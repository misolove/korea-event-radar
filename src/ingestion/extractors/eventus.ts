import type { ExtractedEventDraft } from "@/ingestion/types";
import {
  bodyText,
  discoverKnownEventLinks,
  extractOrganizerName,
  extractYearHint,
  extractLocationInfo,
  extractStructuredEvent,
  parseHtml,
  parseIsoLikeDate,
  parseKoreanDateRange,
  pickSafeRegistrationUrl,
  pickMeta,
} from "@/ingestion/extractors/common";

// ── EventUs 공개 검색 API를 이용한 이벤트 발굴 ───────────────────
// api.event-us.kr/api/v1/engine/suggest 는 인증 없이 접근 가능
const EVENTUS_SEARCH_QUERIES = ["AI 세미나", "클라우드", "개발자", "데이터", "스타트업", "IT 밋업"];
const EVENTUS_API = "https://api.event-us.kr/api/v1/engine/suggest";

export async function discoverEventUsViaApi(): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const query of EVENTUS_SEARCH_QUERIES) {
    try {
      const res = await fetch(
        `${EVENTUS_API}?query=${encodeURIComponent(query)}&size=20`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json() as { results?: Array<{ id?: { raw?: string } }> };
      for (const item of data.results ?? []) {
        const id = item.id?.raw;
        if (id && !seen.has(id)) {
          seen.add(id);
          urls.push(`https://event-us.kr/event/${id}`);
        }
      }
    } catch {
      // 개별 쿼리 실패 시 스킵
    }
    // API 과부하 방지
    await new Promise(r => setTimeout(r, 300));
  }

  return urls;
}

export function discoverEventUsLinks(url: string, html: string) {
  return discoverKnownEventLinks(url, html).filter((candidate) => candidate.includes("event-us.kr"));
}

export function extractEventUs(url: string, html: string, discoveredFromUrl: string | null): ExtractedEventDraft | null {
  const $ = parseHtml(html);
  const text = bodyText(html);
  const structured = extractStructuredEvent(html) as Record<string, unknown> | undefined;
  const title =
    $("h1").first().text().trim() ||
    pickMeta(html, ["meta[property='og:title']", "title"]) ||
    String(structured?.name ?? "").trim();

  if (!title) {
    return null;
  }

  const statusText =
    text.match(/(모집중\s*Now Open|모집마감\s*Application Closed|신청하기\(외부\)|신청하기)/i)?.[0] ??
    null;
  const priceText = text.match(/(무료\s*Free|유료|Paid)/i)?.[0] ?? null;
  const locationText = text.match(/장소\s*Location\s*([^]+?)스트리밍|장소\s*Location\s*([^]+?)문의/s)?.[0] ?? null;
  const dateText = text.match(/일시\s*Date\s*([^]+?)신청\s*Apply/s)?.[0] ?? null;
  const externalRegistrationUrl = pickSafeRegistrationUrl(
    url,
    $("a")
      .filter((_, element) => $(element).text().includes("신청하기"))
      .map((_, element) => $(element).attr("href") ?? "")
      .get(),
  );
  const yearHint = extractYearHint(
    title,
    $("meta[property='og:description']").attr("content"),
    String(structured?.description ?? ""),
    dateText,
  );
  const dateRange = parseKoreanDateRange(dateText ?? text, { yearHint });
  const location = extractLocationInfo(structured, locationText);

  return {
    title,
    summary:
      $("meta[property='og:description']").attr("content") ??
      String(structured?.description ?? "").trim() ??
      null,
    organizer:
      $("a")
        .filter((_, element) => $(element).text().trim().length > 1)
        .slice(0, 1)
        .text()
        .trim() || extractOrganizerName(structured?.organizer),
    primarySource: "EventUs",
    primarySourceUrl: url,
    registrationUrl: externalRegistrationUrl,
    city: location.city,
    venueName: location.venueName,
    startsAt: parseIsoLikeDate(String(structured?.startDate ?? "")) ?? dateRange.startsAt,
    endsAt: parseIsoLikeDate(String(structured?.endDate ?? "")) ?? dateRange.endsAt,
    registrationDeadline: dateRange.endsAt,
    topicTags: [],
    evidence: [
      {
        sourceKind: "platform",
        sourceName: "EventUs",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: statusText,
        extractedPriceText: priceText,
        extractedLocationText: location.locationText,
        extractedStartText: dateText,
        registrationUrl: externalRegistrationUrl,
        registrationStatus: "unknown",
        statusOrigin: "direct",
        priceType: "unknown",
        confidenceScore: 82,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
