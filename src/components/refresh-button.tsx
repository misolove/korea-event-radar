"use client";

type Props = {
  lastIngestTime?: string | null;
};

export function RefreshButton({ lastIngestTime }: Props) {
  const formattedIngest = lastIngestTime
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(new Date(lastIngestTime))
    : null;

  if (!formattedIngest) return null;

  return (
    <div className="refresh-bar">
      <span className="refresh-timestamp">
        마지막 자동 수집: {formattedIngest} · 매일 오전 9시 자동 업데이트
      </span>
    </div>
  );
}
