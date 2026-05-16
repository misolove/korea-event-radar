// AI-style curation metadata for events (static demo data for MVP)

export type AiCuration = {
  recommendationScore: number; // 0–100
  recommendedAudience: string;
  reasonToAttend: string;
  caution: string | null;
  preparationTips: string;
  adSalesRisk: "low" | "medium" | "high";
  adSalesRiskLabel: string;
};

const DEFAULT_CURATION: AiCuration = {
  recommendationScore: 78,
  recommendedAudience: "IT·AI에 관심 있는 직장인·학생",
  reasonToAttend: "무료로 최신 AI 트렌드를 접할 수 있는 기회입니다.",
  caution: null,
  preparationTips: "행사 페이지에서 사전 질문을 미리 준비해 오면 더 많은 것을 얻을 수 있습니다.",
  adSalesRisk: "low",
  adSalesRiskLabel: "광고 위험 낮음",
};

const CURATION_MAP: Record<string, AiCuration> = {
  // ── 실시간 발굴 이벤트 (Meetup/Eventbrite, 2026-05-16) ──────────
  "ai-adoption-talk-ai-seoul-may23": {
    recommendationScore: 82,
    recommendedAudience: "AI 도입을 고민하는 직장인, 입문자, 영어·한국어 사용자",
    reasonToAttend: "매주 열리는 소규모 AI 토크로 부담 없이 참여 가능. 실무 AI 도입 사례를 편하게 나눌 수 있어 네트워킹 입문으로 최적입니다.",
    caution: "대기자 명단 상태. 인원이 제한적이므로 조기 등록 필수. 발표보다 대화 중심이라 깊은 기술 내용을 기대하면 아쉬울 수 있습니다.",
    preparationTips: "최근 AI 도구 사용 경험 하나를 준비해 오면 대화에 바로 참여할 수 있습니다. 명함 또는 LinkedIn QR 코드 지참 추천.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "automate-development-with-agents-codeseoul": {
    recommendationScore: 93,
    recommendedAudience: "AI 코딩 에이전트에 관심 있는 개발자, DevOps, 스타트업 CTO",
    reasonToAttend: "GitHub Copilot·Cursor·Claude Code를 실무에서 직접 쓰는 개발자들의 생생한 경험을 들을 수 있습니다. Microsoft Korea 오피스에서 무료로 열리는 고품질 밋업.",
    caution: null,
    preparationTips: "현재 사용 중인 AI 코딩 도구와 겪은 문제점을 메모해 오면 Q&A에서 더 유용한 답을 얻을 수 있습니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "owasp-seoul-ai-vulnerability-seminar-may26": {
    recommendationScore: 88,
    recommendedAudience: "보안 엔지니어, 개발자, AI 시스템 보안에 관심 있는 분",
    reasonToAttend: "AI로 실제 CVE를 발굴한 사례를 보안 전문가가 직접 발표. OWASP Seoul 정기 세미나로 신뢰도 높은 커뮤니티 행사입니다.",
    caution: "보안 기초 지식이 없으면 기술적 내용 따라가기 어려울 수 있습니다. 중급 이상 개발자에게 더 적합.",
    preparationTips: "OWASP Top 10 목록을 간단히 훑어보고 오면 발표 내용이 더 잘 이해됩니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "mug-gdg-local-rag-prototyping-may29": {
    recommendationScore: 96,
    recommendedAudience: "LLM 실무 적용을 원하는 개발자, AI 엔지니어, 데이터 엔지니어",
    reasonToAttend: "로컬 환경에서 RAG 시스템을 하루 만에 직접 만들어보는 실습 중심 세미나. MongoDB·Gemma·Voyage AI 조합을 Google Campus에서 무료로 배울 수 있는 드문 기회.",
    caution: null,
    preparationTips: "노트북 필참. Python 기초, MongoDB Atlas 계정 사전 생성. Ollama 설치 미리 해두면 실습 속도가 빠릅니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "seoul-tech-mixer-ai-it-may22": {
    recommendationScore: 72,
    recommendedAudience: "서울 IT/AI 업계 종사자, 네트워킹을 원하는 개발자·기획자",
    reasonToAttend: "부담 없는 분위기에서 서울 Tech 커뮤니티와 연결할 수 있는 기회. 술자리 형식이라 대화가 자연스럽게 이어집니다.",
    caution: "세미나나 발표가 없는 순수 네트워킹 행사입니다. 기술 인사이트보다는 인맥 형성 목적으로 참석하세요.",
    preparationTips: "30초 자기소개 준비. 명함 또는 LinkedIn QR 코드 지참. 편한 복장으로 오세요.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "awskrug-eks-container-deep-dive-may29": {
    recommendationScore: 85,
    recommendedAudience: "AWS EKS 사용자, DevOps/SRE, 컨테이너 기반 AI 인프라 담당자",
    reasonToAttend: "실제 EKS 스터디 4기 수료자들의 실전 운영 경험을 듣는 자리. AWSKRUG는 국내 최대 AWS 커뮤니티로 발표 품질이 검증됩니다.",
    caution: "AWS·쿠버네티스 기본 지식이 없으면 따라가기 어렵습니다. 좌석이 8개밖에 남지 않아 빠른 등록이 필요합니다.",
    preparationTips: "AWS EKS 기본 개념(Node Group, Fargate, Load Balancer)을 미리 복습하면 내용이 더 잘 들어옵니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "ai-design-creator-program": {
    recommendationScore: 91,
    recommendedAudience: "디자이너, 콘텐츠 크리에이터, AI 도구 입문자",
    reasonToAttend: "전액 무료 국비 지원 과정으로, AI 디자인 실무 역량을 체계적으로 키울 수 있습니다. 취업·포트폴리오 강화에 직결됩니다.",
    caution: "교육 기간이 한 달로 꽤 길어 일정 조율이 필요합니다. 오프라인 출석 요건을 사전에 확인하세요.",
    preparationTips: "포트폴리오 샘플 1–2개, 노트북 지참. Canva·Adobe Express 기본 계정 미리 만들어두면 유리합니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "coding-with-ai-the-shift-part-1-3": {
    recommendationScore: 88,
    recommendedAudience: "개발자, AI 활용에 관심 있는 소프트웨어 엔지니어",
    reasonToAttend: "Microsoft Korea 오피스에서 열리는 커뮤니티 중심 밋업. 실무 개발자들과 AI 코딩 패러다임 변화를 직접 논의할 수 있습니다.",
    caution: null,
    preparationTips: "GitHub Copilot·Cursor 등 AI 코딩 도구 사용 경험을 공유할 준비를 하면 네트워킹에 도움이 됩니다.",
    adSalesRisk: "low",
    adSalesRiskLabel: "광고 위험 낮음",
  },
  "ai-is-near-seoul": {
    recommendationScore: 74,
    recommendedAudience: "블록체인·Web3 관심자, AI + 탈중앙화 교차 관심자",
    reasonToAttend: "NEAR 프로토콜의 AI 통합 방향을 직접 들을 수 있는 드문 기회입니다. 글로벌 Web3 커뮤니티와 연결할 수 있습니다.",
    caution: "일부 발표가 NEAR 생태계 홍보 성격을 띨 수 있습니다. 기술적 깊이보다는 커뮤니티·네트워킹 목적으로 참석하는 것이 좋습니다.",
    preparationTips: "NEAR 프로토콜 기본 개념을 간단히 살펴보고, 명함 또는 LinkedIn QR 코드를 준비하세요.",
    adSalesRisk: "medium",
    adSalesRiskLabel: "광고 위험 보통",
  },
};

