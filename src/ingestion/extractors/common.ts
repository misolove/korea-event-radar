import { load } from "cheerio";
import { normalizeUrl, normalizeWhitespace } from "@/lib/text";

export function parseHtml(html: string) {
  return load(html);
}

export function bodyText(html: string): string {
  return normalizeWhitespace(load(html).root().text());
}

export function pickMeta(html: string, selectors: string[]): string | null {
  const $ = load(html);
  for (const selector of selectors) {
    const value = $(selector).attr("content") ?? $(selector).text();
    if (normalizeWhitespace(value)) {
      return normalizeWhitespace(value);
    }
  }
  return null;
}

export function extractStructuredEvent(html: string) {
  const $ = load(html);
  const scripts = $("script[type='application/ld+json']")
    .map((_, element) => $(element).text())
    .get();

  const objects: Record<string, unknown>[] = [];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && typeof item === "object" && "@graph" in item && Array.isArray(item["@graph"])) {
          objects.push(...(item["@graph"] as Record<string, unknown>[]));
        } else if (item && typeof item === "object") {
          objects.push(item as Record<string, unknown>);
        }
      }
    } catch {
      continue;
    }
  }

  return objects.find((item) => {
    const type = item["@type"];
    if (Array.isArray(type)) {
      return type.includes("Event");
    }
    return type === "Event";
  });
}

export function extractOrganizerName(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return normalizeWhitespace(value) || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const organizer = extractOrganizerName(item);
      if (organizer) {
        return organizer;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return (
      extractOrganizerName(objectValue.name) ??
      extractOrganizerName(objectValue.organizer) ??
      extractOrganizerName(objectValue.description)
    );
  }

  return null;
}

const cityMatchers: Array<{ city: string; pattern: RegExp }> = [
  { city: "서울", pattern: /서울|seoul/i },
  { city: "부산", pattern: /부산|busan/i },
  { city: "판교", pattern: /판교|pangyo/i },
  { city: "대전", pattern: /대전|daejeon/i },
  { city: "대구", pattern: /대구|daegu/i },
  { city: "광주", pattern: /광주|gwangju/i },
  { city: "인천", pattern: /인천|incheon/i },
  { city: "울산", pattern: /울산|ulsan/i },
  { city: "수원", pattern: /수원|suwon/i },
  { city: "고양", pattern: /고양|goyang/i },
  { city: "성남", pattern: /성남|seongnam/i },
  { city: "제주", pattern: /제주|jeju/i },
];

function collectLocationTexts(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return [normalizeWhitespace(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectLocationTexts(item));
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const nested = [
      objectValue.name,
      objectValue.description,
      objectValue.streetAddress,
      objectValue.addressLocality,
      objectValue.addressRegion,
      objectValue.addressCountry,
      objectValue.address,
    ].flatMap((item) => collectLocationTexts(item));

    return nested;
  }

  return [];
}

export function extractCityFromText(...texts: Array<string | null | undefined>) {
  for (const text of texts) {
    const normalized = normalizeWhitespace(text);
    if (!normalized) {
      continue;
    }

    for (const matcher of cityMatchers) {
      if (matcher.pattern.test(normalized)) {
        return matcher.city;
      }
    }
  }

  return null;
}

export function extractLocationInfo(
  structuredEvent: Record<string, unknown> | undefined,
  ...preferredTexts: Array<string | null | undefined>
) {
  const structuredTexts = collectLocationTexts(structuredEvent?.location);
  const orderedTexts = [...structuredTexts, ...preferredTexts];
  const allTexts = orderedTexts
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean);
  const cleanVenueCandidates = allTexts.filter((text) => {
    if (text.length > 120) {
      return false;
    }
    if (/행사 소개|welcome to|가입|로그인|대전화이메일을 잊으셨나요|\[object Object\]/i.test(text)) {
      return false;
    }
    if (/https?:\/\//i.test(text)) {
      return false;
    }
    return true;
  });

  const city = extractCityFromText(...allTexts);
  const locationText = allTexts.find(Boolean) ?? null;
  const venueName =
    cleanVenueCandidates.find((text) => !/^(온라인|오프라인|virtual|hybrid|online event)$/i.test(text)) ??
    cleanVenueCandidates[0] ??
    null;

  return {
    city,
    venueName,
    locationText,
  };
}

