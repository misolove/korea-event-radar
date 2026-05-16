import { finishIngestionRun, persistEventDrafts, startIngestionRun } from "@/db/persist";
import { hasDatabaseUrl } from "@/lib/env";
import { dedupeDrafts } from "@/ingestion/dedupe";
import { discoverCandidates, extractCandidate } from "@/ingestion/extractors";
import { maybeClassifyWithLlm } from "@/ingestion/llm-classifier";
import { normalizeExtractedEvent } from "@/ingestion/normalize";
import { sourceSeeds } from "@/ingestion/seeds";
import type { ExtractedEventDraft, IngestionSummary, SourceSeed } from "@/ingestion/types";

export function getEnabledSeeds() {
  const includeDisabledSeeds = process.env.ENABLE_SOCIAL_SEEDS === "1";
  return sourceSeeds.filter((seed) => seed.enabledByDefault !== false || includeDisabledSeeds);
}

export async function runIngestion(selectedSeedIds?: string[]): Promise<IngestionSummary> {
  const seeds = selectedSeedIds?.length
    ? sourceSeeds.filter((seed) => selectedSeedIds.includes(seed.id))
    : getEnabledSeeds();
  const sourceStats = new Map<
    string,
    {
      sourceName: string;
      seeds: number;
      candidates: number;
      extracted: number;
      persisted: number;
      failed: number;
    }
  >();

  const getSourceStat = (sourceName: string) => {
    const existing = sourceStats.get(sourceName);
    if (existing) {
      return existing;
    }

    const created = {
      sourceName,
      seeds: 0,
      candidates: 0,
      extracted: 0,
      persisted: 0,
      failed: 0,
    };
    sourceStats.set(sourceName, created);
    return created;
  };

  for (const seed of seeds) {
    getSourceStat(seed.sourceName).seeds += 1;
  }

  const summary: IngestionSummary = {
    runId: hasDatabaseUrl() ? await startIngestionRun(seeds.length) : null,
    totalSeeds: seeds.length,
    totalCandidates: 0,
    totalExtracted: 0,
    totalPersisted: 0,
    totalFailed: 0,
    notes: [],
    sourceStats: [],
  };

  const candidates = [];
  for (const seed of seeds) {
    try {
      const discovered = await discoverCandidates(seed);
      candidates.push(...discovered);
      getSourceStat(seed.sourceName).candidates += discovered.length;
    } catch (error) {
      summary.totalFailed += 1;
      getSourceStat(seed.sourceName).failed += 1;
      summary.notes.push(`${seed.label}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  summary.totalCandidates = candidates.length;

  const extractedDrafts: ExtractedEventDraft[] = [];
  for (const candidate of candidates) {
    try {
      const extracted = await extractCandidate(candidate);
      if (!extracted) {
        continue;
      }
      const normalized = normalizeExtractedEvent(extracted);
      if (!normalized) {
        continue;
      }

      if (!normalized.isRelevant) {
        const llmDecision = await maybeClassifyWithLlm(normalized);
        if (!llmDecision?.isRelevant) {
          summary.notes.push(`${normalized.title}: skipped as non-Korean or non-IT/AI`);
          continue;
        }
        normalized.isRelevant = llmDecision.isRelevant;
        normalized.topicTags = [...new Set([...(normalized.topicTags ?? []), ...(llmDecision.topicTags ?? [])])];
      }

      extractedDrafts.push(normalized);
      getSourceStat(candidate.sourceName).extracted += 1;
    } catch (error) {
      summary.totalFailed += 1;
      getSourceStat(candidate.sourceName).failed += 1;
      summary.notes.push(`${candidate.url}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const deduped = dedupeDrafts(extractedDrafts);
  summary.totalExtracted = deduped.length;

  if (hasDatabaseUrl()) {
    summary.totalPersisted = await persistEventDrafts(deduped);
    const persistedBySource = new Map<string, number>();
    for (const draft of deduped) {
      persistedBySource.set(
        draft.primarySource,
        (persistedBySource.get(draft.primarySource) ?? 0) + 1,
      );
    }
    for (const [sourceName, persisted] of persistedBySource) {
      getSourceStat(sourceName).persisted += persisted;
    }
  } else {
    summary.notes.push("TURSO_DATABASE_URL이 없어 추출 결과를 메모리에만 계산했습니다.");
  }

  summary.sourceStats = [...sourceStats.values()].sort((a, b) => {
    return b.extracted - a.extracted || b.candidates - a.candidates || a.sourceName.localeCompare(b.sourceName);
  });

  if (summary.runId) {
    await finishIngestionRun(summary.runId, summary);
  }

  return summary;
}

export function listRegisteredSeeds() {
  return sourceSeeds;
}
