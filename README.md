# Seminar Scout AI — 무료 IT·AI 세미나 큐레이터

**🔗 Live: [https://korea-event-radar.vercel.app](https://korea-event-radar.vercel.app)**

한국의 무료 IT/AI 세미나·밋업을 자동으로 수집하고, 등록 가능 여부를 한 곳에서 보여주는 큐레이터 서비스입니다.

## Features

- **자동 수집**: EventUs, Meetup, OnOffMix, Luma 등 주요 플랫폼에서 일 1회 자동 크롤
- **무료 필터링**: 2만원 이하 커뮤니티비 포함 무료 행사만 큐레이팅
- **등록 링크 직행**: `✅ 등록 가능` 뱃지 클릭 → 등록 페이지 바로 이동
- **AI 큐레이션**: Claude 기반 행사 품질 검증 (stale URL 감지, 연도 확인, 등록 기간 구분)
- **필터/정렬**: AI 추천순 · 날짜순 · 무료먼저
- **일일 Cron**: 매일 09:00 KST 자동 ingest → Claude 검증 → 과거 행사 정리

## Tech Stack

- `Next.js 15 + React 19 + TypeScript`
- `Turso (libSQL / SQLite) + Drizzle ORM`
- `Claude Haiku` (행사 검증)
- `Vercel` (호스팅 + Cron Jobs)

## Run Locally

```bash
npm install
cp .env.example .env.local
# .env.local에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPS_SECRET, CLAUDE_API_KEY 입력
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Ingest

```bash
npm run ingest              # 전체 시드 수집
npm run ingest -- onoffmix-home meetup-gdg-seoul   # 특정 시드만
```

## Environment Variables

| 변수 | 설명 |
|------|------|
| `TURSO_DATABASE_URL` | Turso libsql URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 |
| `OPS_SECRET` | Cron 인증 Bearer 토큰 |
| `CLAUDE_API_KEY` | Claude API 키 (행사 검증용) |

## Scripts

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run ingest` | 시드 기반 수집 실행 |
| `npm run db:push` | 스키마 DB 반영 |

## Data Sources

- **EventUs**: 공개 검색 API (`api.event-us.kr/v1/engine/suggest`) + 채널 페이지
- **Meetup**: 14개 서울 IT 커뮤니티 그룹 (AWSKRUG, GDG Seoul, PyData Seoul 등)
- **OnOffMix**: 교육/세미나/컨퍼런스 카테고리 자동 수집
- **Luma**: 서울 지역 AI/개발자 밋업

## Deploy

Vercel에 배포 후 환경변수 4개 설정하면 바로 동작합니다.  
Cron은 `vercel.json`에 정의됨 (`0 0 * * *` = 09:00 KST).