/** slug로 먼저 찾고, 없으면 title/tags 기반 휴리스틱으로 동적 생성 */
export function getAiCuration(
  slug: string,
  hint?: { title?: string; topicTags?: string[]; priceType?: string; eventKind?: string },
): AiCuration {
  if (CURATION_MAP[slug]) return CURATION_MAP[slug];

  // 동적 큐레이션 — DB 이벤트에 title/tag 기반으로 맞춤 생성
  const title = hint?.title ?? "";
  const tags = (hint?.topicTags ?? []).map((t) => t.toLowerCase());
  const kind = hint?.eventKind ?? "";
  const isFree = hint?.priceType === "free";

  // 점수 계산
  let score = 68;
  if (isFree) score += 8;
  if (tags.some((t) => ["ai", "llm", "gpt", "rag", "머신러닝", "딥러닝"].includes(t))) score += 10;
  if (tags.some((t) => ["실습", "workshop", "hands-on", "tutorial"].includes(t))) score += 6;
  if (tags.some((t) => ["networking", "네트워킹", "밋업"].includes(t))) score -= 4;
  if (kind === "conference") score += 4;
  if (kind === "hackathon") score += 5;
  score = Math.min(97, Math.max(50, score));

  // 키워드 기반 대상 추론
  let audience = "IT·AI에 관심 있는 개발자·기획자";
  if (/aws|cloud|인프라|eks|kubernetes/i.test(title + tags.join(" "))) audience = "AWS·클라우드 엔지니어, DevOps";
  else if (/flutter|ios|android|mobile/i.test(title + tags.join(" "))) audience = "모바일 앱 개발자";
  else if (/보안|security|owasp|취약점/i.test(title + tags.join(" "))) audience = "보안 엔지니어, 개발자";
  else if (/rag|llm|langchain|embedding/i.test(title + tags.join(" "))) audience = "AI 엔지니어, LLM 실무 적용을 원하는 개발자";
  else if (/pm|기획|product/i.test(title + tags.join(" "))) audience = "PM, 제품 기획자, 스타트업 창업자";
  else if (/design|디자인/i.test(title + tags.join(" "))) audience = "디자이너, 크리에이터";
  else if (/data|데이터|analytics/i.test(title + tags.join(" "))) audience = "데이터 엔지니어·분석가";

  // 광고 위험 추론
  let adRisk: AiCuration["adSalesRisk"] = "low";
  let adLabel = "광고 위험 낮음";
  if (/summit|expo|conference|전시/i.test(title)) { adRisk = "medium"; adLabel = "광고 위험 보통 (협찬사 발표 가능)"; }
  if (/마케팅|영업|sales|솔루션 소개/i.test(title)) { adRisk = "high"; adLabel = "광고 위험 높음 — 사전 확인 권장"; }

  return {
    recommendationScore: score,
    recommendedAudience: audience,
    reasonToAttend: `${isFree ? "무료로 " : ""}${title.slice(0, 30)}에서 최신 IT/AI 트렌드를 접할 수 있는 기회입니다. 커뮤니티 발표와 네트워킹을 통해 실무 인사이트를 얻을 수 있습니다.`,
    caution: adRisk !== "low" ? "일부 세션이 후원사 제품 홍보를 포함할 수 있습니다. 발표자 소속을 미리 확인하세요." : null,
    preparationTips: "행사 아젠다를 미리 확인하고, 궁금한 점을 메모해 Q&A에서 적극 활용하세요.",
    adSalesRisk: adRisk,
    adSalesRiskLabel: adLabel,
  };
}

