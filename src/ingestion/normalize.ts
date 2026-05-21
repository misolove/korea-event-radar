import type { ExtractedEventDraft } from "@/ingestion/types";
import type {
  DeliveryType,
  EventKind,
  PriceType,
  RegistrationStatus,
  StatusOrigin,
} from "@/lib/event-model";
import { looksLikeJunkEventPage } from "@/ingestion/extractors/common";
import { slugifyText, uniqueStrings } from "@/lib/text";

const closedStatusPatterns = [/sold out/i, /application closed/i, /모집마감/i, /접수마감/i, /마감/i];
const waitlistStatusPatterns = [/waitlist/i, /대기/i];
const openStatusPatterns = [/now open/i, /register/i, /rsvp/i, /모집중/i, /접수중/i, /신청가능/i, /신청하기/i];

const topicMatchers: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "AI", patterns: [/\bai\b/i, /artificial intelligence/i, /인공지능/, /생성형 ai/, /llm/i] },
  { tag: "데이터", patterns: [/data/i, /데이터/] },
  { tag: "클라우드", patterns: [/cloud/i, /클라우드/, /\baws\b/i, /\bgcp\b/i, /\bazure\b/i] },
  { tag: "스타트업", patterns: [/startup/i, /스타트업/, /demo day/i] },
  { tag: "개발자", patterns: [/developer/i, /development/i, /개발자/, /엔지니어/] },
  { tag: "디자인", patterns: [/design/i, /디자인/] },
];

const eventKindMatchers: Array<{ kind: EventKind; patterns: RegExp[] }> = [
  { kind: "hackathon", patterns: [/hackathon/i, /해커톤/] },
  { kind: "conference", patterns: [/conference/i, /conf/i, /컨퍼런스/] },
  { kind: "seminar", patterns: [/seminar/i, /세미나/] },
  { kind: "webinar", patterns: [/webinar/i, /웨비나/] },
  { kind: "meetup", patterns: [/meetup/i, /밋업/] },
  { kind: "bootcamp", patterns: [/bootcamp/i, /부트캠프/] },
  { kind: "exhibition", patterns: [/expo/i, /exhibition/i, /전시/] },
  { kind: "demo_day", patterns: [/demo day/i, /데모데이/] },
  { kind: "networking", patterns: [/networking/i, /네트워킹/] },
  { kind: "program", patterns: [/교육/i, /과정/, /course/i, /program/i] },
];

function detectStatusFromText(text: string): {
  status: RegistrationStatus;
  origin: StatusOrigin;
} {
  if (closedStatusPatterns.some((pattern) => pattern.test(text))) {
    return { status: "closed", origin: "direct" };
  }

  const hasWaitlist = waitlistStatusPatterns.some((pattern) => pattern.test(text));
  const hasOpen = openStatusPatterns.some((pattern) => pattern.test(text));

  if (hasWaitlist && !hasOpen) {
    return { status: "waitlist", origin: "direct" };
  }

  if (hasOpen) {
    return { status: "open", origin: "direct" };
  }

  if (hasWaitlist) {
    return { status: "waitlist", origin: "direct" };
  }

  return { status: "unknown", origin: "inferred" };
}

function detectStatusFromEvidenceTexts(statusTexts: Array<string | null | undefined>) {
  const normalizedTexts = statusTexts.map((text) => text?.trim()).filter(Boolean) as string[];
  if (normalizedTexts.length === 0) {
    return null;
  }

  for (const text of normalizedTexts) {
    if (closedStatusPatterns.some((pattern) => pattern.test(text))) {
      return { status: "closed" as const, origin: "direct" as const };
    }
  }

  for (const text of normalizedTexts) {
    if (waitlistStatusPatterns.some((pattern) => pattern.test(text))) {
      return { status: "waitlist" as const, origin: "direct" as const };
    }
  }

  for (const text of normalizedTexts) {
    if (openStatusPatterns.some((pattern) => pattern.test(text))) {
      return { status: "open" as const, origin: "direct" as const };
    }
  }

  return null;
}