export function buildAbsoluteUrl(baseUrl: string, href: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function pickSafeRegistrationUrl(
  fallbackUrl: string,
  candidates: Array<string | null | undefined>,
) {
  const blockedPatterns = [
    /meet\.google\.com/i,
    /zoom\.us/i,
    /docs\.google\.com\/presentation/i,
    /docs\.google\.com\/document/i,
    /play\.google\.com/i,
    /apps\.apple\.com/i,
    /open\.kakao\.com/i,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (!normalized) {
      continue;
    }

    if (blockedPatterns.some((pattern) => pattern.test(normalized))) {
      continue;
    }

    return normalized;
  }

  return normalizeUrl(fallbackUrl) ?? fallbackUrl;
}

export function looksLikeJunkEventPage(
  title: string,
  sourceUrl: string,
  startsAt: Date | null,
  endsAt: Date | null,
) {
  const normalizedTitle = normalizeWhitespace(title).toLowerCase();
  const normalizedUrl = normalizeUrl(sourceUrl) ?? sourceUrl;

  if (
    /로그인|회원 가입|linkedin에 지금 가입하세요|sign in|sign up|join linkedin/i.test(normalizedTitle)
  ) {
    return true;
  }

  // 플랫폼 홈페이지 자체가 이벤트로 잡히는 경우 차단
  if (
    /이벤터스.*행사와 함께|행사와 함께하는 모든 순간|온오프믹스.*대표 모임 플랫폼/i.test(normalizedTitle)
  ) {
    return true;
  }

  if (
    /예정된 개발자 이벤트 및 컨퍼런스|upcoming developer events|events for developers/i.test(
      normalizedTitle,
    ) &&
    !startsAt &&
    !endsAt
  ) {
    return true;
  }

  return /\/accounts\/social\/signup|linkedin\.com\/signup/i.test(normalizedUrl);
}

const knownHosts = [
  "event-us.kr",
  "meetup.com",
  "luma.com",
  "onoffmix.com",
  "gdg.community.dev",
  "ticketa.co",
  "developer.microsoft.com",
  "aws.amazon.com",
  "developers.google.com",
  "festa.io",
];
const lumaReservedSlugs = new Set(["pricing", "discover", "help", "host", "explore", "signin"]);
const socialHosts = ["linkedin.com", "facebook.com", "x.com", "twitter.com", "instagram.com"];

function isSocialHost(hostname: string) {
  return socialHosts.some((host) => hostname.includes(host));
}

function looksLikeEventUrl(url: URL): boolean {
  if (url.hostname.includes("event-us.kr")) {
    return /\/event\/\d+/.test(url.pathname);
  }
  if (url.hostname.includes("meetup.com")) {
    return /\/events\/\d+/.test(url.pathname);
  }
  if (url.hostname.includes("onoffmix.com")) {
    return /\/event\/\d+/.test(url.pathname);
  }
  if (url.hostname.includes("luma.com")) {
    const slug = url.pathname.replace(/^\/+|\/+$/g, "");
    return Boolean(slug) && !lumaReservedSlugs.has(slug.toLowerCase()) && !slug.includes("/");
  }
  if (url.hostname.includes("gdg.community.dev")) {
    return /\/events\/details\//.test(url.pathname);
  }
  if (url.hostname.includes("ticketa.co")) {
    return /\/event\//.test(url.pathname);
  }
  if (url.hostname.includes("developer.microsoft.com")) {
    return /\/reactor\/(events\/\d+|series\/s-\d+)/.test(url.pathname);
  }
  if (url.hostname.includes("aws.amazon.com")) {
    return /\/events\/summits\/(korea|seoul)/.test(url.pathname);
  }
  if (url.hostname.includes("developers.google.com")) {
    return /\/community\/devfest/.test(url.pathname);
  }
  if (url.hostname.includes("festa.io")) {
    return /\/events?\//.test(url.pathname);
  }
  return /(event|meetup|seminar|conference|행사|세미나|웨비나)/i.test(url.pathname);
}

export function discoverKnownEventLinks(baseUrl: string, html: string): string[] {
  const $ = load(html);
  const links = $("a[href]")
    .map((_, element) => $(element).attr("href") ?? "")
    .get()
    .map((href) => buildAbsoluteUrl(baseUrl, href))
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      try {
        const url = new URL(value);
        return knownHosts.some((host) => url.hostname.includes(host)) && looksLikeEventUrl(url);
      } catch {
        return false;
      }
    });

  return [...new Set(links)];
}

