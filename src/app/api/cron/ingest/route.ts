import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/ingestion/run";
import { getEnv } from "@/lib/env";
import { verifyEvent } from "@/lib/claude-verifier";
import { generateCuration, fetchPageSnippet } from "@/lib/opus-curator";
import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { RegistrationStatus } from "@/lib/event-model";

export const maxDuration = 300; // 5 min — Vercel Pro/Hobby max for cron

// ── 검증 결과 → DB 허용 상태로 매핑 ───────────────────────────────
function toDbStatus(status: string): RegistrationStatus {
  const map: Record<string, RegistrationStatus> = {
    open: "open",
    waitlist: "waitlist",
    closed: "closed",
    past: "past",
    speaker_only: "closed",
    paid_only: "closed",
    not_found: "closed",
    stale_url: "past",    // stale_url: 다른 연도 행사 → past 처리 후 cleanup에서 삭제
    unknown: "unknown",
  };
  return map[status] ?? "unknown";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = getEnv().OPS_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CLAUDE_API_KEY ?? "";

  // ── Step 1: 새 이벤트 수집 ──────────────────────────────────────
  let ingestSummary;
  try {
    ingestSummary = await runIngestion();
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, step: "ingest", error: message }, { status: 500 });
  }

  // ── Step 2: 신규 이벤트 Opus 큐레이션 (최초 1회) ──────────────
  const curateResults: { slug: string; ok: boolean }[] = [];

  if (apiKey && ingestSummary.newEventIds.length > 0) {
    const db = getDb();
    const newEvents = await db.select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      organizer: events.organizer,
      topicTags: events.topicTags,
      eventKind: events.eventKind,
      startsAt: events.startsAt,
      venueName: events.venueName,
      primarySourceUrl: events.primarySourceUrl,
      registrationUrl: events.registrationUrl,
      summary: events.summary,
    }).from(events).where(inArray(events.id, ingestSummary.newEventIds));

    for (const event of newEvents) {
      // summary가 이미 있으면 스킵
      if (event.summary) {
        curateResults.push({ slug: event.slug, ok: false });
        continue;
      }
      try {
        const targetUrl = event.registrationUrl ?? event.primarySourceUrl;
        const pageText = await fetchPageSnippet(targetUrl);

        const curation = await generateCuration({
          apiKey,
          title: event.title,
          organizer: event.organizer,
          topicTags: event.topicTags ?? [],
          eventKind: event.eventKind,
          startsAt: event.startsAt?.toISOString() ?? null,
          venueName: event.venueName,
          primarySourceUrl: event.primarySourceUrl,
          pageTextSnippet: pageText,
        });

        if (curation?.summary) {
          await db.update(events)
            .set({ summary: curation.summary, updatedAt: new Date() })
            .where(eq(events.id, event.id));
          curateResults.push({ slug: event.slug, ok: true });
        } else {
          curateResults.push({ slug: event.slug, ok: false });
        }

        // Opus API 과부하 방지 — 이벤트 간 800ms 대기
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        curateResults.push({ slug: event.slug, ok: false });
        console.error(`Curation failed for ${event.slug}:`, err);
      }
    }
  }

  // ── Step 3: 모든 미래 이벤트 Claude 검증 (API 키 있을 때만) ──────
  const verifyResults: { slug: string; status: string; reason: string }[] = [];

  if (apiKey) {
    const db = getDb();
    const allEvents = await db.select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      startsAt: events.startsAt,
      primarySourceUrl: events.primarySourceUrl,
      registrationUrl: events.registrationUrl,
    }).from(events);

    for (const event of allEvents) {
      try {
        const result = await verifyEvent({
          apiKey,
          title: event.title,
          // startsAt은 Drizzle에서 Date 객체로 옴 → ISO 문자열로 변환
          startsAt: event.startsAt?.toISOString() ?? null,
          primarySourceUrl: event.primarySourceUrl,
          registrationUrl: event.registrationUrl,
        });

        const dbStatus = toDbStatus(result.status);

        // DB 업데이트
        await db.update(events)
          .set({
            registrationStatus: dbStatus,
            statusOrigin: "inferred",
            lastCheckedAt: new Date(),
          })
          .where(eq(events.id, event.id));

        verifyResults.push({
          slug: event.slug,
          status: result.status,
          reason: result.reason,
        });

        // Claude API 과부하 방지 — 이벤트 간 500ms 대기
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        verifyResults.push({
          slug: event.slug,
          status: "error",
          reason: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  // Step 4: 과거 행사 자동 삭제
  let cleanedCount = 0;
  try {
    const yesterday = new Date(Date.now() - 86400_000);
    const oneWeekAgo = new Date(Date.now() - 7 * 86400_000);
    const allForCleanup = await getDb().select({
      id: events.id,
      startsAt: events.startsAt,
      registrationStatus: events.registrationStatus,
      title: events.title,
      createdAt: events.createdAt,
    }).from(events);

    const toDelete = allForCleanup
      .filter(e => {
        const isPast = e.startsAt && e.startsAt < yesterday;          // 시작일이 어제 이전
        const isMarkedPast = e.registrationStatus === 'past';          // Claude가 past로 마킹
        const looksEnded = /종료|ended/i.test(e.title);               // 제목에 종료 포함
        const isNullDateOld = !e.startsAt && e.createdAt && e.createdAt < oneWeekAgo; // 날짜 없고 7일 이상
        return isPast || isMarkedPast || looksEnded || isNullDateOld;
      })
      .map(e => e.id);

    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await getDb().delete(events).where(eq(events.id, id));
      }
      cleanedCount = toDelete.length;
    }
  } catch (err) {
    console.error('cleanup error:', err);
  }

  return NextResponse.json({
    ok: true,
    ingest: {
      persisted: ingestSummary.totalPersisted,
      extracted: ingestSummary.totalExtracted,
      candidates: ingestSummary.totalCandidates,
      failed: ingestSummary.totalFailed,
      newEvents: ingestSummary.newEventIds.length,
    },
    curate: {
      attempted: curateResults.length,
      succeeded: curateResults.filter(r => r.ok).length,
    },
    verify: {
      checked: verifyResults.length,
      results: verifyResults,
    },
    cleanup: { deleted: cleanedCount },
  });
}
