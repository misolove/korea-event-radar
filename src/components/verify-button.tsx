"use client";

import { useState } from "react";
import type { VerificationResult, VerificationStatus } from "@/lib/claude-verifier";

type Props = {
  slug: string;
  title: string;
  startsAt: string | null;
  primarySourceUrl: string;
  registrationUrl: string | null;
};

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; emoji: string; className: string }
> = {
  open:         { label: "등록 가능",    emoji: "✅", className: "verify-badge verify-open" },
  waitlist:     { label: "대기 가능",    emoji: "⏳", className: "verify-badge verify-waitlist" },
  closed:       { label: "등록 마감",    emoji: "🔴", className: "verify-badge verify-closed" },
  past:         { label: "지난 행사",    emoji: "📅", className: "verify-badge verify-past" },
  speaker_only: { label: "발표자 모집",  emoji: "🎤", className: "verify-badge verify-speaker" },
  paid_only:    { label: "유료 전환됨",  emoji: "💳", className: "verify-badge verify-paid" },
  not_found:    { label: "페이지 없음",  emoji: "❌", className: "verify-badge verify-notfound" },
  stale_url:    { label: "연도 불일치",  emoji: "📅", className: "verify-badge verify-past" },
  unknown:      { label: "확인 필요",    emoji: "❓", className: "verify-badge verify-unknown" },
};

export function VerifyButton({ slug, title, startsAt, primarySourceUrl, registrationUrl }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 로컬스토리지에서 캐시된 결과 복원
  const cacheKey = `verify:${slug}`;

  function loadCache(): VerificationResult | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw) as VerificationResult & { cachedAt: number };
      // 1시간 캐시
      if (Date.now() - cached.cachedAt > 3600_000) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return cached;
    } catch {
      return null;
    }
  }

  function saveCache(r: VerificationResult) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ...r, cachedAt: Date.now() }));
    } catch {}
  }

  async function handleVerify() {
    // 캐시 확인
    const cached = loadCache();
    if (cached) {
      setResult(cached);
      setState("done");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/verify-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, startsAt, primarySourceUrl, registrationUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "검증 실패");
        setState("error");
        return;
      }

      setResult(data as VerificationResult);
      saveCache(data as VerificationResult);
      setState("done");
    } catch (e) {
      setErrorMsg("네트워크 오류");
      setState("error");
    }
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    try { localStorage.removeItem(cacheKey); } catch {}
    setState("idle");
    setResult(null);
    setErrorMsg("");
  }

  // ── 렌더링 ──────────────────────────────────────────────────────

  if (state === "idle") {
    return (
      <button className="verify-trigger-btn" onClick={handleVerify} title="Claude AI로 실시간 검증">
        🔎 AI 등록 검증
      </button>
    );
  }

  if (state === "loading") {
    return (
      <span className="verify-badge verify-loading" aria-live="polite">
        <span className="verify-spinner" /> 검증 중...
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="verify-badge verify-error" title={errorMsg}>
        ⚠ 검증 실패
        <button className="verify-retry-btn" onClick={handleReset}>재시도</button>
      </span>
    );
  }

  // done
  if (!result) return null;
  const cfg = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.unknown;

  return (
    <span className={cfg.className} title={result.reason}>
      <span className="verify-emoji">{cfg.emoji}</span>
      <span className="verify-label">{cfg.label}</span>
      {result.confidence < 60 && (
        <span className="verify-confidence">({result.confidence}%)</span>
      )}
      <button
        className="verify-recheck-btn"
        onClick={handleReset}
        title="다시 검증"
        aria-label="다시 검증"
      >
        ↺
      </button>
      {result.status === "open" || result.status === "waitlist" ? (
        <a
          className="verify-goto-btn"
          href={result.registrationUrl ?? registrationUrl ?? primarySourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          등록하기 →
        </a>
      ) : null}
    </span>
  );
}
