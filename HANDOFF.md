# HANDOFF.md — Seminar Scout AI 핸드오프 문서

> **최종 업데이트**: 2026-05-22  
> 이 문서는 AI 에이전트(Claw, 안티그래비티, Codex 등)가 작업을 이어받을 때 읽는 핸드오프 문서입니다.  
> 기본 아키텍처/규칙은 `AGENTS.md`에 있습니다. 이 문서는 **현재 상태 + 최근 작업 + 미완성 사항**을 담습니다.

---

## 프로젝트 현황 (2026-05-22 기준)

| 항목 | 값 |
|------|-----|
| **Live URL** | https://korea-event-radar.vercel.app |
| **GitHub** | https://github.com/misolove/korea-event-radar (public, `main`) |
| **DB** | Turso `libsql://letitbe-letitbe.aws-ap-northeast-1.turso.io` |
| **DB 이벤트 수** | 71개 (전부 free, 전부 미래 행사) |
| **마지막 커밋** | `06e3409` — FastCampus extractor 추가 |
| **Cron 상태** | 정상 동작 중 (매일 09:00 KST, 첫 성공 2026-05-17) |
| **Claude 크레딧** | ~$497 잔여 (유효기간 2026-11월, Opus 자유롭게 사용 가능) |

---

## 최근 작업 이력 (역순)

### [2026-05-22] FastCampus 오픈세미나 extractor 추가 (커밋 `06e3409`)
**작업자**: Codex + Claw

**배경**: `https://fastcampus.co.kr/openseminar_new` 수집 요청. SPA처럼 보이지만 서버사이드 HTML에 Next.js flight payload(`__next_f.push()`)가 포함되어 있어 브라우저 자동화 없이 파싱 가능.

**추가된 파일**:
- `src/ingestion/extractors/fastcampus.ts` — 메인 extractor
- `src/ingestion/seeds.ts` — `fastcampus-openseminar` 씨드 추가
- `src/ingestion/extractors/index.ts` — FastCampus 디스패치 추가
- `src/ingestion/types.ts` — `DiscoveredCandidate.payload` 필드 추가
- `tests/extractors.test.ts` — FastCampus 파서 단위 테스트

**검증 결과**:
- 후보 25개 발견 ✅
- DB 저장 0건 → **정상** (현재 페이지 노출 행사가 전부 2025년 과거 아카이브)
- 신규 2026년 세미나 게시 시 다음 Cron에서 자동 수집 예정

**⚠️ 알려진 버그 (미수정)**:
```
파일: src/ingestion/extractors/fastcampus.ts
함수: extractValues()

문제: "values":{...},"meta": 패턴을 정규식 [^}]{0,2000}으로 파싱
     → content 필드 내 중괄호 {} 때문에 조기 종료 → 대부분 카드 누락

수정 방향: JSON.parse + brace-counting 방식으로 교체
참고 코드 (Python 검증 완료):
  pos = 0
  while True:
      idx = payload.find('"values":{', pos)
      if idx == -1: break
      start = idx + len('"values":')
      depth, in_str, escape, end = 0, False, False, start
      for i, ch in enumerate(payload[start:], start):
          if escape: escape=False; continue
          if ch=='\\': escape=True; continue
          if ch=='"' and not escape: in_str = not in_str
          if not in_str:
              if ch=='{': depth += 1
              elif ch=='}':
                  depth -= 1
                  if depth==0: end=i+1; break
      obj = json.loads(payload[start:end])
      # obj.title, obj.content 등 사용
```

현재도 기능상 동작(25개 발견)하지만, 이 버그 수정 시 더 많은 카드를 정확히 수집 가능.

---

### [2026-05-22] 비IT 필터 강화 (커밋 `92d51bd`)
- `looksNonTech()` 정규식 대폭 확장: 국세통계, 비영리윤리, 일본어모임, 요가, 독서모임, 공무원시험 등 차단
- Cleanup 로직 개선: `startsAt=null + createdAt < 7일전` 조건 추가

### [2026-05-22] DB 수동 클린업
삭제한 이벤트 (76 → 71개):
- 과거: AWSKRUG 보안 (5/19), Seoul iOS Meetup (5/20), CMTS 2026 (5/20)
- 비IT: 비영리윤리교육, 일본어모임, 당도보장통장, 국세통계센터

