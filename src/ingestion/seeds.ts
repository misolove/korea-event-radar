import type { SourceSeed } from "@/ingestion/types";

export const sourceSeeds: SourceSeed[] = [
  // ── 아래 event-page 씨드들은 과거 행사라 제거 (2026-05-16) ──
  // eventus-design-program, eventus-chatgpt-report: 2025년 지난 행사
  // meetup-code-seoul-ai (314084114): 2025년 지난 행사
  // luma-ai-is-near-seoul (uab13j1b): 2025년 지난 행사
  {
    id: "onoffmix-home",
    label: "OnOffMix 홈",
    url: "https://onoffmix.com",
    sourceName: "OnOffMix",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["discovery"],
  },
  {
    id: "meetup-find-seoul-ai",
    label: "Meetup 서울 AI 검색",
    url: "https://www.meetup.com/ko-KR/find/?keywords=ai&location=kr--seoul",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["discovery", "seoul"],
  },
  {
    id: "eventus-channel-aiworld",
    label: "Welcome to AI World 채널",
    url: "https://event-us.kr/welcometoai/event",
    sourceName: "EventUs",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["eventus", "ai", "channel"],
  },
  {
    id: "eventus-channel-awskrug",
    label: "AWSKRUG EventUs 채널",
    url: "https://event-us.kr/awskrug/event",
    sourceName: "EventUs",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["aws", "community", "channel"],
  },
  {
    id: "fastcampus-openseminar",
    label: "FastCampus 오픈세미나",
    url: "https://fastcampus.co.kr/openseminar_new",
    sourceName: "FastCampus",
    sourceKind: "official",
    mode: "list-page",
    tags: ["fastcampus", "seminar", "ai", "dev", "online"],
  },
  // 아래 씨드들은 2025년 지난 행사 — 제거 (2026-05-16)
  // eventus-upstage-ai-talk (2024-09-11), eventus-aws-community-day (2025-11),
  // gdg-devfest-cloud-seoul (2025-11), gdg-io-extended-seoul (2025-08),
  // gdg-build-with-ai-pangyo (2025-05), aws-summit-seoul (날짜 불명),
  // microsoft-reactor-ai-bootcamp, microsoft-reactor-ai-factory (2025년)
  {
    id: "google-devfest-platform",
    label: "Google DevFest 플랫폼",
    url: "https://developers.google.com/community/devfest",
    sourceName: "Google Developers",
    sourceKind: "official",
    mode: "official-page",
    tags: ["official", "community", "devfest"],
  },
  {
    id: "linkedin-megazonecloud",
    label: "MegazoneCloud LinkedIn",
    url: "https://kr.linkedin.com/company/megazonecloud",
    sourceName: "LinkedIn",
    sourceKind: "social",
    mode: "social-page",
    tags: ["social"],
    enabledByDefault: false,
  },
  // ticketa 씨드들: 2025년 지난 행사 — 제거 (2026-05-16)
  // copilot-dev-days (2026-04-25 지남), grafana-seoul, flutter-seoul-vibe, build-with-ai-busan
  // ── Meetup 실시간 발굴 (2026-05-16) ──────────────────────────────
  {
    id: "meetup-ai-seoul-adoption-talk",
    label: "AI Adoption Talk - AI Seoul",
    url: "https://www.meetup.com/ai-seoul-public/events/314764876/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["ai", "seoul", "meetup", "talk"],
  },
  {
    id: "meetup-codeseoul-automate-agents",
    label: "Automate Development with Agents - Code Seoul",
    url: "https://www.meetup.com/codeseoul/events/314473437/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["ai", "agents", "dev", "seoul"],
  },
  {
    id: "meetup-owasp-ai-vuln",
    label: "OWASP Seoul AI 취약점 세미나",
    url: "https://www.meetup.com/owasp-seoul/events/314395456/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["ai", "security", "owasp", "seoul"],
  },
  {
    id: "meetup-mug-rag-prototyping",
    label: "MUG x GDG 로컬 RAG 프로토타이핑",
    url: "https://www.meetup.com/mongodb-usergroup-seoul/events/314765122/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["rag", "mongodb", "gemma", "ai", "seoul"],
  },
  // ── Eventbrite 발굴 ────────────────────────────────────────────────
  {
    id: "eventbrite-seoul-tech-mixer",
    label: "Seoul Tech Mixer - AI / IT Networking",
    url: "https://www.eventbrite.com/e/seoul-tech-mixer-and-social-tech-ai-data-it-tickets-1987413369889",
    sourceName: "Eventbrite",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["networking", "ai", "tech", "seoul"],
  },
  {
    id: "eventbrite-autonomous-robotics-kaist",
    label: "Autonomous Robotics @ KAIST",
    url: "https://www.eventbrite.com/e/autonomous-robotics-tickets-1986923332173",
    sourceName: "Eventbrite",
    sourceKind: "platform",
    mode: "event-page",
    tags: ["robotics", "ai", "kaist", "daejeon"],
  },
  // ── Meetup 발견 페이지 ─────────────────────────────────────────────
  {
    id: "meetup-find-ai-seoul",
    label: "Meetup Seoul AI 검색 (발견)",
    url: "https://www.meetup.com/ko-KR/find/?keywords=AI&location=kr--seoul&eventType=inPerson",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["discovery", "ai", "seoul"],
  },

  // ── Meetup 커뮤니티 그룹 목록 (2026-05-16 검증 완료) ─────────────

  // 데이터/ML
  {
    id: "meetup-pydata-seoul",
    label: "PyData Seoul",
    url: "https://www.meetup.com/ko-KR/pydata-seoul/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["python", "data", "ml", "ai", "seoul"],
  },
  {
    id: "meetup-airflow-korea",
    label: "Korea Apache Airflow User Group",
    url: "https://www.meetup.com/ko-KR/korea-apache-airflow-user-group/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["data", "airflow", "pipeline", "seoul"],
  },
  {
    id: "meetup-opensearch-seoul",
    label: "OpenSearch Project Seoul",
    url: "https://www.meetup.com/ko-KR/opensearch-project-seoul/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["data", "search", "opensearch", "seoul"],
  },

  // 클라우드/인프라
  {
    id: "meetup-hashicorp-korea",
    label: "HashiCorp User Group Korea",
    url: "https://www.meetup.com/ko-KR/hashicorp-user-group-korea/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["devops", "terraform", "vault", "cloud", "seoul"],
  },
  {
    id: "meetup-azure-seoul",
    label: "Seoul Azure User Group",
    url: "https://www.meetup.com/ko-KR/seoul-azure-user-group/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["azure", "cloud", "microsoft", "seoul"],
  },
  {
    id: "meetup-google-cloud-korea",
    label: "Google Cloud Korea",
    url: "https://www.meetup.com/ko-KR/google-cloud-korea/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["gcp", "cloud", "google", "seoul"],
  },
  {
    id: "meetup-kcd-korea",
    label: "KCD Korea (Kubernetes Community Days)",
    url: "https://www.meetup.com/ko-KR/kcd-korea/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["kubernetes", "cloud", "devops", "seoul"],
  },

  // 언어/프레임워크
  {
    id: "meetup-seoul-kotlin",
    label: "Seoul Kotlin User Group",
    url: "https://www.meetup.com/ko-KR/seoul-kotlin-user-group/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["kotlin", "android", "jvm", "dev", "seoul"],
  },
  {
    id: "meetup-seoul-js",
    label: "Seoul.JS",
    url: "https://www.meetup.com/ko-KR/seoul-js/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["javascript", "typescript", "web", "dev", "seoul"],
  },
  {
    id: "meetup-seoul-rust",
    label: "Seoul Rust Meetup",
    url: "https://www.meetup.com/ko-KR/seoul-rust-meetup/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["rust", "systems", "dev", "seoul"],
  },
  {
    id: "meetup-seoul-flutter",
    label: "Seoul Flutter Developers",
    url: "https://www.meetup.com/ko-KR/seoul-flutter-developers/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["flutter", "dart", "mobile", "dev", "seoul"],
  },

  // Google 생태계
  {
    id: "meetup-gdg-seoul",
    label: "GDG Seoul",
    url: "https://www.meetup.com/ko-KR/gdgseoul/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["google", "android", "ai", "dev", "seoul"],
  },

  // 프로덕트/PM
  {
    id: "meetup-korea-pm",
    label: "Korea Product Managers",
    url: "https://www.meetup.com/ko-KR/korea-product-managers/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["product", "pm", "startup", "seoul"],
  },

  // iOS/모바일
  {
    id: "meetup-seoul-ios",
    label: "Seoul iOS Meetup",
    url: "https://www.meetup.com/ko-KR/seoul-ios-meetup/events/",
    sourceName: "Meetup",
    sourceKind: "platform",
    mode: "list-page",
    tags: ["ios", "swift", "mobile", "dev", "seoul"],
  },
];
