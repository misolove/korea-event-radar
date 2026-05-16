"use client";

import { useFormStatus } from "react-dom";

export function IngestButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? "수집 중..." : "새로 수집 시작"}
    </button>
  );
}
