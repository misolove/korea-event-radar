import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import { getEventBySlug } from "@/db/repository";
import { eventKindLabels } from "@/lib/event-model";
import { formatDate, formatDateTime, formatLocation } from "@/lib/format";
import { decodeSlug } from "@/lib/text";
import { getAiCuration } from "@/lib/ai-curation";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(decodeSlug(slug));

  if (!event) {
    notFound();
  }

  const curation = getAiCuration(event.slug, {
    title: event.title,
    topicTags: event.topicTags,
    priceType: event.priceType,
    eventKind: event.eventKind,
  });

  return (
    <main className="stack-xl">
      <div className="detail-nav">
        <Link className="ghost-button" href="/">
          목록으로
        </Link>
        <a className="ghost-button" href={event.primarySourceUrl} target="_blank" rel="noreferrer">
          원문 보기
        </a>
        {event.registrationUrl && event.registrationUrl !== event.primarySourceUrl ? (
          <a className="primary-button" href={event.registrationUrl} target="_blank" rel="noreferrer">
            등록 링크
          </a>
        ) : null}
      </div>

      <section className="detail-hero">
        {event.registrationUrl && (
          <a className="primary-button" style={{display:'inline-block', marginBottom:'1rem'}} href={event.registrationUrl} target="_blank" rel="noreferrer">
            🎟 지금 등록하기 →
          </a>
        )}
        <div className="stack-md">
          <p className="eyebrow">
            {event.primarySource} · {eventKindLabels[event.eventKind]}
          </p>
          <h1>{event.title}</h1>
          <div className="ai-curation-panel" style={{marginTop:'1rem'}}>
            <div className="ai-curation-row">
              <span className="ai-curation-label">AI 추천점수</span>
              <span className="ai-curation-value">{curation.recommendationScore}/100</span>
            </div>
            <div className="ai-curation-row">
              <span className="ai-curation-label">추천 대상</span>
              <span className="ai-curation-value">{curation.recommendedAudience}</span>
            </div>
            <div className="ai-curation-row">
              <span className="ai-curation-label">참석 이유</span>
              <span className="ai-curation-value">{curation.reasonToAttend}</span>
            </div>
            {curation.caution && (
              <div className="ai-curation-row ai-curation-caution">
                <span className="ai-curation-label">⚠ 주의</span>
                <span className="ai-curation-value">{curation.caution}</span>
              </div>
            )}
          </div>
          <p className="hero-summary">{event.summary ?? "행사 소개는 원문 페이지를 함께 확인해 주세요."}</p>
          <div className="event-badges">
            <StatusChip kind="status" value={event.registrationStatus} />
            <StatusChip kind="price" value={event.priceType} />
            <StatusChip kind="origin" value={event.statusOrigin} />
            <StatusChip kind="delivery" value={event.deliveryType} />
          </div>
        </div>

        <dl className="detail-metrics">
          <div>
            <dt>주최</dt>
            <dd>{event.organizer ?? event.primarySource}</dd>
          </div>
          <div>
            <dt>일정</dt>
            <dd>{formatDateTime(event.startsAt)}</dd>
          </div>
          <div>
            <dt>마감</dt>
            <dd>{formatDateTime(event.registrationDeadline)}</dd>
          </div>
          <div>
            <dt>최근 확인</dt>
            <dd>{formatDateTime(event.lastCheckedAt)}</dd>
          </div>
          <div>
            <dt>장소</dt>
            <dd>{formatLocation(event.city, event.venueName)}</dd>
          </div>
          <div>
            <dt>토픽</dt>
            <dd className="card-topics">
              {event.topicTags.map(tag => <span key={tag} className="topic-chip topic-default">{tag}</span>)}
            </dd>
          </div>
        </dl>
      </section>

      <details>
        <summary style={{cursor:'pointer', padding:'8px 0', fontWeight:600}}>상태 이력 펼치기</summary>
        <section className="detail-section">
          <div className="section-header">
            <h2>상태 이력</h2>
            <p>최근 수집 결과가 시간순으로 쌓입니다.</p>
          </div>
          <div className="timeline">
            {event.history.map((snapshot) => (
              <article className="timeline-item" key={snapshot.id}>
                <div className="timeline-date">{formatDateTime(snapshot.observedAt)}</div>
                <div className="timeline-body">
                  <div className="event-badges">
                    <StatusChip kind="status" value={snapshot.registrationStatus} />
                    <StatusChip kind="price" value={snapshot.priceType} />
                    <StatusChip kind="origin" value={snapshot.statusOrigin} />
                  </div>
                  <p>
                    {snapshot.sourceName} · <a href={snapshot.sourceUrl}>{snapshot.sourceUrl}</a>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </details>

      <details>
        <summary style={{cursor:'pointer', padding:'8px 0', fontWeight:600}}>근거 소스 펼치기</summary>
        <section className="detail-section">
          <div className="section-header">
            <h2>근거 소스</h2>
            <p>각 상태가 어떤 텍스트와 링크에서 추출됐는지 바로 확인할 수 있습니다.</p>
          </div>
          <div className="evidence-list">
            {event.evidence.map((evidence) => (
              <article className="evidence-card" key={evidence.id}>
                <header>
                  <strong>{evidence.sourceName}</strong>
                  <span>{formatDate(evidence.extractedAt)}</span>
                </header>
                <div className="event-badges">
                  <StatusChip kind="status" value={evidence.registrationStatus} />
                  <StatusChip kind="price" value={evidence.priceType} />
                  <StatusChip kind="origin" value={evidence.statusOrigin} />
                </div>
                <dl className="evidence-meta">
                  <div>
                    <dt>상태 문구</dt>
                    <dd>{evidence.extractedStatusText ?? "없음"}</dd>
                  </div>
                  <div>
                    <dt>가격 문구</dt>
                    <dd>{evidence.extractedPriceText ?? "없음"}</dd>
                  </div>
                  <div>
                    <dt>일정 문구</dt>
                    <dd>{evidence.extractedStartText ?? "없음"}</dd>
                  </div>
                  <div>
                    <dt>장소 문구</dt>
                    <dd>{evidence.extractedLocationText ?? "없음"}</dd>
                  </div>
                </dl>
                <div className="detail-links">
                  <a className="ghost-button" href={evidence.sourceUrl} target="_blank" rel="noreferrer">
                    소스 열기
                  </a>
                  {evidence.registrationUrl ? (
                    <a className="primary-button" href={evidence.registrationUrl} target="_blank" rel="noreferrer">
                      등록 링크
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </details>
    </main>
  );
}
