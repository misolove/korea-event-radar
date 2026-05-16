import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seminar Scout AI — 무료 IT·AI 세미나 큐레이터",
  description: "AI가 선별한 무료 IT·AI 세미나 추천. 참석 가치, 광고 위험, 준비 팁까지 한 번에 확인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap"
        />
      </head>
      <body>
        {/* Sticky Navigation */}
        <header className="nav" role="banner">
          <div className="nav-inner">
            <a className="logo" href="/" aria-label="Seminar Scout AI 홈">
              <span className="logo-mark" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="12" cy="12" r="7" opacity=".5"/>
                  <circle cx="12" cy="12" r="10.5" opacity=".25"/>
                </svg>
              </span>
              Scout
            </a>
            <div className="nav-spacer" />
          </div>
        </header>
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
