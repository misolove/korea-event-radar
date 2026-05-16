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
        title="DB에 저장된 정보를 화면에 다시 불러옵니다. 새 행사 수집은 매일 오전 9시에 자동으로 진행됩니다."
      >
        {isPending ? (
          <>
            <span className="refresh-spinner" aria-hidden="true" />
            화면 새로고침 중…
          </>
        ) : (
          <>⟳ 화면 새로고침</>
        )}
      </button>
      {formattedIngest && (
        <span className="refresh-timestamp">
          마지막 자동 수집: {formattedIngest} · 매일 오전 9시 자동 업데이트
        </span>
      )}
    </div>
  );
}
