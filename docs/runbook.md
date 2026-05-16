# Runbook — 운영 매뉴얼

## 일상 운영

### 수동 ingest 실행

```bash
cd /path/to/korea-event-radar

# .env.local에 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN 필요
npm run ingest

# 특정 씨드만
npm run ingest -- onoffmix-home
npm run ingest -- eventus-channel-awskrug eventus-channel-aiworld
```

### DB 현황 확인

```bash
npx tsx --tsconfig tsconfig.json << 'EOF'
import { createClient } from '@libsql/client';
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await db.execute(`
  SELECT price_type, registration_status, COUNT(*) as n FROM events
  GROUP BY price_type, registration_status ORDER BY n DESC
`);
console.table(r.rows);
await db.close();
EOF
```

### 특정 행사 수동 삭제

```bash
npx tsx --tsconfig tsconfig.json << 'EOF'
import { createClient } from '@libsql/client';
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
await db.execute({ sql: `DELETE FROM events WHERE slug = ?`, args: ['slug-here'] });
console.log('삭제 완료');
await db.close();
EOF
```

### 과거 행사 수동 cleanup

```bash
npm run cleanup:past -- --before=2026-06-01        # dry-run (확인만)
npm run cleanup:past -- --before=2026-06-01 --apply # 실제 삭제
```

---

## 새 행사 수동 추가

DB에 직접 추가할 때 (ingest로 못 잡는 행사):

```bash
npx tsx --tsconfig tsconfig.json << 'EOF'
import { createClient } from '@libsql/client';
const db = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
await db.execute({
  sql: `INSERT INTO events (id, slug, title, primary_source, primary_source_url,
    registration_url, starts_at, registration_status, price_type, price_text,
    confidence_score, last_checked_at, last_seen_at, created_at, updated_at, topic_tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [
    crypto.randomUUID(),
    'slug-here',              // URL-safe unique ID
    '행사 제목',
    'EventUs',
    'https://event-us.kr/event/...',
    'https://event-us.kr/event/...',  // registration_url
    new Date('2026-06-15T19:00:00+09:00').getTime(),  // starts_at (ms epoch)
    'open',
    'free',
    '무료',
    80,
    Date.now(), Date.now(), Date.now(), Date.now(),
    JSON.stringify(['AI', '클라우드'])
  ]
});
console.log('추가 완료');
await db.close();
EOF
```

---

## Cron 수동 트리거

```bash
# OPS_SECRET 확인 후:
curl -X GET https://korea-event-radar.vercel.app/api/cron/ingest \
  -H "Authorization: Bearer YOUR_OPS_SECRET"
```

---

## 배포

```bash
# 로컬 타입 체크
npx tsc --noEmit

# 프로덕션 배포
npx vercel --prod
```

---

## 비IT 행사가 들어왔을 때

1. `looksNonTech()` 패턴에 추가 (src/ingestion/normalize.ts)
2. DB에서 직접 삭제:
```bash
await db.execute({ sql: `DELETE FROM events WHERE title LIKE ?`, args: ['%키워드%'] });
```

---

## 새 Meetup 그룹 씨드 추가

```typescript
// src/ingestion/seeds.ts에 추가:
{
  id: "meetup-new-group",
  label: "그룹 이름",
  url: "https://www.meetup.com/group-urlname/events/",
  sourceName: "Meetup",
  sourceKind: "platform",
  mode: "list-page",
  tags: ["ai", "seoul"],
}
```

---

## 환경변수 설정

### Vercel 대시보드
Settings → Environment Variables:
- `TURSO_DATABASE_URL` — `libsql://letitbe-letitbe.aws-ap-northeast-1.turso.io`
- `TURSO_AUTH_TOKEN` — Turso 콘솔에서 발급
- `OPS_SECRET` — 임의 랜덤 문자열 (Cron 인증용)
- `CLAUDE_API_KEY` — Anthropic 콘솔에서 발급

### 로컬 (.env.local)
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
OPS_SECRET=your-secret
CLAUDE_API_KEY=sk-ant-...
```

---

## 트러블슈팅

### ingest가 0개 수집할 때
1. `fetchHtml()` 에러 로그 확인 — 대부분 Cloudflare 차단
2. EventUs API 응답 확인: `curl "https://api.event-us.kr/api/v1/engine/suggest?query=AI&size=5"`
3. OnOffMix 카테고리 접근 확인: `curl "https://onoffmix.com/event/main/?c=102"`

### Claude verifier가 `unknown` 반환할 때
- Google Forms URL → Cloudflare 차단 → 정상 동작 (알려진 제약)
- 페이지 크롤 실패 → `confidence: 10, reason: "페이지 접근 불가"`

### 날짜 1970-01-01로 저장될 때
`parseInt("2026-05-23T...")` = `2026` (연도) = 1970년. 반드시:
```typescript
new Date("2026-05-23T...").getTime()  // 올바름
parseInt("2026-05-23T...")            // 틀림
```

### Vercel Cron이 안 돌 때
- Vercel 대시보드 → Functions → Cron Jobs 탭에서 실행 이력 확인
- `OPS_SECRET` 환경변수 설정됐는지 확인
- `maxDuration: 300` 초과 시 타임아웃
