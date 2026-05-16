/**
 * claude-verifier.ts
 *
 * Claude API를 사용해 행사 페이지를 실제로 검증합니다.
 * 검증 항목:
 *   1. 등록 가능 여부 (open / waitlist / closed / past)
 *   2. 행사 연도가 현재 연도/내년인지 (stale URL 감지)
 *   3. 등록 신청 기간이 따로 있는지 (기간 외 = closed)
 *   4. 발표자 모집 페이지 여부
 *   5. 유료로 변경됐는지
 *   6. 404 / 삭제된 행사
 */

export type VerificationStatus =
  | "open"         // 등록 가능
  | "waitlist"     // 대기자 등록 가능
  | "closed"       // 등록 마감 (신청기간 종료, sold out 등)
  | "past"         // 행사 날짜 자체가 이미 지남
  | "speaker_only" // 발표자 모집 페이지
  | "paid_only"    // 유료로 전환됨
  | "not_found"    // 404 / 삭제
  | "stale_url"    // 페이지는 살아있지만 다른 연도 행사 (재사용 URL)
  | "unknown";     // 판단 불가

export type VerificationResult = {
  status: VerificationStatus;
  confidence: number;               // 0–100
  reason: string;                   // 한국어 한 줄 설명
  registrationUrl: string | null;
  registrationDeadline: string | null; // "YYYY-MM-DD" 형식, 발견 시
  eventYear: number | null;         // 페이지에서 감지한 행사 연도
  checkedAt: string;
  rawSnippet?: string;
};

// ── 날짜 파싱 헬퍼 ────────────────────────────────────────────────
function parseStartsAt(startsAt: string | null): { ms: number; iso: string } | null {
  if (!startsAt) return null;
  if (/^\d+$/.test(startsAt.trim())) {
    const raw = Number(startsAt);
    const ms = raw > 1e12 ? raw : raw * 1000;
    return { ms, iso: new Date(ms).toISOString().slice(0, 10) };
  }
  const d = new Date(startsAt);
  if (!isNaN(d.getTime())) {
    return { ms: d.getTime(), iso: d.toISOString().slice(0, 10) };
  }
  return null;
}

// ── 페이지 크롤링 ──────────────────────────────────────────────────
async function fetchPageText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status === 404 || res.status === 410) return "__404__";
      return null;
    }
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return text;
  } catch {
    return null;
  }
}

// ── Claude API 호출 ───────────────────────────────────────────────
async function askClaude(
  apiKey: string,
  eventTitle: string,
  eventDateIso: string | null,
  url: string,
  pageText: string,
): Promise<VerificationResult> {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const prompt = `You are verifying a Korean tech event/seminar page. Be precise and skeptical.

Today's date: ${today}
Current year: ${currentYear}
Expected event date (from our DB): ${eventDateIso ?? "unknown"}
Event title: ${eventTitle}
Source URL: ${url}

Page text (truncated):
"""
${pageText}
"""

Analyze carefully and return a JSON object:

{
  "status": one of:
    "open"         - registration is currently open for attendees RIGHT NOW
    "waitlist"     - event is full but waitlist is available
    "closed"       - registration period has ended, deadline passed, or sold out
    "past"         - the event date itself has already passed (before ${today})
    "stale_url"    - page exists but is for a DIFFERENT year's event (e.g. page shows ${currentYear - 1} or earlier while we expect ${currentYear}/${nextYear})
    "speaker_only" - this is a call for speakers/presenters, NOT attendee registration
    "paid_only"    - event requires payment, no free tier
    "not_found"    - page is 404 or event deleted
    "unknown"      - genuinely cannot determine,

  "confidence": integer 0-100,

  "reason": one sentence in Korean explaining your decision. If stale_url, mention which year the page actually shows.,

  "registrationDeadline": "YYYY-MM-DD" if you find an explicit registration deadline/신청마감/접수마감 date in the text, otherwise null,

  "eventYear": the year this event is actually for based on the page content (integer), or null if unclear,

  "registrationUrl": direct registration URL found in the page text, or null
}

CRITICAL RULES:
1. If the page mentions a registration PERIOD (e.g. "신청기간: 9월 3일~10일") and today is outside that period → status = "closed"
2. If the page clearly shows an event from ${currentYear - 1} or earlier → status = "stale_url"  
3. If eventYear from the page doesn't match the expected year from our DB → status = "stale_url"
4. "open" means registration is available TODAY, not just that the page exists
5. Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const raw = data.content?.[0]?.text ?? "";

  try {
    const json = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, ""));
    return {
      status: json.status ?? "unknown",
      confidence: typeof json.confidence === "number" ? json.confidence : 50,
      reason: json.reason ?? "알 수 없음",
      registrationUrl: json.registrationUrl ?? null,
      registrationDeadline: json.registrationDeadline ?? null,
      eventYear: typeof json.eventYear === "number" ? json.eventYear : null,
      checkedAt: new Date().toISOString(),
      rawSnippet: pageText.slice(0, 200),
    };
  } catch {
    return {
      status: "unknown",
      confidence: 0,
      reason: "Claude 응답 파싱 실패",
      registrationUrl: null,
      registrationDeadline: null,
      eventYear: null,
      checkedAt: new Date().toISOString(),
    };
  }
}

// ── 메인 검증 함수 ────────────────────────────────────────────────
export async function verifyEvent(opts: {
  apiKey: string;
  title: string;
  startsAt: string | null;
  primarySourceUrl: string;
  registrationUrl: string | null;
}): Promise<VerificationResult> {
  const { apiKey, title, startsAt, primarySourceUrl, registrationUrl } = opts;

  // 1. 날짜 파싱
  const parsed = parseStartsAt(startsAt);

  // 2. 이미 지난 행사 빠른 판단
  if (parsed && parsed.ms < Date.now() - 86400_000) {
    return {
      status: "past",
      confidence: 95,
      reason: `행사 날짜(${parsed.iso})가 이미 지났습니다`,
      registrationUrl: null,
      registrationDeadline: null,
      eventYear: new Date(parsed.ms).getFullYear(),
      checkedAt: new Date().toISOString(),
    };
  }

  // 3. 페이지 크롤링
  const targetUrl = registrationUrl ?? primarySourceUrl;
  const pageText = await fetchPageText(targetUrl);

  // 4. 404 체크
  if (pageText === "__404__") {
    return {
      status: "not_found",
      confidence: 99,
      reason: "페이지를 찾을 수 없습니다 (404)",
      registrationUrl: null,
      registrationDeadline: null,
      eventYear: null,
      checkedAt: new Date().toISOString(),
    };
  }

  // 5. 크롤링 실패
  if (!pageText) {
    return {
      status: "unknown",
      confidence: 10,
      reason: "페이지 접근 불가 (Cloudflare 차단 또는 네트워크 오류)",
      registrationUrl: null,
      registrationDeadline: null,
      eventYear: null,
      checkedAt: new Date().toISOString(),
    };
  }

  // 6. Claude 분석
  return askClaude(apiKey, title, parsed?.iso ?? null, targetUrl, pageText);
}
