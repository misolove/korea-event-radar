const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; KoreaEventRadar/0.1; +https://example.com/event-radar)",
  "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
};

export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
