import type { DiscoveredCandidate, ExtractedEventDraft, SourceSeed } from "@/ingestion/types";
import { buildAbsoluteUrl, parseHtml } from "@/ingestion/extractors/common";
import { normalizeWhitespace, normalizeUrl } from "@/lib/text";

const FASTCAMPUS_LIST_URL = "https://fastcampus.co.kr/openseminar_new";
const FASTCAMPUS_CARD_PAYLOAD_KEY = "fastcampusCard";

export type FastCampusSeminarCard = {
  title: string;
  contentHtml: string;
  contentText: string;
  registrationUrl: string;
  detailUrl: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  dateText: string | null;
  deliveryType: "online" | "offline" | "hybrid" | "unknown";
};

type FastCampusValues = {
  title?: unknown;
  content?: unknown;
  imageUrl?: unknown;
};

function extractNextFlightPayload(html: string) {
  const chunks: string[] = [];

  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const script = match[1].trim();
    const pushCall = script.match(/^self\.__next_f\.push\((.*)\)$/s);
    if (!pushCall) {
      continue;
    }

    try {
      const parsed = JSON.parse(pushCall[1]) as [unknown, unknown];
      if (typeof parsed[1] === "string") {
        chunks.push(parsed[1]);
      }
    } catch {
      continue;
    }
  }

  return chunks.join("");
}

function extractTextRecords(flightPayload: string) {
  const records = new Map<string, string>();

  for (const match of flightPayload.matchAll(/([0-9a-z]+):T([0-9a-f]+),/g)) {
    const start = (match.index ?? 0) + match[0].length;
    const length = Number.parseInt(match[2], 16);
    if (Number.isFinite(length) && length > 0) {
      records.set(match[1], flightPayload.slice(start, start + length));
    }
  }

  return records;
}