export function discoverRegistrationLinks(baseUrl: string, html: string): string[] {
  const $ = load(html);
  const baseHost = new URL(baseUrl).hostname;
  const links = $("a[href]")
    .map((_, element) => $(element).attr("href") ?? "")
    .get()
    .map((href) => buildAbsoluteUrl(baseUrl, href))
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      try {
        const url = new URL(value);
        if (isSocialHost(baseHost) && isSocialHost(url.hostname)) {
          return false;
        }
        if (
          url.hostname.includes("linkedin.com") &&
          /\/(signup|feed\/hashtag|search\/results|company)\b/i.test(url.pathname)
        ) {
          return false;
        }
        if (looksLikeEventUrl(url)) {
          return true;
        }
        return /(register|tickets|apply|rsvp|signup|event|행사|신청|예매)/i.test(
          `${url.pathname}${url.search}`,
        );
      } catch {
        return false;
      }
    });

  return [...new Set(links)];
}

function resolveYear(month: number, now: Date) {
  const currentMonth = now.getMonth() + 1;
  if (month < currentMonth - 6) {
    return now.getFullYear() + 1;
  }
  if (month > currentMonth + 6) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
}

export function extractYearHint(...texts: Array<string | null | undefined>) {
  for (const text of texts) {
    const normalized = normalizeWhitespace(text);
    if (!normalized) {
      continue;
    }

    const match = normalized.match(/\b(20\d{2})\b/);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

export function parseKoreanDateRange(
  text: string,
  options?: {
    yearHint?: number | null;
  },
): {
  startsAt: Date | null;
  endsAt: Date | null;
} {
  const matches = [...text.matchAll(/(\d{1,2})월\s*(\d{1,2})일(?:\([^)]+\))?\s*(\d{1,2}):(\d{2})?/g)];
  if (matches.length === 0) {
    return { startsAt: null, endsAt: null };
  }

  const now = new Date();
  const toDate = (match: RegExpMatchArray) => {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const hour = Number(match[3] ?? 0);
    const minute = Number(match[4] ?? 0);
    const year = options?.yearHint ?? resolveYear(month, now);
    return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`);
  };

  const startsAt = toDate(matches[0]);
  const endsAt = matches[1] ? toDate(matches[1]) : null;
  return { startsAt, endsAt };
}

export function parseIsoLikeDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseDateTimeRangeText(text: string): {
  startsAt: Date | null;
  endsAt: Date | null;
} {
  const koreanRange =
    text.match(
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/,
    ) ??
    text.match(
      /(\d{4})\/(\d{1,2})\/(\d{1,2})[^\d]*(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/,
    );

  if (koreanRange) {
    const [, year, month, day, startHour, startMinute, endHour, endMinute] = koreanRange;
    const startsAt = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(startHour).padStart(2, "0")}:${startMinute}:00+09:00`,
    );
    const endsAt = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(endHour).padStart(2, "0")}:${endMinute}:00+09:00`,
    );
    return { startsAt, endsAt };
  }

  const koreanSingle =
    text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]*(\d{1,2}):(\d{2})/) ??
    text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})[^\d]*(\d{1,2}):(\d{2})/);

  if (koreanSingle) {
    const [, year, month, day, hour, minute] = koreanSingle;
    const startsAt = new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:00+09:00`,
    );
    return { startsAt, endsAt: null };
  }

  return { startsAt: null, endsAt: null };
}
