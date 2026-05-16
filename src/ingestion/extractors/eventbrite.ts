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

export function discoverEventbriteLinks(url: string, html: string) {
  return discoverKnownEventLinks(url, html).filter((u) => u.includes("eventbrite.com/e/"));
}

export function extractEventbrite(
  url: string,
  html: string,
  discoveredFromUrl: string | null,
): ExtractedEventDraft | null {
  const $ = parseHtml(html);
  const text = bodyText(html);
  const structured = extractStructuredEvent(html) as Record<string, unknown> | undefined;

  const title =
    pickMeta(html, ["meta[property='og:title']"]) ||
    $("h1").first().text().trim() ||
    String(structured?.name ?? "");

  if (!title) return null;

  const description =
    pickMeta(html, ["meta[property='og:description']"]) ||
    String(structured?.description ?? "").trim() ||
    null;

  const location = extractLocationInfo(
    structured,
    text.match(/(Seoul|서울|Busan|부산|Daejeon|대전|Pangyo|판교|KAIST)[^\n]{0,80}/i)?.[0] ?? null,
  );

  const priceText = text.match(/(free|무료|\$0|complimentary)/i)?.[0] ?? null;
  const isFree = /free|무료|\$0/i.test(priceText ?? "");

  const statusText = text.match(/(Sold Out|Register|Get Tickets|Check-in|Waitlist)/i)?.[0] ?? null;
  const isSoldOut = /sold out/i.test(statusText ?? "");

  return {
    title,
    summary: description,
    organizer: String((structured?.organizer as Record<string, unknown>)?.name ?? structured?.organizer ?? "").trim() || null,
    primarySource: "Eventbrite",
    primarySourceUrl: url,
    registrationUrl: url,
    city: location.city,
    venueName: location.venueName,
    startsAt: parseIsoLikeDate(String(structured?.startDate ?? "")),
    endsAt: parseIsoLikeDate(String(structured?.endDate ?? "")),
    topicTags: [],
    evidence: [
      {
        sourceKind: "platform",
        sourceName: "Eventbrite",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: statusText,
        extractedPriceText: priceText,
        extractedLocationText: location.locationText,
        extractedStartText: String(structured?.startDate ?? ""),
        registrationUrl: url,
        registrationStatus: isSoldOut ? "closed" : "open",
        statusOrigin: "direct",
        priceType: isFree ? "free" : "unknown",
        confidenceScore: 80,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
