"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime, formatLocation } from "@/lib/format";
import { type EventSummary } from "@/lib/event-model";
import { StatusChip } from "@/components/status-chip";
import { getAiCuration, buildGensparkPrompt } from "@/lib/ai-curation";

type EventCardProps = {
  event: EventSummary;
};

// Topic tag → CSS class mapping
const topicClass = (tag: string): string => {
  const t = tag.toLowerCase();
  if (t.includes("ai") || t.includes("llm") || t.includes("머신러닝") || t.includes("딥러닝")) return "topic-chip topic-ai";
  if (t.includes("보안") || t.includes("security") || t.includes("해킹")) return "topic-chip topic-security";
  if (t.includes("클라우드") || t.includes("cloud") || t.includes("aws") || t.includes("azure")) return "topic-chip topic-cloud";
  if (t.includes("데이터") || t.includes("data") || t.includes("분석")) return "topic-chip topic-data";
  if (t.includes("스타트업") || t.includes("startup") || t.includes("창업")) return "topic-chip topic-startup";
  if (t.includes("디자인") || t.includes("design") || t.includes("ux") || t.includes("ui")) return "topic-chip topic-design";
  if (t.includes("개발") || t.includes("dev") || t.includes("웹") || t.includes("앱")) return "topic-chip topic-dev";
  return "topic-chip topic-default";
};

const scoreClass = (score: number): string => {
  if (score >= 85) return "card-score green";
  if (score >= 70) return "card-score blue";
  if (score >= 55) return "card-score amber";
  return "card-score gray";
};

const priceClass = (priceType: string): string => {
  if (priceType === "free") return "card-price free";
  if (priceType === "paid") return "card-price paid";
  return "card-price mixed";
};

const priceLabel = (priceType: string): string => {
  if (priceType === "free") return "무료";
  if (priceType === "paid") return "유료";
  return "혼합";
};

export function EventCard({ event }: EventCardProps) {
  const [copied, setCopied] = useState(false);
  const curation = getAiCuration(event.slug, {
    title: event.title,
    topicTags: event.topicTags,
    priceType: event.priceType,
    eventKind: event.eventKind,
  });

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    : "일정 확인 필요";

  // registration_status → badge
  // open/waitlist + (무료 OR 유료 5만원 이하) 인 경우만 등록 링크 뱃지 표시
  const regUrl = event.registrationUrl ?? event.primarySourceUrl;

  // price_text에서 금액 파싱 (예: "50,000원" → 50000)
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
        <a className={cls} href={regUrl} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()} title="클릭하면 등록 페이지로 이동">
          {label}
        </a>
      );
    }
    if (s === "closed") return <span className="verify-badge verify-closed">🔴 등록 마감</span>;
    return null;
  })();

  return (
    <article className="event-card">
      {/* Top-right icon links */}
      <div className="card-icon-links">
        <a
          className="card-icon-btn"
          href={event.primarySourceUrl}
          target="_blank"
          rel="noreferrer"
          title="원문 보기"
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
        <button
          className="card-icon-btn"
          onClick={handleCopyPrompt}
          title={copied ? "복사됨!" : "Genspark 프롬프트 복사"}
        >
          {copied ? "✓" : "🔍"}
        </button>
      </div>

      {/* Card top: date + score */}
      <div className="event-card-top">
        <span className="card-when">{dateDisplay}</span>
        <span className={scoreClass(curation.recommendationScore)}>
          {curation.recommendationScore}
          <span className="card-score-label">pt</span>
        </span>
      </div>

      {/* Title */}
      <div className="event-card-body">
        <Link className="event-title-link" href={`/events/${event.slug}`}>
          <h3>{event.title}</h3>
        </Link>

        <p className="event-summary">{event.summary ?? "행사 설명은 원문에서 확인해 주세요."}</p>

        {/* Topic chips */}
        <div className="card-topics">
          {event.topicTags.map((tag) => (
            <span className={topicClass(tag)} key={tag}>
              {tag}
            </span>
          ))}
        </div>

        {/* AI curation panel (Collapsible) */}
        <details className="ai-curation-details">
          <summary className="ai-curation-summary" />
          <div className="ai-curation-content">
            <div className="ai-curation-row">
              <span className="ai-curation-label">추천 대상</span>
              <span className="ai-curation-value">{curation.recommendedAudience}</span>
            </div>
            <div className="ai-curation-row">
              <span className="ai-curation-label">참석 이유</span>
              <span className="ai-curation-value">{event.summary ?? curation.reasonToAttend}</span>
            </div>
            {curation.caution && !event.summary && (
              <div className="ai-curation-row ai-curation-caution">
                <span className="ai-curation-label">⚠ 주의</span>
                <span className="ai-curation-value">{curation.caution}</span>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Footer: place + price + status badge */}
      <div className="card-foot">
        <span className="card-place">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="card-place-text">{formatLocation(event.city, event.venueName)}</span>
        </span>
        <span className={priceClass(event.priceType)}>{priceLabel(event.priceType)}</span>
        {statusBadge}
      </div>
    </article>
  );
}
