# AGENTS.md — AI Agent Onboarding Guide

> **이 파일을 먼저 읽으세요.** 다른 LLM/에이전트가 이 프로젝트를 이어받을 때 필요한 모든 컨텍스트입니다.

## 프로젝트 한 줄 요약

**Seminar Scout AI** — 서울 IT/AI 무료 세미나를 자동으로 수집·검증·큐레이팅하는 웹 서비스.

- **Live URL**: https://korea-event-radar.vercel.app
- **GitHub**: https://github.com/misolove/korea-event-radar
- **DB**: Turso (libSQL/SQLite) @ `libsql://letitbe-letitbe.aws-ap-northeast-1.turso.io`

---

## 핵심 원칙 (절대 어기지 말 것)

1. **무료 행사만** — 2만원 초과 유료 행사는 DB에 넣지 않음 (2만원 이하 커뮤니티비는 `free`로 재분류)
2. **서울 IT 행사만** — 비IT(경제, 힐링, 바이오 등) 행사는 `looksNonTech()` 필터로 차단
3. **API 키는 서버에만** — `CLAUDE_API_KEY`는 절대 브라우저에 노출 금지
4. **event-page 씨드 금지** — 특정 이벤트 URL을 씨드에 넣으면 행사 종료 후 쓰레기 데이터 재삽입됨. **list-page 씨드만** 사용
5. **배포 전 `npx tsc --noEmit`** 통과 필수

---

## 디렉터리 구조

```
src/
├── app/
│   ├── page.tsx                    # 홈 (필터 칩 + 이벤트 목록)
│   ├── events/[slug]/page.tsx      # 이벤트 상세
│   ├── ops/page.tsx                # 내부 운영 대시보드
│   └── api/
│       ├── events/route.ts         # GET /api/events (목록)
│       ├── events/[slug]/route.ts  # GET /api/events/:slug (상세)
│       ├── cron/ingest/route.ts    # GET /api/cron/ingest (일일 크론)
│       └── verify-event/route.ts  # POST /api/verify-event (미사용)
├── components/
│   ├── event-card.tsx              # 이벤트 카드 (뱃지 + 등록 링크)
│   ├── featured-event.tsx          # 상단 추천 이벤트
│   ├── filter-bar.tsx              # 필터 칩 UI
│   └── refresh-button.tsx          # 마지막 수집 시간 표시
├── db/
│   ├── schema.ts                   # Drizzle 스키마 (events, eventEvidence, ...)
│   ├── persist.ts                  # upsert 로직 (slug 기준 중복 방지)
│   ├── repository.ts               # listEvents(), getEvent(), getLastIngestTime()
│   └── client.ts                   # Turso 클라이언트
├── ingestion/
│   ├── seeds.ts                    # 수집 씨드 목록 (~30개 list-page 씨드)
│   ├── run.ts                      # 수집 오케스트레이터
│   ├── normalize.ts                # 추출 → DB 저장 전 정규화 (필터 포함)
│   ├── dedupe.ts                   # slug 기반 중복 제거
│   ├── fetch.ts                    # HTML 크롤러
│   ├── types.ts                    # SourceSeed, ExtractedEventDraft 타입
│   └── extractors/
│       ├── index.ts                # discoverCandidates() + extractCandidate()
│       ├── common.ts               # 공통 파싱 헬퍼
│       ├── eventus.ts              # EventUs API + HTML 수집
│       ├── meetup.ts               # Meetup JSON-LD 파싱
│       ├── onoffmix.ts             # OnOffMix 카테고리 수집
│       ├── luma.ts                 # Luma 파싱
│       ├── eventbrite.ts           # Eventbrite 파싱
│       └── generic.ts             # 범용 파싱
├── lib/
│   ├── claude-verifier.ts          # Claude Haiku로 등록 상태 검증
│   ├── ai-curation.ts              # AI 추천 점수 + Genspark 프롬프트 생성
│   ├── event-model.ts              # 공유 타입/enum 정의
│   ├── format.ts                   # 날짜/가격 포맷팅
│   └── env.ts                      # 환경변수 접근
└── maintenance/
    ├── cleanup-past-events.ts      # 지난 행사 삭제
    └── cleanup-invalid-events.ts  # 무효 행사 삭제
```

---

## 데이터 흐름

```
seeds.ts (list-page URLs)
    ↓ discoverCandidates()
event URLs 발굴
    ↓ extractCandidate()
ExtractedEventDraft (raw)
    ↓ normalizeExtractedEvent()
  - 비IT 필터 (looksNonTech)
  - 과거 행사 필터 (startsAt < 어제)
  - tracking param 제거
  - 2만원 이하 유료 → free 재분류
    ↓ persistEventDrafts()
DB upsert (slug 기준)
    ↓ [Cron: 매일 09:00 KST]
verifyEvent() → Claude Haiku
    ↓ registration_status 업데이트
    ↓ cleanupPastEvents()
과거 행사 삭제
```

