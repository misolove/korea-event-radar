# Ingestion — 수집 파이프라인 가이드

## 씨드 (seeds.ts)

### 씨드 타입

```typescript
type SourceSeed = {
  id: string;           // 고유 식별자 (CLI에서 필터링용)
  label: string;        // 사람이 읽는 이름
  url: string;          // 크롤할 URL
  sourceName: string;   // "EventUs" | "Meetup" | "OnOffMix" | ...
  sourceKind: string;   // "platform" | "official" | "social"
  mode: "list-page" | "event-page" | "official-page" | "social-page";
  tags: string[];
}
```

### ⚠️ 씨드 추가 원칙

| 모드 | 설명 | 권장 여부 |
|------|------|-----------|
| `list-page` | 행사 목록 페이지 → 자동 발굴 | ✅ 권장 |
| `event-page` | 특정 행사 URL 직접 지정 | ❌ 금지 (행사 종료 후 좀비 데이터) |

**event-page 씨드를 쓰면** 행사가 끝난 뒤에도 매 ingest마다 해당 URL을 크롤해서 과거 행사를 재삽입하려 함. `normalize.ts`의 `starts_at < 어제` 필터가 막아주지만, 불필요한 크롤 트래픽이 발생함.

## 소스별 수집 방식

### EventUs (`extractors/eventus.ts`)

```
discoverEventUsViaApi()
  → api.event-us.kr/v1/engine/suggest?query=AI세미나&size=20
  → 6개 쿼리 순서대로 실행 (300ms 간격)
  → 중복 제거 후 https://event-us.kr/event/{id} URL 목록 반환

extractEventUs()
  → HTML 파싱 (og:title, h1, og:description)
  → JSON-LD startDate/endDate 파싱
  → "신청하기" 버튼 href → registrationUrl
```

**쿼리 목록**: `"AI 세미나"`, `"클라우드"`, `"개발자"`, `"데이터"`, `"스타트업"`, `"IT 밋업"`

쿼리를 추가/변경하면 더 많은 행사 발굴 가능.

### Meetup (`extractors/meetup.ts`)

```
discoverMeetupLinks()
  → 그룹 페이지 HTML에서 /events/NNN/ 링크 추출

extractMeetup()
  → JSON-LD Event 파싱 (startDate, endDate, location)
  → __APOLLO_STATE__ JSON에서 feeSettings.amount 추출
  → feeSettings: null → free / {amount: N} → paid (N원)
```

**가격 파싱**: Meetup의 `__APOLLO_STATE__`에 `"feeSettings":(null|{...})` 패턴으로 존재.

### OnOffMix (`extractors/onoffmix.ts`)

```
discoverOnOffMixViaCategories()
  → /event/main/?c=101 (교육/워크숍)
  → /event/main/?c=102 (강연/세미나)
  → /event/main/?c=104 (컨퍼런스/포럼)
  → href="/event/NNN" 패턴 추출

extractOnOffMix()
  → JSON-LD Event 파싱
  → startDate: "2026-05-26 09:00:00+09:00" 형식
  → offers.price: 0 → free / N → paid
```

**날짜 파싱**: OnOffMix는 항상 JSON-LD `@type: "Event"`를 제공함. `extractStructuredEvent()`로 파싱.

## normalizeExtractedEvent() 필터 체인

```
입력: ExtractedEventDraft
  │
  ├── title 비어있음? → null 반환
  ├── looksLikeJunkEventPage()? → null 반환
  │   (로그인 페이지, 플랫폼 홈 등)
  ├── looksNonTech(title)? → null 반환
  │   (경암바이오, 계획기부, 힐링콘서트 등)
  ├── starts_at < 어제? → null 반환
  │   (과거 행사는 DB 저장 안 함)
  ├── URL tracking params 제거
  │   (recId, recSource, searchId, eventOrigin, utm_*)
  ├── 2만원 이하 유료 → free 재분류
  │
출력: normalized ExtractedEventDraft | null
```

## persistEventDrafts() 동작

- **slug 기준 upsert**: 같은 slug가 이미 있으면 `update`, 없으면 `insert`
- **slug 생성**: `slugifyText(title)` — 한글 포함 URL-safe 변환
- 동일 행사가 여러 소스에서 발굴되면 나중에 온 것이 덮어씀 (confidence_score 높은 쪽 우선 로직 추가 가능)

## 새 씨드 추가 방법

```typescript
// src/ingestion/seeds.ts
{
  id: "meetup-new-group",
  label: "새 그룹 이름",
  url: "https://www.meetup.com/new-group/events/",
  sourceName: "Meetup",
  sourceKind: "platform",
  mode: "list-page",
  tags: ["ai", "seoul"],
}
```

추가 후 테스트:
```bash
npm run ingest -- meetup-new-group
```

## 새 플랫폼 extractor 추가 방법

1. `src/ingestion/extractors/newplatform.ts` 생성
   - `discoverNewPlatformLinks(url, html): string[]`
   - `extractNewPlatform(url, html, discoveredFromUrl): ExtractedEventDraft | null`

2. `extractors/index.ts`에 import + dispatch 추가:
```typescript
if (seed.sourceName === "NewPlatform" && seed.mode === "list-page") {
  // 필요시 API 기반 발굴 로직
}
// extractCandidate()에서:
if (host.includes("newplatform.com")) {
  return extractNewPlatform(candidate.url, html, candidate.discoveredFromUrl);
}
```

3. `seeds.ts`에 list-page 씨드 추가
