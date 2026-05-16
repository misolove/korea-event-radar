/**
 * opus-curator.ts
 *
 * Claude Opus로 새 행사에 대한 "참석 추천 이유" 한 줄을 생성합니다.
 * - Cron 수집 시 신규 삽입된 이벤트에만 1회 호출
 * - 결과는 events.summary 컬럼에 저장
 * - 모델: claude-opus-4-5 (해커톤 크레딧 소진 목적)
 */

export type CurationResult = {
  summary: string;         // 카드/상세에 표시할 추천 이유 (1–2문장, 한국어)
  recommendedFor: string;  // 추천 대상 (한 줄)
  adRisk: "low" | "medium" | "high";
  adRiskReason: string;
};

export async function generateCuration(opts: {
  apiKey: string;
  title: string;
  organizer: string | null;
  topicTags: string[];
  eventKind: string;
  startsAt: string | null;
  venueName: string | null;
  primarySourceUrl: string;
  pageTextSnippet: string; // 페이지 텍스트 일부 (크롤 결과)
}): Promise<CurationResult | null> {
  const { apiKey, title, organizer, topicTags, eventKind, startsAt, venueName, primarySourceUrl, pageTextSnippet } = opts;

  const dateStr = startsAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" })
        .format(new Date(startsAt))
    : "일정 미정";

  const prompt = `당신은 IT/AI 커뮤니티 행사 큐레이터입니다. 아래 무료 IT/AI 행사를 분석해 참석자에게 실질적인 정보를 제공해 주세요.

행사명: ${title}
주최: ${organizer ?? "미상"}
일정: ${dateStr}
장소: ${venueName ?? "미상"}
분류: ${eventKind}, 태그: ${topicTags.join(", ") || "없음"}
URL: ${primarySourceUrl}

행사 페이지 텍스트 (발췌):
"""
${pageTextSnippet.slice(0, 1500)}
"""

아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만:

{
  "summary": "이 행사에 참석할 가치가 있는 이유를 1~2문장으로. 구체적인 배움/네트워킹/기회를 언급. 광고성 행사면 솔직하게 경고 포함.",
  "recommendedFor": "이 행사가 가장 도움이 될 참석 대상을 한 줄로 (예: 'AWS 실무 경험 있는 백엔드 개발자')",
  "adRisk": "low | medium | high",
  "adRiskReason": "광고/영업 위험 판단 근거 한 줄. low면 '커뮤니티 주도 발표 중심'처럼 긍정적으로."
}

판단 기준:
- adRisk high: 특정 솔루션/제품 구매 유도, 영업 목적 명확
- adRisk medium: 후원사 발표 포함 가능성, 대형 컨퍼런스
- adRisk low: 커뮤니티 주도, 발표자가 실무자/연구자`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      console.error(`Opus API error ${resp.status}: ${await resp.text()}`);
      return null;
    }

    const data = await resp.json();
    const raw = (data.content?.[0]?.text ?? "").trim();
    const json = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, ""));

    return {
      summary: json.summary ?? "",
      recommendedFor: json.recommendedFor ?? "",
      adRisk: ["low", "medium", "high"].includes(json.adRisk) ? json.adRisk : "low",
      adRiskReason: json.adRiskReason ?? "",
    };
  } catch (err) {
    console.error("generateCuration error:", err);
    return null;
  }
}

/** 페이지 텍스트 간단 크롤 (verifier와 별도로 경량 버전) */
export async function fetchPageSnippet(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
  } catch {
    return "";
  }
}
