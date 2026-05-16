import type { ExtractedEventDraft } from "@/ingestion/types";
import {
  bodyText,
  discoverKnownEventLinks,
  extractOrganizerName,
  extractLocationInfo,
  extractStructuredEvent,
  parseHtml,
  parseIsoLikeDate,
  pickSafeRegistrationUrl,
  pickMeta,
} from "@/ingestion/extractors/common";

export function discoverMeetupLinks(url: string, html: string) {
  return discoverKnownEventLinks(url, html).filter((candidate) => candidate.includes("meetup.com"));
}

export function extractMeetup(url: string, html: string, discoveredFromUrl: string | null): ExtractedEventDraft | null {
  const $ = parseHtml(html);
  const text = bodyText(html);
  const structured = extractStructuredEvent(html) as Record<string, unknown> | undefined;
  const title =
    $("h1").first().text().trim() ||
    pickMeta(html, ["meta[property='og:title']", "title"]) ||
    String(structured?.name ?? "");

  if (!title) {
    return null;
  }

  const hrefs = $("a")
    .map((_, element) => $(element).attr("href") ?? "")
    .get();
  const externalRegistrationUrl = pickSafeRegistrationUrl(url, [
    hrefs.find((href) => /forms\.gle|docs\.google\.com\/forms/i.test(href)) ?? null,
    hrefs.find((href) => /eventbrite/i.test(href)) ?? null,
    hrefs.find((href) => /lu\.ma|luma/i.test(href)) ?? null,
  ]);

  const locationText = $("body")
    .text()
    .match(/Microsoft Korea Office|Google for Startups Campus|서울|판교|Busan|KST/gi)
    ?.join(" ") ?? null;
  const location = extractLocationInfo(structured, locationText);

  const startText =
    text.match(/(\d{1,2}월\s*\d{1,2}일[^]+?KST)/)?.[0] ??
    text.match(/(Saturday,[^]+?PM)/)?.[0] ??
    null;

  // ── 가격: JSON-LD __APOLLO_STATE__ 에서 feeSettings 파싱
  // feeSettings: null → 무료, feeSettings: {...amount:N} → N원 유료
  const apolloMatch = html.match(/"feeSettings":(null|\{[^}]*\})/);
  const feeRaw = apolloMatch?.[1];
  const feeAmount = feeRaw && feeRaw !== "null"
    ? (feeRaw.match(/"amount":(\d+)/) ? parseInt(feeRaw.match(/"amount":(\d+)/)![1], 10) : null)
    : null;
  const priceType: "free" | "paid" | "unknown" =
    feeRaw === "null" ? "free"
    : feeRaw ? "paid"
    : "unknown";
  // 금액 정보를 priceText에 포함 → normalize.ts의 2만원 로직이 금액 파싱 가능
  const priceText = priceType === "free" ? "무료"
    : feeAmount !== null ? `${feeAmount.toLocaleString()}원`
    : "유료";

  return {
    title,
    summary:
      $("meta[property='og:description']").attr("content") ??
      String(structured?.description ?? "").trim() ??
      null,
    organizer: $("a[href*='codeseoul']").first().text().trim() || extractOrganizerName(structured?.organizer),
    primarySource: "Meetup",
    primarySourceUrl: url,
    registrationUrl: externalRegistrationUrl,
    city: location.city,
    venueName: location.venueName,
    startsAt: parseIsoLikeDate(String(structured?.startDate ?? "")),
    endsAt: parseIsoLikeDate(String(structured?.endDate ?? "")),
    registrationDeadline: parseIsoLikeDate(String(structured?.eventAttendanceMode ?? "")),
    priceType,
    priceText,
    topicTags: [],
    evidence: [
      {
        sourceKind: "platform",
        sourceName: "Meetup",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: text.match(/(응답하세요|RSVP|register)/i)?.[0] ?? null,
        extractedPriceText: priceText,
        extractedLocationText: location.locationText,
        extractedStartText: startText,
        registrationUrl: externalRegistrationUrl,
        registrationStatus: "unknown",
        statusOrigin: "direct",
        priceType,
        confidenceScore: 80,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
