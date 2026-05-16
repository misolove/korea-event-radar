# Korea IT/AI Event Radar

한국의 IT/AI 관련 행사 정보를 수집하고, 무료 여부와 현재 등록 상태를 한 곳에서 보여주는 공개 웹 서비스입니다.

## What This MVP Includes

- `Next.js 16 + React 19 + TypeScript` 기반 공개 웹 앱
- `Turso(SQLite) + Drizzle` 데이터 모델
- `EventUs / Meetup / Luma / OnOffMix / 공식 페이지` 중심의 수집 파이프라인
- `등록 가능 / 대기 가능 / 마감 / 지난 행사 / 확인 필요` 상태 노출
- `직접 확인`과 `텍스트 추론` 상태 출처 구분
- GitHub Actions 기반 1일 4회 수집 워크플로

## Run

```bash
cd /Users/letitbe/letitbe/korea-event-radar
npm install
cp .env.example .env.local
# .env.local에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPS_SECRET 입력
npm run dev
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다.

## Database Setup

```bash
cd /Users/letitbe/letitbe/korea-event-radar
npm install
npm run db:push
npm run ingest
```

- `TURSO_DATABASE_URL`이 없으면 UI와 읽기 API는 데모 데이터로 동작합니다.
- 실제 수집 결과 저장과 `/api/ops/recheck`는 `TURSO_DATABASE_URL`이 있어야 동작합니다.
- 로컬 SQLite로만 빠르게 테스트하고 싶다면 `TURSO_DATABASE_URL=file:local.db`처럼 사용할 수도 있습니다.

## Expanded Source Coverage

- `EventUs` 채널/행사: Welcome to AI World, AWSKRUG, Upstage
- `Meetup`: 서울 AI/개발자 밋업 검색
- `Luma`: 서울/한국 관련 AI 밋업
- `GDG Community`: DevFest, I/O Extended, Build with AI
- `Ticketa`: 한국 개발자 커뮤니티 행사
- `AWS / Microsoft Reactor / Google Developers` 공식 행사 페이지
- `LinkedIn` 공개 회사/커뮤니티 페이지

## Deploy

- 빠른 배포 순서는 [deploy-vercel-turso.md](/Users/letitbe/letitbe/korea-event-radar/docs/deploy-vercel-turso.md)를 따르면 됩니다.
- 핵심은 `Turso DB 생성 -> TURSO_DATABASE_URL/TURSO_AUTH_TOKEN 반영 -> npm run db:push -> Vercel 환경변수 설정 -> GitHub Actions secrets 등록` 순서입니다.
- 읽기 전용 공개 배포를 원하면 Vercel에는 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `PUBLIC_OPS_MODE=summary`, `DISABLE_WRITE_ROUTES=1`만 두고, 수집/cleanup은 계속 맥북에서 실행하면 됩니다.

## Scripts

- `npm run dev`: 개발 서버
- `npm run build`: 프로덕션 빌드
- `npm run test`: 유닛 테스트
- `npm run test:e2e`: Playwright E2E
- `npm run ingest`: 시드 기반 수집 실행
- `npm run cleanup:past -- --before=2026-01-01`: 오래된 지난 행사 dry-run
- `npm run cleanup:past -- --before=2026-01-01 --apply`: 오래된 지난 행사 실제 삭제
- `npm run db:push`: 스키마를 DB에 반영

## Environment

- `TURSO_DATABASE_URL`: Turso libsql URL 또는 `file:local.db`
- `TURSO_AUTH_TOKEN`: Turso 데이터베이스 인증 토큰
- URL은 `turso db show --url <db-name>`, 토큰은 `turso db tokens create <db-name>`으로 가져오는 값을 써야 합니다.
- `DATABASE_URL`: 레거시 별칭. 없으면 무시해도 됩니다.
- `OPS_SECRET`: 내부 재확인 엔드포인트 보호용 시크릿
- `OPENAI_API_KEY`: 애매한 행사 분류 보조용 선택 사항
- `OPENAI_MODEL`: 기본 `gpt-5.4-mini`
- `PUBLIC_OPS_MODE`: `full | summary | off`, 공개 `/ops` 범위 제어
- `DISABLE_WRITE_ROUTES`: `1`이면 `/api/ops/recheck` 비활성화
- `EVENTS_REVALIDATE_SECONDS`: 읽기 API/목록/상세의 서버 캐시 TTL
- `OPS_REVALIDATE_SECONDS`: `/ops` 요약 캐시 TTL
