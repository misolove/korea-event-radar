import type { ExtractedEventDraft } from "@/ingestion/types";
import {
  bodyText,
  discoverKnownEventLinks,
  extractOrganizerName,
  extractLocationInfo,
  extractStructuredEvent,
  parseHtml,
  parseIsoLikeDate,
  pickMeta,
} from "@/ingestion/extractors/common";

export function discoverLumaLinks(url: string, html: string) {
  return discoverKnownEventLinks(url, html).filter((candidate) => candidate.includes("luma.com"));
}

export function extractLuma(url: string, html: string, discoveredFromUrl: string | null): ExtractedEventDraft | null {
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

  const location = extractLocationInfo(
    structured,
    text.match(/(Seoul|서울|Busan|부산|Pangyo|판교|YouTube|LinkedIn livestream|Virtual)[^\n]{0,80}/i)?.[0] ?? null,
  );

  return {
    title,
    summary:
      $("meta[property='og:description']").attr("content") ??
      String(structured?.description ?? "").trim() ??
      null,
    organizer:
      $("body").text().match(/Presented by\s*([^\n]+)/i)?.[1]?.trim() ??
      extractOrganizerName(structured?.organizer),
    primarySource: "Luma",
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
        sourceName: "Luma",
        sourceUrl: url,
        discoveredFromUrl,
        extractedTitle: title,
        extractedStatusText: text.match(/(Sold Out|Waitlist|Register|Past Event)/i)?.[0] ?? null,
        extractedPriceText: text.match(/(complimentary|무료|free)/i)?.[0] ?? null,
        extractedLocationText: location.locationText,
        extractedStartText: text.match(/(\d{1,2}:\d{2}\s*[AP]M[^]+?)/i)?.[0] ?? null,
        registrationUrl: url,
        registrationStatus: "unknown",
        statusOrigin: "direct",
        priceType: "unknown",
        confidenceScore: 78,
        payload: { structured },
      },
    ],
    rawText: text,
  };
}
