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
  let pos = 0;

  while (true) {
    const idx = flightPayload.indexOf('"values":{', pos);
    if (idx === -1) {
      break;
    }

    const start = idx + '"values":'.length;
    let depth = 0;
    let inStr = false;
    let escape = false;
    let end = start;

    for (let i = start; i < flightPayload.length; i++) {
      const ch = flightPayload[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (!inStr) {
        if (ch === "{") {
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }

    if (depth === 0 && end > start) {
      try {
        const chunk = flightPayload.slice(start, end);
        values.push(JSON.parse(chunk) as FastCampusValues);
      } catch {
        // ignore
      }
    }

    pos = start + 1;
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

export async function discoverFastCampusCards(baseUrl: string, html: string): Promise<FastCampusSeminarCard[]> {
  const matches = [...html.matchAll(/(?:courseId|course-id)[^\d]{1,20}(\d+)/gi)];
  const courseIds = [...new Set(matches.map(m => m[1]))];
  if (courseIds.length === 0) {
    return [];
  }

  // chunk courseIds to avoid Request-URI Too Large
  const chunkSize = 15;
  const chunks: string[][] = [];
  for (let i = 0; i < courseIds.length; i += chunkSize) {
    chunks.push(courseIds.slice(i, i + chunkSize));
  }

  const cards: FastCampusSeminarCard[] = [];

  await Promise.all(chunks.map(async (chunk) => {
    const queryParams = chunk.map(id => `id=${id}`).join("&");
    const coursesUrl = `https://fastcampus.co.kr/.api/courses?${queryParams}`;
    const productsUrl = `https://fastcampus.co.kr/.api/courses/products?${queryParams}`;

    const [resCourses, resProducts] = await Promise.all([
      fetch(coursesUrl).catch(() => null),
      fetch(productsUrl).catch(() => null),
    ]);

    if (!resCourses?.ok || !resProducts?.ok) {
      return;
    }

    try {
      const coursesJson = await resCourses.json() as any;
      const productsJson = await resProducts.json() as any;

      const coursesList = coursesJson.data || [];
      const productsMap = productsJson.data || {};

      for (const course of coursesList) {
        const courseId = course.id;
        // Collect only open/ongoing/upcoming seminars
        if (course.state !== "READY" && course.state !== "ONGOING") {
          continue;
        }

        const productsList = productsMap[String(courseId)] || productsMap[Number(courseId)] || [];
        const product = productsList[0] || {};

        const title = course.publicTitle || product.title || course.title || "";
        const contentText = product.description || "";
        const contentHtml = product.description || "";

        const slug = course.slug;
        const url = slug 
          ? `https://fastcampus.co.kr/${slug}` 
          : `https://fastcampus.co.kr/products/${courseId}`;

        const dateText = extractFastCampusDateText(contentText);
        const startsAt = parseFastCampusStartDate(contentText);
        const deliveryType = detectDeliveryType(contentText);
        const imageUrl = course.desktopCardAsset || product.desktopCardAsset || null;

        cards.push({
          title,
          contentHtml,
          contentText,
          registrationUrl: url,
          detailUrl: url,
          imageUrl,
          startsAt,
          dateText,
          deliveryType,
        });
      }
    } catch {
      // ignore mapping/parse errors for this chunk
    }
  }));

  const byUrl = new Map<string, FastCampusSeminarCard>();
  for (const card of cards) {
    byUrl.set(card.detailUrl ?? card.registrationUrl, card);
  }

  return [...byUrl.values()];
}

export async function discoverFastCampusCandidates(seed: SourceSeed, html: string): Promise<DiscoveredCandidate[]> {
  const cards = await discoverFastCampusCards(seed.url, html);
  return cards.map((card) => ({
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
