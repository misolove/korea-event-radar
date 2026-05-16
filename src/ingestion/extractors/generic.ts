import type { ExtractedEventDraft } from "@/ingestion/types";
import type { SourceKind } from "@/lib/event-model";
import {
  bodyText,
  discoverKnownEventLinks,
  discoverRegistrationLinks,
  extractOrganizerName,
  extractLocationInfo,
  extractStructuredEvent,
  looksLikeJunkEventPage,
  parseDateTimeRangeText,
  parseHtml,
  parseIsoLikeDate,
  pickSafeRegistrationUrl,
  pickMeta,
} from "@/ingestion/extractors/common";

export function discoverGenericLinks(url: string, html: string) {
  return [...new Set([...discoverKnownEventLinks(url, html), ...discoverRegistrationLinks(url, html)])];
}

export function extractGeneric(
  url: string,
  html: string,
  sourceName: string,
  sourceKind: SourceKind,
  discoveredFromUrl: string | null,
): ExtractedEventDraft | null {
  const $ = parseHtml(html);
  const text = bodyText(html);
  const structured = extractStructuredEvent(html) as Record<string, unknown> | undefined;
  const title = $("h1").first().text().trim() || pickMeta(html, ["meta[property='og:title']", "title"]);
  if (!title) {
    return null;
  }

  const registrationUrl = pickSafeRegistrationUrl(
    url,
    $("a")
      .map((_, element) => $(element).attr("href") ?? "")
      .get()
      .filter((href) => /register|tickets|apply|rsvp|eventbrite|ticketa|event-us|meetup|lu\.ma|luma|행사|세미나|신청|예매/i.test(href)),
  );

  const parsedRange = parseDateTimeRangeText(
    [
      $("meta[property='og:description']").attr("content") ?? "",
      title,
      text,
    ].join(" "),
  );
  const location = extractLocationInfo(
    structured,
    title,
    $("meta[property='og:description']").attr("content") ?? null,
    text.match(/(부산|Busan|서울|Seoul|판교|Pangyo|대전|Daejeon|광주|Gwangju)[^\n]{0,80}/)?.[0] ?? null,
  );

  if (looksLikeJunkEventPage(title, url, parseIsoLikeDate(String(structured?.startDate ?? "")) ?? parsedRange.startsAt, parseIsoLikeDate(String(structured?.endDate ?? "")) ?? parsedRange.endsAt)) {
    return null;
  }

  return {
    title,
    summary:
      $("meta[property='og:description']").attr("content") ??
      String(structured?.description ?? "").trim() ??
      null,
    organizer: extractOrganizerName(structured?.organizer) ?? sourceName,
    primarySource: sourceName,
    primarySourceUrl: url,
    registrationUrl,
    city: location.city,
    venueName: location.venueName,
    startsAt: parseIsoLikeDate(String(structured?.startDate ?? "")) ?? parsedRange.startsAt,
    endsAt: parseIsoLikeDate(String(structured?.endDate ?? "")) ?? parsedRange.endsAt,
    topicTags: [],
    evidence: [
      {
        sourceKind,
        sourceName,
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: text.match(/(register|모집중|접수중|sold out|waitlist|application closed)/i)?.[0] ?? null,
        extractedPriceText: text.match(/(무료|free|paid|유료|원)/i)?.[0] ?? null,
        extractedLocationText: location.locationText,
        extractedStartText: text.match(/(\d{4}[./년]\s*\d{1,2}[./월]\s*\d{1,2}일?[^\n]{0,32})/)?.[0] ?? null,
        registrationUrl,
        registrationStatus: "unknown",
        statusOrigin: "inferred",
        priceType: "unknown",
        confidenceScore: 55,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
