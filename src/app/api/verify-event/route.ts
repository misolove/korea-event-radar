/**
 * POST /api/verify-event
 * Body: { slug, title, startsAt, primarySourceUrl, registrationUrl }
 *
 * Claude API 키는 서버 환경변수(CLAUDE_API_KEY)에서만 읽습니다.
 * 클라이언트에서 키를 전달하는 방법은 지원하지 않습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyEvent } from "@/lib/claude-verifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── 간단한 인메모리 rate limit (Vercel serverless 재시작 시 초기화됨) ──
// 진지한 프로덕션이라면 Redis/KV로 교체하세요.
const RATE_WINDOW_MS = 60_000; // 1분
const RATE_LIMIT = 20;         // IP당 분당 최대 20회
const ipLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  ipLog.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  // ── API 키: 환경변수에서만 ──────────────────────────────────────
  const apiKey = process.env.CLAUDE_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 Claude API 키가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // ── Rate limit ──────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  // ── Body 파싱 ───────────────────────────────────────────────────
  let body: {
    slug?: string;
    title?: string;
    startsAt?: string | null;
    primarySourceUrl?: string;
    registrationUrl?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, startsAt, primarySourceUrl, registrationUrl } = body;

  if (!title || !primarySourceUrl) {
    return NextResponse.json(
      { error: "title and primarySourceUrl are required" },
      { status: 400 },
    );
  }

  // ── URL 검증: 허용된 도메인만 크롤링 ───────────────────────────
  const ALLOWED_HOSTS = [
    "meetup.com",
    "eventbrite.com",
    "event-us.kr",
    "luma.com",
    "lu.ma",
    "onoffmix.com",
    "forms.gle",
    "docs.google.com",
  ];
  try {
    const host = new URL(primarySourceUrl).hostname.replace(/^www\./, "");
    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return NextResponse.json(
        { error: "허용되지 않은 URL입니다." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }

  // ── 검증 실행 ───────────────────────────────────────────────────
  try {
    const result = await verifyEvent({
      apiKey,
      title,
      startsAt: startsAt ?? null,
      primarySourceUrl,
      registrationUrl: registrationUrl ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `검증 실패: ${message}` },
      { status: 500 },
    );
  }
}