function extractValues(flightPayload: string): FastCampusValues[] {
  const values: FastCampusValues[] = [];
  const valuesPattern = /"values":(\{(?:"(?:\\.|[^"\\])*"|[^{}])*\}),"meta":/g;

  for (const match of flightPayload.matchAll(valuesPattern)) {
    try {
      values.push(JSON.parse(match[1]) as FastCampusValues);
    } catch {
      continue;
    }
  }

  return values;
}

function htmlToText(fragment: string) {
  return normalizeWhitespace(parseHtml(fragment).root().text());
}

function resolveContent(value: string, textRecords: Map<string, string>) {
  const ref = value.match(/^\$([0-9a-z]+)$/);
  return ref ? textRecords.get(ref[1]) ?? null : value;
}

function parseFastCampusStartDate(text: string) {
  const match = text.match(/(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2}).{0,50}?(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const startsAt = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+09:00`,
  );
  return Number.isNaN(startsAt.getTime()) ? null : startsAt;
}

function extractFastCampusDateText(text: string) {
  return (
    text.match(/20\d{2}\.\s*\d{1,2}\.\s*\d{1,2}.{0,70}?(?:온라인|오프라인|온\/오프라인)?\s*세미나/)?.[0] ??
    text.match(/20\d{2}\.\s*\d{1,2}\.\s*\d{1,2}.{0,50}?\d{1,2}:\d{2}/)?.[0] ??
    null
  );
}

function detectDeliveryType(text: string): FastCampusSeminarCard["deliveryType"] {
  const hasOnline = /온라인|online/i.test(text);
  const hasOffline = /오프라인|온\/오프라인|강남|서울/i.test(text);

  if (/온\/오프라인/.test(text) || (hasOnline && hasOffline)) {
    return "hybrid";
  }
  if (hasOnline) {
    return "online";
  }
  if (hasOffline) {
    return "offline";
  }
  return "unknown";
}

function formatVenueName(deliveryType: FastCampusSeminarCard["deliveryType"]) {
  if (deliveryType === "hybrid") {
    return "온라인 / 오프라인 세미나";
  }
  if (deliveryType === "offline") {
    return "오프라인 세미나";
  }
  return "온라인 세미나";
}

function extractCardLinks(baseUrl: string, contentHtml: string) {
  const $ = parseHtml(contentHtml);
  let registrationUrl: string | null = null;
  let detailUrl: string | null = null;

  $("a[href]").each((_, element) => {
    const label = normalizeWhitespace($(element).text());
    const href = buildAbsoluteUrl(baseUrl, $(element).attr("href") ?? "");
    if (!href) {
      return;
    }

    if (!registrationUrl && /무료\s*세미나\s*신청|신청하기/.test(label)) {
      registrationUrl = href;
    }
    if (!detailUrl && /세부\s*내용|자세히|상세/.test(label)) {
      detailUrl = href;
    }
  });

  return { registrationUrl: normalizeUrl(registrationUrl), detailUrl: normalizeUrl(detailUrl) };
}

export function discoverFastCampusCards(baseUrl: string, html: string): FastCampusSeminarCard[] {
  const flightPayload = extractNextFlightPayload(html);
  if (!flightPayload) {
    return [];
  }

  const textRecords = extractTextRecords(flightPayload);
  const cards = extractValues(flightPayload)
    .map((values): FastCampusSeminarCard | null => {
      if (typeof values.title !== "string" || typeof values.content !== "string") {
        return null;
      }

      const contentHtml = resolveContent(values.content, textRecords);
      if (!contentHtml || !contentHtml.includes("무료 세미나 신청하기")) {
        return null;
      }

      const { registrationUrl, detailUrl } = extractCardLinks(baseUrl, contentHtml);
      if (!registrationUrl) {
        return null;
      }

      const title = htmlToText(values.title);
      const contentText = htmlToText(contentHtml);
      const dateText = extractFastCampusDateText(contentText);

      return {
        title,
        contentHtml,
        contentText,
        registrationUrl,
        detailUrl,
        imageUrl: typeof values.imageUrl === "string" ? values.imageUrl : null,
        startsAt: parseFastCampusStartDate(contentText),
        dateText,
        deliveryType: detectDeliveryType(contentText),
      };
    })
    .filter((card): card is FastCampusSeminarCard => Boolean(card));

  const byUrl = new Map<string, FastCampusSeminarCard>();
  for (const card of cards) {
    byUrl.set(card.detailUrl ?? card.registrationUrl, card);
  }

  return [...byUrl.values()];
}

export function discoverFastCampusCandidates(seed: SourceSeed, html: string): DiscoveredCandidate[] {
  return discoverFastCampusCards(seed.url, html).map((card) => ({
    url: card.detailUrl ?? card.registrationUrl,
    sourceName: seed.sourceName,
    sourceKind: seed.sourceKind,
    discoveredFromUrl: seed.url,
    payload: {
      [FASTCAMPUS_CARD_PAYLOAD_KEY]: card,
    },
  }));
}

export function readFastCampusCardPayload(candidate: DiscoveredCandidate) {
  const card = candidate.payload?.[FASTCAMPUS_CARD_PAYLOAD_KEY];
  if (!card || typeof card !== "object") {
    return null;
  }
  return card as FastCampusSeminarCard;
}

export function extractFastCampusCard(
  card: FastCampusSeminarCard,
  discoveredFromUrl: string | null = FASTCAMPUS_LIST_URL,
): ExtractedEventDraft {
  const summary = card.contentText
    .replace(card.dateText ?? "", "")
    .replace(/무료\s*세미나\s*신청하기/g, "")
    .replace(/세부\s*내용\s*확인하기/g, "")
    .trim();
  const venueName = formatVenueName(card.deliveryType);

  return {
    title: card.title,
    summary: summary || null,
    organizer: "패스트캠퍼스",
    primarySource: "FastCampus",
    primarySourceUrl: card.detailUrl ?? card.registrationUrl,
    registrationUrl: card.registrationUrl,
    city: "서울",
    venueName,
    startsAt: card.startsAt,
    registrationStatus: "open",
    statusOrigin: "direct",
    priceType: "free",
    priceText: "무료",
    eventKind: "seminar",
    deliveryType: card.deliveryType,
    topicTags: ["패스트캠퍼스"],
    confidenceScore: card.startsAt ? 90 : 78,
    evidence: [
      {
        sourceKind: "official",
        sourceName: "FastCampus",
        sourceUrl: card.detailUrl ?? card.registrationUrl,
        discoveredFromUrl,
        extractedTitle: card.title,
        extractedStatusText: "무료 세미나 신청하기",
        extractedPriceText: "무료",
        extractedLocationText: venueName,
        extractedStartText: card.dateText,
        registrationUrl: card.registrationUrl,
        registrationStatus: "open",
        statusOrigin: "direct",
        priceType: "free",
        confidenceScore: card.startsAt ? 88 : 76,
        payload: {
          contentText: card.contentText,
          imageUrl: card.imageUrl,
        },
      },
    ],
    rawText: card.contentText,
  };
}
