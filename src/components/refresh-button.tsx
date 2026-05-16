"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** ISO timestamp of last auto-ingest run (from server). null = no run yet. */
  lastIngestTime?: string | null;
};

export function RefreshButton({ lastIngestTime }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Format the server-side last ingest time, or fall back to null
  const formattedIngest = lastIngestTime
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(new Date(lastIngestTime))
    : null;

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="refresh-bar">
      <button
        className="primary-button refresh-btn"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <span className="refresh-spinner" aria-hidden="true" />
            최신 무료 세미나 불러오는 중…
          </>
        ) : (
          <>⟳ 최신 무료 IT 세미나 새로고침</>
        )}
      </button>
      {formattedIngest && (
        <span className="refresh-timestamp">
          마지막 자동 수집: {formattedIngest}
        </span>
      )}
    </div>
  );
}
