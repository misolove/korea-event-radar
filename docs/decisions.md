# Decisions — 주요 기술 결정 기록

주요 설계 결정과 그 이유를 기록합니다. 나중에 "왜 이렇게 했지?" 라는 질문에 답하기 위한 문서입니다.

---

## 2026-05-16: event-page 씨드 → list-page 씨드 전환

**결정**: 특정 이벤트 URL을 씨드에 넣는 방식 폐기. 그룹/목록 페이지 씨드만 허용.

**이유**: event-page 씨드는 행사가 끝난 뒤에도 계속 크롤되어 과거 행사를 재삽입하려 함. 수동 관리 부담이 큼.

**결과**: 씨드 수는 줄었지만 자동 발굴 커버리지가 훨씬 넓어짐.

---

## 2026-05-16: 유저 요청 Claude 검증 버튼 제거

**결정**: "지금 검증" 버튼 UI 제거. Claude 검증은 Cron에서만 실행.

**이유**: 유저가 버튼을 마구 누르면 Claude API 비용 폭등 위험. 33개 이벤트 × $0.0001/call = $0.003/day로 충분함.

**결과**: Verify 버튼 컴포넌트(`verify-button.tsx`)는 코드에 남아있지만 렌더링 안 됨. 재활성화 시 API rate limiting 로직 필요.

---

## 2026-05-16: starts_at 밀리초 epoch 저장

**결정**: `starts_at`을 밀리초 epoch integer로 저장.

**이유**: Turso/SQLite에 DateTime 타입이 없음. Drizzle의 `mode: "timestamp_ms"` 옵션이 자동으로 `Date` ↔ `integer` 변환.

**주의**: `parseInt("2026-05-23T...")` = `2026` (연도 숫자), `2026 * 1000` = `2026000ms` = 1970년. 반드시 `new Date(str).getTime()` 사용.

---

## 2026-05-16: 2만원 이하 유료 → free 재분류

**결정**: `price_type = 'paid'` + 금액 ≤ 20,000원 → `free (N원 커뮤니티비)` 자동 재분류.

**이유**: AWSKRUG(5천원), GDG 행사(1만원) 등 커뮤니티 운영비 명목의 소액 참가비는 사실상 무료 행사. "무료 큐레이터" 컨셉에 부합.

**기준 근거**: 2만원은 밥 한 끼 + 커피 수준. 그 이상은 정식 유료 행사.

---

## 2026-05-16: OnOffMix 카테고리 페이지 직접 크롤

**결정**: OnOffMix 홈 대신 카테고리 REST 페이지(`/event/main/?c=101,102,104`) 크롤.

**이유**: OnOffMix 홈은 동적 렌더링(React SPA). 서버사이드 크롤 시 이벤트 링크가 HTML에 없음. 카테고리 페이지는 서버사이드 렌더링으로 href 링크 직접 노출.

---

## 2026-05-16: EventUs 공개 API 활용

**결정**: EventUs 채널 HTML 파싱 → `api.event-us.kr/v1/engine/suggest` API 호출로 전환.

**이유**: 채널 페이지도 SPA. HTML에 이벤트 링크가 없음. API는 인증 없이 접근 가능하며 ID 기반 URL 생성이 가능.

**결과**: 수집량 4개 → 116개 (29배).

---

## 2026-05-16: Claude stale_url 감지 추가

**결정**: Claude verifier에 `stale_url` 상태 추가. 페이지가 다른 연도 행사를 가리킬 때 반환.

**이유**: EventUs 등에서 행사 URL을 재사용(예: 2024년 행사 페이지가 그대로 남아있음). 연도 하드코딩 없이 `currentYear = new Date().getFullYear()`로 동적 감지.

**처리**: `stale_url` → DB에서 `past` 상태로 마킹 → Cron cleanup에서 삭제.

---

## 2026-05-16: Turso (libSQL) + Drizzle 선택

**결정**: PostgreSQL 대신 Turso(SQLite 기반) 사용.

**이유**:
- 무료 티어로 충분 (행사 수백 개 수준)
- Vercel Edge 호환
- Drizzle ORM이 타입 안전성 제공
- 복잡한 JOIN 쿼리 불필요 (단순 CRUD)

**한계**: 풀텍스트 검색, 복잡한 집계 쿼리에는 PostgreSQL이 낫지만 현재 규모에서는 불필요.

---

## 2026-05-16: Vercel Cron (무료 티어)

**결정**: GitHub Actions 대신 Vercel Cron 사용.

**이유**:
- 별도 인프라 불필요
- `vercel.json`에 스케줄 정의로 관리 단순화
- 무료 티어에서 1일 1회 실행 가능
- `maxDuration: 300` (5분) 내에 전체 파이프라인 완료 가능

**주의**: Vercel Cron은 UTC 기준. `0 0 * * *` = 09:00 KST.
