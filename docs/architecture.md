# Architecture — 시스템 아키텍처

## 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 15)                   │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  홈 UI   │  │ 상세 UI  │  │  Cron: /api/cron/ingest │ │
│  │ page.tsx │  │ [slug]   │  │  매일 09:00 KST         │ │
│  └────┬─────┘  └────┬─────┘  └──────────┬─────────────┘ │
│       │              │                   │               │
│  ┌────▼──────────────▼───────────────────▼─────────────┐ │
│  │              /api/events (REST)                      │ │
│  └────────────────────────┬─────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │    Turso (libSQL/SQLite)    │
              │  events + eventEvidence    │
              │  statusSnapshots + runs    │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │   Ingestion Pipeline       │
              │  seeds → discover →        │
              │  extract → normalize →     │
              │  persist                   │
              └─────────────┬──────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───▼───┐             ┌─────▼─────┐          ┌──────▼──────┐
│EventUs│             │  Meetup   │          │  OnOffMix   │
│  API  │             │ JSON-LD   │          │ Category    │
└───────┘             └───────────┘          └─────────────┘
```

## 컴포넌트별 책임

### Next.js App Router
- `app/page.tsx` — 서버 컴포넌트. `listEvents()` 호출 → 필터/정렬 적용 → 클라이언트로 전달
- `app/events/[slug]/page.tsx` — 상세 페이지. `getEvent(slug)` 호출
- `app/api/events/route.ts` — REST API. `?sort=date|score|free`, `?priceType=free`, `?status=open`
- `app/api/cron/ingest/route.ts` — Vercel Cron. `OPS_SECRET` Bearer 인증

### Ingestion Pipeline
1. `seeds.ts` → `SourceSeed[]` (list-page URL 목록)
2. `extractors/index.ts::discoverCandidates()` → 각 소스별 이벤트 URL 발굴
3. `extractors/index.ts::extractCandidate()` → HTML/API → `ExtractedEventDraft`
4. `normalize.ts::normalizeExtractedEvent()` → 필터링 + 정규화
5. `db/persist.ts::persistEventDrafts()` → DB upsert (slug 기준)

### Claude Verifier
- `lib/claude-verifier.ts::verifyEvent()` — 페이지 크롤 → Claude Haiku 분석
- 반환: `status | confidence | reason | eventYear | registrationDeadline`
- Cron에서만 호출. 유저 요청 시 호출 금지 (비용 제어)

## 데이터 모델

### events (주 테이블)
```sql
id            TEXT PRIMARY KEY
slug          TEXT UNIQUE          -- URL safe, 중복 방지 키
title         TEXT
summary       TEXT
organizer     TEXT
primary_source TEXT               -- "EventUs" | "Meetup" | "OnOffMix" ...
primary_source_url TEXT
registration_url TEXT
city          TEXT
venue_name    TEXT
starts_at     INTEGER              -- ms epoch (밀리초)
ends_at       INTEGER
registration_deadline INTEGER
registration_status TEXT          -- open|waitlist|closed|past|unknown
status_origin TEXT                -- direct|inferred
price_type    TEXT                -- free|paid|mixed|unknown
price_text    TEXT                -- "무료", "5,000원 커뮤니티비" 등
event_kind    TEXT                -- seminar|workshop|conference|meetup|other
delivery_type TEXT                -- offline|online|hybrid|unknown
topic_tags    TEXT (JSON)         -- ["AI", "클라우드", ...]
confidence_score INTEGER          -- 0–100
last_checked_at INTEGER
last_seen_at  INTEGER
created_at    INTEGER
updated_at    INTEGER
```

> **중요**: `starts_at`은 **밀리초 epoch** 저장. JS `Date.now()` 형식.
> Drizzle의 `mode: "timestamp_ms"` 옵션으로 `Date` 객체로 읽힘.

### eventEvidence (증거 테이블)
행사 하나당 여러 소스에서 수집된 증거 기록. 주로 디버깅용.

### statusSnapshots (상태 이력)
Claude 검증 결과가 변경될 때마다 스냅샷 저장. 상세 페이지 `<details>` 섹션에 표시.

### ingestionRuns (수집 실행 이력)
Cron 실행 기록. `getLastIngestTime()`으로 홈 UI에 마지막 수집 시간 표시.
