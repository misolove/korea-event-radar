import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="stack-xl">
      <section className="empty-state">
        <h1>행사를 찾지 못했습니다.</h1>
        <p>링크가 바뀌었거나 아직 수집되지 않은 행사일 수 있습니다.</p>
        <Link className="primary-button" href="/">
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
