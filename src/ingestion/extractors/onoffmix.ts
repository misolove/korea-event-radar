import type { ExtractedEventDraft } from "@/ingestion/types";
import {
  bodyText,
  discoverKnownEventLinks,
  extractLocationInfo,
  extractStructuredEvent,
  parseHtml,
  parseIsoLikeDate,
  pickMeta,
} from "@/ingestion/extractors/common";

// ── OnOffMix IT 관련 카테고리 ────────────────────────────────────
// 101: 교육/워크숍, 102: 강연/세미나, 104: 컨퍼런스/포럼
const ONOFFMIX_IT_CATEGORIES = [101, 102, 104];
const ONOFFMIX_BASE = "https://onoffmix.com";

export async function discoverOnOffMixViaCategories(): Promise<string[]> {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const cat of ONOFFMIX_IT_CATEGORIES) {
    try {
      const res = await fetch(`${ONOFFMIX_BASE}/event/main/?c=${cat}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const matches = html.match(/href="\/event\/(\d+)"/g) ?? [];
      for (const m of matches) {
        const id = m.match(/(\d+)/)?.[1];
        if (id && !seen.has(id)) {
          seen.add(id);
          urls.push(`${ONOFFMIX_BASE}/event/${id}`);
        }
      }
    } catch {
      // 카테고리 실패 시 스킵
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return urls;
}

export function discoverOnOffMixLinks(url: string, html: string) {
  return discoverKnownEventLinks(url, html).filter((candidate) => candidate.includes("onoffmix.com"));
}

export function extractOnOffMix(
  url: string,
  html: string,
  discoveredFromUrl: string | null,
): ExtractedEventDraft | null {
  const $ = parseHtml(html);
  const text = bodyText(html);

  // JSON-LD structured data 우선 사용 (OnOffMix는 항상 Event JSON-LD 제공)
  const structured = extractStructuredEvent(html) as Record<string, unknown> | undefined;

  const title =
    $("h1").first().text().trim() ||
    pickMeta(html, ["meta[property='og:title']", "title"]) ||
    String(structured?.name ?? "").trim();

  if (!title) return null;

  // ── 날짜: JSON-LD startDate 최우선, 형식: "2026-05-26 09:00:00+09:00"
  const structuredStart = String(structured?.startDate ?? "").trim();
  const structuredEnd = String(structured?.endDate ?? "").trim();
  const startsAt = parseIsoLikeDate(structuredStart) ?? null;
  const endsAt = parseIsoLikeDate(structuredEnd) ?? null;

  // ── 위치: JSON-LD location 우선
  const location = extractLocationInfo(structured, null);

  // ── 가격: JSON-LD offers 우선 (price=0 → free, price>0 → paid)
  const offersRaw = structured?.offers as Record<string, unknown> | undefined;
  const price = offersRaw?.price;
  const priceType: "free" | "paid" | "unknown" =
    price !== undefined
      ? (Number(price) === 0 ? "free" : "paid")
      : "unknown";
  const priceText = price !== undefined
    ? (Number(price) === 0 ? "무료" : `${Number(price).toLocaleString()}원`)
    : (text.match(/(무료|유료|\d[\d,]+\s*원)/i)?.[0] ?? null);

  // ── 상태
  const statusText =
    text.match(/(접수중|접수마감|모집중|모집마감|신청가능|신청마감|마감|sold out)/i)?.[0] ?? null;

  return {
    title,
    summary:
      ($("meta[property='og:description']").attr("content") ??
      String(structured?.description ?? "").trim()) ||
      null,
    organizer:
      (structured?.organizer as Record<string, unknown>)?.name as string | null ??
      $("body").text().match(/주최[^가-힣A-Za-z0-9]*([^\n]+)/)?.[1]?.trim() ??
      null,
    primarySource: "OnOffMix",
    primarySourceUrl: url,
    registrationUrl: url,
    city: location.city,
    venueName: location.venueName,
    startsAt,
    endsAt,
    priceType,
    priceText,
    topicTags: [],
    evidence: [
      {
        sourceKind: "platform",
        sourceName: "OnOffMix",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: statusText,
        extractedPriceText: priceText,
        extractedLocationText: location.locationText,
        extractedStartText: structuredStart || null,
        registrationUrl: url,
        registrationStatus: "unknown",
        statusOrigin: "direct",
        priceType,
        confidenceScore: 78,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
