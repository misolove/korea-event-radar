import type { DiscoveredCandidate, ExtractedEventDraft, SourceSeed } from "@/ingestion/types";
import { fetchHtml } from "@/ingestion/fetch";
import { discoverEventbriteLinks, extractEventbrite } from "@/ingestion/extractors/eventbrite";
import { discoverEventUsLinks, discoverEventUsViaApi, extractEventUs } from "@/ingestion/extractors/eventus";
import { discoverGenericLinks, extractGeneric } from "@/ingestion/extractors/generic";
import { discoverLumaLinks, extractLuma } from "@/ingestion/extractors/luma";
import { discoverMeetupLinks, extractMeetup } from "@/ingestion/extractors/meetup";
import { discoverOnOffMixLinks, discoverOnOffMixViaCategories, extractOnOffMix } from "@/ingestion/extractors/onoffmix";

export async function discoverCandidates(seed: SourceSeed): Promise<DiscoveredCandidate[]> {
  if (seed.mode === "event-page") {
    return [
      {
        url: seed.url,
        sourceName: seed.sourceName,
        sourceKind: seed.sourceKind,
        discoveredFromUrl: null,
      },
    ];
  }

  // ── EventUs: API 기반 발굴 (list-page 모드) ──────────────────────
  if (seed.sourceName === "EventUs" && seed.mode === "list-page") {
    const [htmlLinks, apiLinks] = await Promise.all([
      fetchHtml(seed.url).then(html => discoverEventUsLinks(seed.url, html)).catch(() => [] as string[]),
      discoverEventUsViaApi().catch(() => [] as string[]),
    ]);
    const allLinks = [...new Set([...htmlLinks, ...apiLinks])];
    return allLinks.map(url => ({
      url,
      sourceName: seed.sourceName,
      sourceKind: seed.sourceKind,
      discoveredFromUrl: seed.url,
    }));
  }

  // ── OnOffMix: 카테고리 페이지 기반 발굴 ──────────────────────────
  if (seed.sourceName === "OnOffMix" && seed.mode === "list-page") {
    const [categoryLinks, htmlLinks] = await Promise.all([
      discoverOnOffMixViaCategories().catch(() => [] as string[]),
      fetchHtml(seed.url).then(html => discoverOnOffMixLinks(seed.url, html)).catch(() => [] as string[]),
    ]);
    const allLinks = [...new Set([...categoryLinks, ...htmlLinks])];
    return allLinks.map(url => ({
      url,
      sourceName: seed.sourceName,
      sourceKind: seed.sourceKind,
      discoveredFromUrl: seed.url,
    }));
  }

  const html = await fetchHtml(seed.url);
  const links = (() => {
    if (seed.sourceName === "EventUs") return discoverEventUsLinks(seed.url, html);
    if (seed.sourceName === "Meetup") return discoverMeetupLinks(seed.url, html);
    if (seed.sourceName === "Luma") return discoverLumaLinks(seed.url, html);
    if (seed.sourceName === "OnOffMix") return discoverOnOffMixLinks(seed.url, html);
    if (seed.sourceName === "Eventbrite") return discoverEventbriteLinks(seed.url, html);
    return discoverGenericLinks(seed.url, html);
  })();

  return links.map((url) => ({
    url,
    sourceName: seed.sourceName,
    sourceKind: seed.sourceKind,
    discoveredFromUrl: seed.url,
  }));
}

export async function extractCandidate(candidate: DiscoveredCandidate): Promise<ExtractedEventDraft | null> {
  const html = await fetchHtml(candidate.url);
  const host = new URL(candidate.url).hostname;

  if (host.includes("event-us.kr")) {
    return extractEventUs(candidate.url, html, candidate.discoveredFromUrl);
  }
  if (host.includes("meetup.com")) {
    return extractMeetup(candidate.url, html, candidate.discoveredFromUrl);
  }
  if (host.includes("luma.com")) {
    return extractLuma(candidate.url, html, candidate.discoveredFromUrl);
  }
  if (host.includes("onoffmix.com")) {
    return extractOnOffMix(candidate.url, html, candidate.discoveredFromUrl);
  }
  if (host.includes("eventbrite.com")) {
    return extractEventbrite(candidate.url, html, candidate.discoveredFromUrl);
  }

  return extractGeneric(
    candidate.url,
    html,
    candidate.sourceName,
    candidate.sourceKind,
    candidate.discoveredFromUrl,
  );
}
