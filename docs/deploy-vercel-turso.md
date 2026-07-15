# Vercel + Turso 배포 가이드

## 1. Turso 준비

1. Turso에서 데이터베이스를 만듭니다.
2. `turso db show --url <db-name>` 결과를 `TURSO_DATABASE_URL`로 사용합니다.
3. `turso db tokens create <db-name>` 결과를 `TURSO_AUTH_TOKEN`으로 사용합니다.
3. 로컬에서 다음을 실행합니다.

```bash
cd /Users/letitbe/letitbe/korea-event-radar
cp .env.example .env.local
# .env.local에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPS_SECRET 입력
npm install
npm run db:push
```

- 로컬 파일 SQLite만 쓰려면 `TURSO_DATABASE_URL=file:local.db`로 둘 수 있고, 이 경우 `TURSO_AUTH_TOKEN`은 필요 없습니다.
- Turso 플랫폼용 API token과 DB auth token은 다릅니다. 앱/Drizzle 연결에는 DB auth token이 필요합니다.

## 2. 첫 수집 검증

```bash
cd /Users/letitbe/letitbe/korea-event-radar
npm run ingest
```

- 이 단계가 끝나면 `/ops`에서 최근 수집 상태를 바로 볼 수 있습니다.

## 3. Vercel 배포

1. Vercel에서 `/Users/letitbe/letitbe/korea-event-radar`를 프로젝트 루트로 연결합니다.
2. 환경변수에 아래 값을 넣습니다.

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `PUBLIC_OPS_MODE=summary`
- `DISABLE_WRITE_ROUTES=1`
- `OPS_SECRET`
- `EVENTS_REVALIDATE_SECONDS=300`
- `OPS_REVALIDATE_SECONDS=600`
- `OPENAI_API_KEY` (선택)
- `OPENAI_MODEL` (선택, 기본 `gpt-5.4-mini`)

3. Build Command는 기본값 `npm run build`, Output은 Next.js 자동 감지를 그대로 씁니다.

- `/api/cron/ingest`는 Vercel Cron과 수동 실행 모두 `Authorization: Bearer {OPS_SECRET}` 헤더가 필요합니다.
- `/api/ops/recheck`는 `DISABLE_WRITE_ROUTES=1` 또는 `OPS_SECRET` 미설정 상태에서 404가 됩니다.

## 4. GitHub Actions 시크릿

`.github/workflows/ingest.yml`이 동작하려면 저장소 시크릿에 아래 값을 넣습니다.

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `OPS_SECRET`
- `OPENAI_API_KEY` (선택)

맥북 로컬에서 수집/정리를 계속할 계획이면 GitHub Actions 시크릿은 필수가 아닙니다.

## 5. 운영 체크리스트

- `/`에서 목록/필터/상세 이동 확인
- `/api/events` 응답 확인
- `/ops`에서 공개 요약만 보이는지 확인
- `POST /api/ops/recheck`가 404로 차단되는지 확인

## 6. 추천 다음 단계

- 시드 레지스트리에 한국 커뮤니티/주최사 URL을 계속 추가
- 상태 추론 confidence 기준으로 저신뢰 이벤트만 따로 표시
- Telegram/Slack 주간 digest 추가
