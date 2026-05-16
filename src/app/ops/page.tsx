import { triggerIngestion } from "@/app/ops/actions";
import { IngestButton } from "@/components/ingest-button";
import { notFound } from "next/navigation";
import { getOpsOverview } from "@/db/repository";
import { areWriteRoutesDisabled, getPublicOpsMode, hasDatabaseUrl } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { StatusChip } from "@/components/status-chip";

export const dynamic = "force-dynamic";

type OpsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function OpsPage({ searchParams }: OpsPageProps) {
  const opsMode = getPublicOpsMode();
  if (opsMode === "off") {
    notFound();
  }

  const params = await searchParams;
  const overview = await getOpsOverview();
  const canTriggerIngestion = hasDatabaseUrl() && !areWriteRoutesDisabled();
  const ingestState = readSearchParam(params, "ingest");
  const persisted = readSearchParam(params, "persisted");
  const failed = readSearchParam(params, "failed");
  const candidates = readSearchParam(params, "candidates");
  const errorMessage = readSearchParam(params, "message");

  return (
    <main className="stack-xl">
      <section className="hero compact">
        <div className="hero-copy">
          <p className="eyebrow">Ops</p>
          <h1>수집 진단 대시보드</h1>
          <p className="hero-summary">
            최근 실행 요약과 소스별 성과를 빠르게 확인합니다.
          </p>
        </div>
        {canTriggerIngestion ? (
          <form action={triggerIngestion} className="ops-ingest-form">
            <IngestButton />
          </form>
        ) : (
          <div className="hero-note">
            <strong>수집 버튼 비활성화</strong>
            <p>TURSO_DATABASE_URL과 OPS_SECRET이 있어야 웹에서 새 수집을 시작할 수 있습니다.</p>
          </div>
        )}
      </section>

      {ingestState === "success" ? (
        <div className="callout">
          새 수집을 시작했습니다. 후보 {candidates ?? "0"}건을 검사했고 {persisted ?? "0"}건 저장, 실패{" "}
          {failed ?? "0"}건입니다.
        </div>
      ) : null}

      {ingestState === "disabled" ? (
        <div className="callout">
          현재 환경에서는 웹 수집 버튼이 비활성화되어 있습니다. 데이터베이스 연결과 쓰기 권한을 먼저
          활성화해 주세요.
        </div>
      ) : null}

      {ingestState === "error" ? (
        <div className="callout">수집 시작 중 오류가 발생했습니다: {errorMessage ?? "unknown error"}</div>
      ) : null}

      {overview.note ? <div className="callout">{overview.note}</div> : null}

      <section className="detail-section">
        <div className="section-header">
          <h2>최근 수집 실행</h2>
          <p>실행 시각과 처리 건수를 빠르게 확인합니다.</p>
        </div>
        <div className="ops-table">
          <div className="ops-row ops-head">
            <span>시작</span>
            <span>상태</span>
            <span>후보</span>
            <span>저장</span>
            <span>실패</span>
          </div>
          {overview.runs.length === 0 ? (
            <div className="ops-row">
              <span>아직 수집 실행이 없습니다.</span>
            </div>
          ) : (
            overview.runs.map((run) => (
              <div className="ops-row" key={run.id}>
                <span>{formatDateTime(run.startedAt.toISOString())}</span>
                <span>{run.status}</span>
                <span>{run.totalCandidates}</span>
                <span>{run.totalUpserted}</span>
                <span>{run.totalFailed}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h2>소스별 성과</h2>
          <p>가장 최근 실행에서 소스별 후보 수와 저장 수를 비교합니다.</p>
        </div>
        <div className="ops-table">
          <div className="ops-row ops-head ops-row-wide">
            <span>소스</span>
            <span>시드</span>
            <span>후보</span>
            <span>추출</span>
            <span>저장</span>
            <span>실패</span>
          </div>
          {overview.sourceStats.length === 0 ? (
            <div className="ops-row">
              <span>아직 집계된 소스 통계가 없습니다.</span>
            </div>
          ) : (
            overview.sourceStats.map((stat) => (
              <div className="ops-row ops-row-wide" key={stat.sourceName}>
                <span>{stat.sourceName}</span>
                <span>{stat.seeds}</span>
                <span>{stat.candidates}</span>
                <span>{stat.extracted}</span>
                <span>{stat.persisted}</span>
                <span>{stat.failed}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {opsMode === "full" ? (
        <section className="detail-section">
          <div className="section-header">
            <h2>최근 이벤트</h2>
            <p>저신뢰나 상태 변동 이벤트를 빠르게 훑어볼 수 있습니다.</p>
          </div>
          <div className="ops-event-list">
            {overview.events.map((event) => (
              <article className="ops-event-card" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.primarySource}</p>
                </div>
                <div className="event-badges">
                  <StatusChip kind="status" value={event.registrationStatus} />
                  <StatusChip kind="origin" value={event.statusOrigin} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