### [2026-05-17] Cron 첫 정상 작동 확인
- 인증 방식 수정: Cron 엔드포인트는 `Authorization: Bearer {OPS_SECRET}`만 허용
- OPS_SECRET 재발급 (이전 값이 Stripe 키였음)
- Opus 요약문(summary) DB 저장 확인

---

## 현재 미완성 / TODO

### 🔴 버그 (즉시 수정 필요)
1. **FastCampus extractor `extractValues()` 정규식 버그** — 위 참고 코드로 brace-counting 방식 교체

### 🟡 개선 (우선순위 높음)
2. **`.env.local.swp` git 추적 제거** — 커밋 `92d51bd`에 실수로 포함됨
   ```bash
   echo ".env.local.swp" >> .gitignore
   git rm --cached .env.local.swp
   git commit -m "chore: .env.local.swp gitignore"
   ```
3. **EventUs organizer 파싱 개선** — 현재 첫 번째 `<a>` 태그에서 주최자명 추출 → 부정확한 경우 있음

### 🟢 신규 기능 (중간 우선순위)
4. **Ticketa list-page 씨드 추가** — `https://ticketa.co/` 목록 페이지
5. **AI curation panel 기본 접힘** — `event-card.tsx`의 curation panel이 항상 펼쳐짐 → accordion으로
6. **새 행사 알림** — Cron 실행 후 신규 이벤트 발견 시 Slack/Telegram 웹훅

### 🔵 장기 (낮은 우선순위)
7. **AI 점수 동적화** — `ai-curation.ts` 정적 slug 맵 → Claude 기반 동적 점수
8. **다중 도시 지원** — 현재 서울 집중, 부산/판교 확장

---

## 환경 설정

### Vercel 환경변수 (4개 필수)
```
TURSO_DATABASE_URL=libsql://letitbe-letitbe.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=<Turso JWT>
OPS_SECRET=<random hex 32>
CLAUDE_API_KEY=<Anthropic key>
```

> ⚠️ `vercel env pull`로 가져오면 암호화된 값이라 빈 문자열로 옴. `.env.local`에 수동으로 입력해야 함.

### 로컬 실행
```bash
# .env.local에 TURSO 값 수동 입력 후:
export $(grep -v '^#' .env.local | grep -E "TURSO|CLAUDE|OPS" | xargs)

# 전체 수집
npm run ingest

# 특정 소스만
npm run ingest -- fastcampus-openseminar
npm run ingest -- onoffmix-home meetup-gdg-seoul

# 타입 체크
npx tsc --noEmit

# 배포
npx vercel --prod
```

### Cron 수동 트리거
```bash
curl -X GET https://korea-event-radar.vercel.app/api/cron/ingest \
  -H "Authorization: Bearer {OPS_SECRET}"
```

---

## 수집 소스 현황

| 소스 | 씨드 수 | 상태 | 비고 |
|------|---------|------|------|
| EventUs | 6 쿼리 | ✅ 정상 | 인증 불필요, 300ms 딜레이 |
| Meetup | 14 그룹 | ✅ 정상 | JSON-LD 파싱 |
| OnOffMix | 3 카테고리 | ✅ 정상 | c=101,102,104 |
| FastCampus | 1 list-page | ✅ 파서 동작 (2025 아카이브만) | extractor 버그 있음 (영향 작음) |
| Luma | 씨드 있음 | ⚠️ Cloudflare 차단 빈번 | 실패 시 스킵 |
| Eventbrite | 씨드 있음 | ⚠️ 한국 행사 적음 | |
| Festa.io | 제거됨 | ❌ 서비스 종료 | |

---

## 아키텍처 한 줄 요약

```
seeds(list URLs) → discoverCandidates() → extractCandidate()
→ normalizeExtractedEvent() [비IT/과거/유료 필터]
→ persistEventDrafts() [slug upsert]
→ [Cron 09:00 KST] generateCuration(Opus) + verifyEvent(Haiku) + cleanupPastEvents()
```

전체 상세는 `AGENTS.md` 참조.