---

## DB 스키마 핵심

**`events` 테이블** (주요 컬럼):

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `slug` | text UNIQUE | URL-safe 식별자 |
| `title` | text | 행사명 |
| `starts_at` | integer (ms epoch) | 시작 시각 |
| `registration_url` | text | 등록 링크 |
| `registration_status` | enum | `open/waitlist/closed/past/unknown` |
| `price_type` | enum | `free/paid/mixed/unknown` |
| `price_text` | text | 가격 텍스트 (예: "무료", "5,000원 커뮤니티비") |
| `confidence_score` | integer | 0–100 |

> ⚠️ `starts_at`은 **밀리초 epoch** 저장. Drizzle이 `Date` 객체로 반환. `rowToSummary()`에서 `.toISOString()`으로 변환.

---

## 수집 소스별 전략

| 소스 | 방식 | 비고 |
|------|------|------|
| **EventUs** | `api.event-us.kr/v1/engine/suggest` API | 인증 불필요, 6개 쿼리 × 20건 |
| **Meetup** | 그룹 list-page HTML | 14개 서울 IT 그룹 |
| **OnOffMix** | `/event/main/?c=101,102,104` | 교육/세미나/컨퍼런스 카테고리 |
| **Luma** | list-page HTML | Cloudflare 차단 빈번 |
| **Eventbrite** | list-page HTML | 한국 행사 적음 |

---

## Claude 검증 (claude-verifier.ts)

- **모델**: `claude-haiku-4-5`
- **트리거**: Cron (매일 09:00 KST), NOT 유저 요청
- **비용**: ~$0.002/day (이벤트 10–40개 기준)
- **반환 필드**: `status`, `confidence`, `reason`, `registrationDeadline`, `eventYear`, `registrationUrl`
- **stale_url**: 페이지가 다른 연도 행사를 가리킬 때 → DB에서 `past`로 마킹 → cleanup에서 삭제

---

## Cron (vercel.json)

```json
{ "crons": [{ "path": "/api/cron/ingest", "schedule": "0 0 * * *" }] }
```
- 매일 00:00 UTC = 09:00 KST
- 인증: `Authorization: Bearer {OPS_SECRET}`
- 3단계: (1) runIngestion → (2) verifyEvent 전체 → (3) cleanupPastEvents

---

## 필터 규칙 (normalize.ts)

### 차단 (비IT)
`looksNonTech()` — 아래 패턴이 제목에 있으면 ingest 차단:
- 바이오유스캠프, 계획기부, 유산기부, 힐링콘서트, 강형욱, 이대호
- 부동산, 재테크, 커피포럼, 바이어응대, 킥스타터크라우드
- WISE Vocabulary, 경암바이오, 의약학, 위성정보통신, 원폭, 핵무기, SW축정

### 가격 재분류
- `price_type = 'paid'` + `price_text` 금액 ≤ 20,000원 → `free (N원 커뮤니티비)`
- Meetup `feeSettings: null` → `free`
- OnOffMix `offers.price = 0` → `free`

### URL 정제
tracking params 자동 제거: `recId`, `recSource`, `searchId`, `eventOrigin`, `utm_*`

---

## 알려진 제약/이슈

| 이슈 | 상태 | 해결책 |
|------|------|--------|
| Luma discover | Cloudflare 차단 | list-page 씨드만, crawl 실패 시 스킵 |
| Google Forms URL | 크롤 불가 | Claude verifier → `unknown (10%)` 반환 |
| OnOffMix 1원 행사 | 얼리버드 마케팅 관행 | `free(얼리버드)`로 재분류 |
| Festa.io | 서비스 종료 (Squarespace) | 씨드에서 제거 완료 |

---

## 배포

```bash
npx tsc --noEmit          # 타입 체크
npx vercel --prod         # 프로덕션 배포
```

**Vercel 환경변수** (필수):
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `OPS_SECRET`
- `CLAUDE_API_KEY`

---

## 로컬 수집 실행

```bash
# 전체
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run ingest

# 특정 씨드만
npm run ingest -- onoffmix-home meetup-gdg-seoul
```

---

## 다음 개선 포인트 (우선순위 순)

1. **Ticketa list-page 씨드 추가** — `https://ticketa.co/` 목록 페이지 크롤
2. **EventUs extractor organizer 개선** — 현재 첫 번째 `<a>` 태그에서 추출 → 부정확
3. **AI curation 점수 고도화** — `ai-curation.ts`의 정적 점수맵 → LLM 기반 동적 점수
4. **카드 UI 개선** — AI curation panel 기본 접힘 (현재 항상 펼쳐짐)
5. **이벤트 알림** — 새 행사 발견 시 Slack/Telegram 웹훅
6. **다중 도시 지원** — 현재 서울 집중, 부산/판교 확장 가능
