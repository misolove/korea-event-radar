"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusChip } from "@/components/status-chip";
import { formatDateTime, formatLocation } from "@/lib/format";
import { type EventSummary } from "@/lib/event-model";
import { getAiCuration, buildGensparkPrompt } from "@/lib/ai-curation";

type FeaturedEventProps = {
  event: EventSummary;
  freeCount: number;
};

export function FeaturedEvent({ event, freeCount }: FeaturedEventProps) {
  const [copied, setCopied] = useState(false);
  const curation = getAiCuration(event.slug, {
    title: event.title,
    topicTags: event.topicTags,
    priceType: event.priceType,
    eventKind: event.eventKind,
  });

  const handleCopyPrompt = async () => {
    const prompt = buildGensparkPrompt({
      title: event.title,
      startsAt: event.startsAt,
      city: event.city,
      venueName: event.venueName,
      topicTags: event.topicTags,
      primarySourceUrl: event.primarySourceUrl,
      eventKind: event.eventKind,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const dateDisplay = event.startsAt
    ? formatDateTime(event.startsAt)
    : "행사 페이지에서 일정 확인";

  // registration_status → badge (open/waitlist + 무료 또는 5만원 이하만 표시)
  const regUrl = event.registrationUrl ?? event.primarySourceUrl;
  const parsedPrice = (() => {
    if (event.priceType === "free") return 0;
    const m = event.priceText?.replace(/,/g, "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  })();
  const isAffordable = event.priceType === "free" || (parsedPrice !== null && parsedPrice <= 50000);
  const statusBadge = (() => {
    const s = event.registrationStatus;
    if ((s === "open" || s === "waitlist") && isAffordable) {
      const label = s === "open" ? "✅ 등록 가능 →" : "⏳ 대기 가능 →";
      const cls = s === "open" ? "verify-badge verify-open verify-badge-link" : "verify-badge verify-waitlist verify-badge-link";
      return (
        <a className={cls} href={regUrl} target="_blank" rel="noreferrer" title="클릭하면 등록 페이지로 이동">
          {label}
        </a>
      );
    }
    if (s === "closed") return <span className="verify-badge verify-closed">🔴 등록 마감</span>;
    return null;
  })();

  return (
    <section className="featured-event">
      {/* 🏆 Ribbon */}
      <div className="featured-ribbon">
        🏆 AI 추천 1위
      </div>

      <div className="featured-event-copy">
        <h2>{event.title}</h2>
        <p className="featured-summary">{event.summary ?? "상세 설명은 원문 페이지에서 바로 확인할 수 있습니다."}</p>
        <p className="featured-curation-reason">{curation.reasonToAttend}</p>
        <div className="event-badges">
          <StatusChip kind="status" value={event.registrationStatus} />
          <StatusChip kind="price" value={event.priceType} />
          <StatusChip kind="origin" value={event.statusOrigin} />
          {statusBadge}
        </div>
      </div>

      <dl className="featured-meta">
        <div>
          <dt>일정</dt>
          <dd>{dateDisplay}</dd>
        </div>
        <div>
          <dt>장소</dt>
          <dd>{formatLocation(event.city, event.venueName)}</dd>
        </div>
        <div>
          <dt>추천 대상</dt>
          <dd>{curation.recommendedAudience}</dd>
        </div>
        <div>
          <dt>AI 점수</dt>
          <dd>{curation.recommendationScore}/100</dd>
        </div>
      </dl>

      <div className="featured-actions">
        <Link className="primary-button" href={`/events/${event.slug}`}>
          상세 보기
        </Link>
        <a className="ghost-button" href={event.primarySourceUrl} target="_blank" rel="noreferrer">
          원문 보기
        </a>
        <button
          className={`ghost-button copy-prompt-button ${copied ? "copy-prompt-button--copied" : ""}`}
          onClick={handleCopyPrompt}
          title="Genspark에서 이 행사를 분석할 프롬프트를 복사합니다"
        >
          {copied ? "✓ 복사됨" : "🔍 Genspark"}
        </button>
      </div>
    </section>
  );
}
