import Link from "next/link";
import {
  deliveryTypeLabels,
  deliveryTypes,
  eventKindLabels,
  eventKinds,
  priceTypeLabels,
  priceTypes,
  registrationStatusLabels,
  registrationStatuses,
  type ListEventsInput,
} from "@/lib/event-model";

type FilterBarProps = {
  filters: ListEventsInput;
  sourceOptions: string[];
  topicOptions: string[];
};

export function FilterBar({ filters, sourceOptions, topicOptions }: FilterBarProps) {
  const hasAdvancedFilters = Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.city ||
      (filters.deliveryType && filters.deliveryType !== "all") ||
      (filters.eventKind && filters.eventKind !== "all") ||
      (filters.topic && filters.topic !== "all") ||
      (filters.source && filters.source !== "all"),
  );

  return (
    <form className="filter-panel" method="GET">
      {/* 빠른 필터 chip row */}
      <div className="filter-chip-row">
        <Link href="/" className={`filter-chip${!(filters as any).status && !filters.priceType ? ' filter-chip--active' : ''}`}>전체</Link>
        <Link href="/?status=open" className={`filter-chip${(filters as any).status === 'open' ? ' filter-chip--active' : ''}`}>✅ 등록 가능</Link>
        <Link href="/?priceType=free" className={`filter-chip${filters.priceType === 'free' ? ' filter-chip--active' : ''}`}>🆓 무료만</Link>
        <Link href="/?sort=date" className={`filter-chip${(filters as any).sort === 'date' ? ' filter-chip--active' : ''}`}>📅 날짜순</Link>
      </div>
      <div className="filter-primary-grid">
        <label className="field field-search field-primary-search">
          <span>검색</span>
          <input
            type="search"
            name="q"
            placeholder="예: AI, 서울, 밋업, 해커톤"
            defaultValue={filters.q ?? ""}
          />
        </label>

        <div className="filter-inline-actions">
          <button className="primary-button" type="submit">
            적용
          </button>
          <Link className="ghost-button" href="/">
            초기화
          </Link>
        </div>
      </div>

      <details className="advanced-filters" open={hasAdvancedFilters}>
        <summary>추가 필터</summary>
        <div className="filter-grid filter-grid-advanced">
          <label className="field">
            <span>소스</span>
            <select name="source" defaultValue={filters.source ?? "all"}>
              <option value="all">전체</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>상태</span>
            <select name="registration_status" defaultValue={filters.registrationStatus ?? "all"}>
              <option value="all">전체</option>
              {registrationStatuses.map((status) => (
                <option key={status} value={status}>
                  {registrationStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>가격</span>
            <select name="price_type" defaultValue={filters.priceType ?? "all"}>
              <option value="all">전체</option>
              {priceTypes.map((priceType) => (
                <option key={priceType} value={priceType}>
                  {priceTypeLabels[priceType]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>시작일</span>
            <input type="date" name="date_from" defaultValue={filters.dateFrom ?? ""} />
          </label>

          <label className="field">
            <span>종료일</span>
            <input type="date" name="date_to" defaultValue={filters.dateTo ?? ""} />
          </label>

          <label className="field">
            <span>도시</span>
            <input type="text" name="city" placeholder="서울" defaultValue={filters.city ?? ""} />
          </label>

          <label className="field">
            <span>형태</span>
            <select name="delivery_type" defaultValue={filters.deliveryType ?? "all"}>
              <option value="all">전체</option>
              {deliveryTypes.map((deliveryType) => (
                <option key={deliveryType} value={deliveryType}>
                  {deliveryTypeLabels[deliveryType]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>행사 종류</span>
            <select name="event_kind" defaultValue={filters.eventKind ?? "all"}>
              <option value="all">전체</option>
              {eventKinds.map((eventKind) => (
                <option key={eventKind} value={eventKind}>
                  {eventKindLabels[eventKind]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>토픽</span>
            <select name="topic" defaultValue={filters.topic ?? "all"}>
              <option value="all">전체</option>
              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </form>
  );
}
