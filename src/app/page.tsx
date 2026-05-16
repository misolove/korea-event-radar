import { EventCard } from "@/components/event-card";
import { FeaturedEvent } from "@/components/featured-event";
import { FilterBar } from "@/components/filter-bar";
import { RefreshButton } from "@/components/refresh-button";
import { getLastIngestTime, listEvents } from "@/db/repository";
import { areWriteRoutesDisabled, getPublicOpsMode, hasDatabaseUrl } from "@/lib/env";
import { normalizeSearchParams } from "@/lib/event-model";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const opsMode = getPublicOpsMode();
  const filters = normalizeSearchParams(await searchParams);
  const [events, lastIngestTime] = await Promise.all([
    listEvents(filters),
    getLastIngestTime(),
  ]);
  const sourceOptions = [...new Set(events.map((event) => event.primarySource))];
  const topicOptions = [...new Set(events.flatMap((event) => event.topicTags))].sort();
  const featuredEvent = events[0] ?? null;
  const remainingEvents = featuredEvent ? events.slice(1) : [];

  const openCount = events.filter((event) => event.registrationStatus === "open").length;
  const freeCount = events.filter((event) => event.priceType === "free").length;

  return (
    <main className="stack-xl home-page">
      <section className="hero hero-home">
        <div className="hero-copy">
          <div className="hero-meta">
            <span className="hero-meta-dot" />
            Seminar Scout AI · 무료 IT/AI 세미나 큐레이터
          </div>
          <h1 className="hero-title">
            <em className="hero-title-highlight">참석할 가치 있는</em>
            <br />
            무료 IT·AI 세미나만
          </h1>
          <p className="hero-summary">
            AI가 각 세미나를 분석해 추천점수·참석 이유·광고 위험까지 한 번에 알려드립니다.
            어떤 행사가 진짜 도움이 되는지 빠르게 판단하세요.
          </p>
          <div className="hero-highlights" aria-label="서비스 핵심 포인트">
            <span className="hero-pill">무료 행사 전용</span>
            <span className="hero-pill">AI 큐레이션</span>
            <span className="hero-pill">광고 위험 분석</span>
            <span className="hero-pill">Genspark 연동</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-stats hero-stats-compact">
            <div className="stat-card stat-card-compact">
              <span>큐레이션 행사</span>
              <strong>{events.length}</strong>
            </div>
            <div className="stat-card stat-card-compact">
              <span>등록 가능</span>
              <strong>{openCount}</strong>
            </div>
            <div className="stat-card stat-card-compact">
              <span>무료 행사</span>
              <strong>{freeCount}</strong>
            </div>
          </div>
          <RefreshButton lastIngestTime={lastIngestTime} />
        </div>
      </section>

      <FilterBar filters={filters} sourceOptions={sourceOptions} topicOptions={topicOptions} />

      {featuredEvent ? <FeaturedEvent event={featuredEvent} freeCount={freeCount} /> : null}

      <section className="results-header">
        <div>
          <h2>
            {featuredEvent ? "추천 세미나 목록" : "세미나 목록"}
            <span className="results-count">{events.length}건</span>
          </h2>
          <p>AI 추천점수 · 등록 가능 · 무료 우선 정렬</p>
        </div>
        <div className="results-actions">
          <div className="results-pills" aria-label="결과 요약">
            <span className="hero-pill">등록 가능 {openCount}</span>
            <span className="hero-pill hero-pill-muted">무료 {freeCount}</span>
          </div>
          <div className="filter-chip-row" style={{margin:0}}>
            <Link href={`/?${new URLSearchParams({...Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=null) as [string,string][]), sort:'score'})}`} className={`filter-chip${(!filters.sort || filters.sort==='score') ? ' filter-chip--active' : ''}`}>AI 추천순</Link>
            <Link href={`/?sort=date`} className={`filter-chip${filters.sort==='date' ? ' filter-chip--active' : ''}`}>날짜순</Link>
            <Link href={`/?sort=free`} className={`filter-chip${filters.sort==='free' ? ' filter-chip--active' : ''}`}>무료먼저</Link>
          </div>
          {opsMode !== "off" ? (
            <Link className="ghost-button" href="/ops">
              Data Pipeline Demo
            </Link>
          ) : null}
        </div>
      </section>

      {events.length === 0 ? (
        <section className="empty-state">
          <h3>조건에 맞는 행사가 아직 없습니다.</h3>
          <p>검색어나 날짜 범위를 조금 넓혀 보거나 필터를 초기화해 보세요.</p>
        </section>
      ) : remainingEvents.length > 0 ? (
        <section className="event-grid">
          {remainingEvents.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