function detectPrice(text: string): { priceType: PriceType; priceText: string | null } {
  const hasFree = /무료|free\b|no cost|complimentary/i.test(text);
  const hasPaid = /₩|\bkrw\b|\$\d|\b유료\b|\bpaid\b|\d+\s*원/.test(text);

  if (hasFree && hasPaid) {
    return { priceType: "mixed", priceText: text || null };
  }
  if (hasFree) {
    return { priceType: "free", priceText: text || null };
  }
  if (hasPaid) {
    return { priceType: "paid", priceText: text || null };
  }
  return { priceType: "unknown", priceText: text || null };
}

function detectDeliveryType(text: string): DeliveryType {
  const hasOnline = /온라인|virtual|livestream|zoom|youtube/i.test(text);
  const hasOffline = /서울|부산|대구|판교|광화문|오피스|센터|hall|venue|오프라인|campus/i.test(text);

  if (hasOnline && hasOffline) {
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

function detectEventKind(text: string): EventKind {
  for (const matcher of eventKindMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      return matcher.kind;
    }
  }
  return "other";
}

function detectTopics(text: string): string[] {
  return topicMatchers
    .filter((matcher) => matcher.patterns.some((pattern) => pattern.test(text)))
    .map((matcher) => matcher.tag);
}

function looksKoreanRelevant(text: string): boolean {
  return /(korea|seoul|판교|서울|부산|한국|대한민국|kr\b|광화문|강남)/i.test(text);
}

function looksTechRelevant(text: string): boolean {
  return /(ai|developer|software|cloud|data|startup|product|engineering|programming|인공지능|개발자|데이터|클라우드|소프트웨어|it\b|devops|mlops|kubernetes|docker|python|javascript|typescript|react|llm|머신러닝|딥러닝|보안|security|backend|frontend)/i.test(
    text,
  );
}

// 명백히 IT/개발과 무관한 키워드 — 이것들이 제목에 있으면 필터
function looksNonTech(title: string): boolean {
  return /(바이오유스\s*캠프|계획기부|유산기부|힐링콘서트|강형욱|이대호|부동산|재테크|현금\s*파이프라인|커피\s*포럼|바이어\s*응대|출판.*수출|비영리.*법령|근로기준법|경제.*클래스|돈\s*공부|킥스타터.*크라우드|음악.*작곡|한국위성|원폭|핵무기|WISE\s*Vocabulary|경암바이오|의약학|국세통계|세무.*신고|노무.*실무|비영리.*윤리|자원봉사|봉사활동|사회복지|평생교육|시민교육|통장.*꿀|꿀.*통장|돈.*버는|재무.*설계|보험.*설계|금융.*상품|주식.*투자|코인.*투자|부업.*강의|N잡|사이드잡|창업.*자금|소상공인|자영업|공무원.*시험|취업.*스펙|어학.*시험|영어.*회화|중국어|일본어|요리.*클래스|베이킹|미술.*클래스|드로잉|수채화|캘리그래피|명상|요가|필라테스|다이어트|헬스.*강의|운동.*프로그램|독서.*모임|글쓰기.*강의|시.*창작|소설.*창작|드라마.*제작|영화.*감상|음악.*감상|클래식.*공연|재즈.*공연|콘서트|뮤지컬|연극|무용|전시.*관람|미술관|박물관|역사.*강의|인문학|철학.*강의|종교|기도|예배)/i.test(title);
}

export function normalizeExtractedEvent(draft: ExtractedEventDraft): ExtractedEventDraft | null {
  const title = draft.title.trim();
  if (!title) {
    return null;
  }

  if (looksLikeJunkEventPage(title, draft.primarySourceUrl, draft.startsAt ?? null, draft.endsAt ?? null)) {
    return null;
  }

  // ── 명백한 비IT 행사 필터 ──
  if (looksNonTech(title)) {
    return null;
  }

  // ── 과거 행사 필터링: startsAt이 어제보다 이전이면 ingest 자체를 차단 ──
  if (draft.startsAt) {
    const ms = draft.startsAt instanceof Date
      ? draft.startsAt.getTime()
      : typeof draft.startsAt === "number"
        ? draft.startsAt
        : 0;
    const yesterday = Date.now() - 86400_000;
    if (ms > 0 && ms < yesterday) {
      return null; // 과거 행사 — DB 저장 안 함
    }
  }

  const textCorpus = [
    draft.title,
    draft.summary ?? "",
    draft.organizer ?? "",
    draft.city ?? "",
    draft.venueName ?? "",
    draft.priceText ?? "",
    draft.rawText ?? "",
    ...draft.evidence.flatMap((evidence) => [
      evidence.extractedStatusText ?? "",
      evidence.extractedPriceText ?? "",
      evidence.extractedLocationText ?? "",
      evidence.extractedStartText ?? "",
    ]),
  ].join(" ");

  const evidenceStatusSignal = detectStatusFromEvidenceTexts(
    draft.evidence.map((evidence) => evidence.extractedStatusText),
  );

  const detectedStatus =
    draft.registrationStatus && draft.registrationStatus !== "unknown"
      ? {
          status: draft.registrationStatus,
          origin: draft.statusOrigin ?? "direct",
        }
      : evidenceStatusSignal ?? detectStatusFromText(textCorpus);

  const rawPrice =
    draft.priceType && draft.priceType !== "unknown"
      ? { priceType: draft.priceType, priceText: draft.priceText ?? null }
      : detectPrice(textCorpus);

  // ── 2만원 이하 유료 → 사실상 무료 커뮤니티비로 재분류 ──
  const detectedPrice = (() => {
    if (rawPrice.priceType !== "paid") return rawPrice;
    const m = rawPrice.priceText?.replace(/,/g, "").match(/(\d+)/);
    const amt = m ? parseInt(m[1], 10) : null;
    if (amt !== null && amt <= 20000) {
      return { priceType: "free" as const, priceText: `무료(${amt.toLocaleString()}원 커뮤니티비)` };
    }
    return rawPrice;
  })();

  const deliveryType = draft.deliveryType ?? detectDeliveryType(textCorpus);
  const eventKind = draft.eventKind ?? detectEventKind(textCorpus);
  const topicTags = uniqueStrings([...(draft.topicTags ?? []), ...detectTopics(textCorpus)]);
  const confidenceScore = Math.min(
    99,
    Math.max(
      40,
      draft.confidenceScore ??
        55 +
          (detectedStatus.origin === "direct" ? 18 : 0) +
          (detectedPrice.priceType !== "unknown" ? 10 : 0) +
          (looksKoreanRelevant(textCorpus) ? 8 : 0) +
          (looksTechRelevant(textCorpus) ? 8 : 0),
    ),
  );

  const isRelevant =
    draft.isRelevant ?? (looksTechRelevant(textCorpus) && looksKoreanRelevant(textCorpus));

  // ── URL tracking param 제거 (Meetup recId/recSource/searchId/eventOrigin 등) ──
  const cleanUrl = (raw: string | null): string | null => {
    if (!raw) return raw;
    try {
      const u = new URL(raw);
      ["recId", "recSource", "searchId", "eventOrigin", "utm_source", "utm_medium", "utm_campaign"].forEach(
        (p) => u.searchParams.delete(p),
      );
      return u.toString();
    } catch {
      return raw;
    }
  };

  return {
    ...draft,
    slug: draft.slug ?? slugifyText(title),
    title,
    summary: draft.summary?.trim() || null,
    organizer: draft.organizer?.trim() || null,
    city: draft.city?.trim() || null,
    venueName: draft.venueName?.trim() || null,
    primarySourceUrl: cleanUrl(draft.primarySourceUrl) ?? draft.primarySourceUrl,
    registrationUrl: cleanUrl(draft.registrationUrl ?? null),
    registrationStatus: detectedStatus.status,
    statusOrigin: detectedStatus.origin,
    priceType: detectedPrice.priceType,
    priceText: detectedPrice.priceText,
    deliveryType,
    eventKind,
    topicTags,
    confidenceScore,
    isRelevant,
    evidence: draft.evidence.map((evidence) => ({
      ...evidence,
      registrationStatus:
        evidence.registrationStatus === "unknown" ? detectedStatus.status : evidence.registrationStatus,
      statusOrigin:
        evidence.statusOrigin === "inferred" ? detectedStatus.origin : evidence.statusOrigin,
      priceType: evidence.priceType === "unknown" ? detectedPrice.priceType : evidence.priceType,
      confidenceScore: Math.max(evidence.confidenceScore, confidenceScore - 5),
    })),
  };
}