export function buildGensparkPrompt(event: {
  title: string;
  startsAt: string | null;
  city: string | null;
  venueName: string | null;
  topicTags: string[];
  primarySourceUrl: string;
  eventKind: string;
}): string {
  const dateStr = event.startsAt
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "Asia/Seoul" }).format(new Date(event.startsAt))
    : "일정 미정";
  const location = [event.city, event.venueName].filter(Boolean).join(" · ") || "장소 미정";
  const tags = event.topicTags.join(", ") || event.eventKind;

  return `다음 무료 IT/AI 세미나를 분석해 줘:

📌 행사명: ${event.title}
📅 일정: ${dateStr}
📍 장소: ${location}
🏷️ 분야: ${tags}
🔗 링크: ${event.primarySourceUrl}

아래 항목별로 한국어로 분석해 줘:
1. 이 행사가 가장 적합한 참석 대상은 누구인가?
2. 입문자도 이해하고 참여할 수 있는 수준인가?
3. 커리어 성장에 실질적인 도움이 되는가? 어떤 면에서?
4. 광고·영업 목적 강연이 포함될 가능성이 있는가?
5. 행사 전에 무엇을 준비하면 더 많은 것을 얻을 수 있는가?
6. 비슷한 주제의 다른 무료 IT/AI 행사가 있다면 추천해 줘.`;
}
