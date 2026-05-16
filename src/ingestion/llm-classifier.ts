import type { ExtractedEventDraft } from "@/ingestion/types";
import { getEnv } from "@/lib/env";

type LlmResult = {
  isRelevant: boolean;
  topicTags?: string[];
};

export async function maybeClassifyWithLlm(draft: ExtractedEventDraft): Promise<LlmResult | null> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const prompt = [
    "Classify whether this event is relevant to a Korean IT or AI event discovery service.",
    "Return strict JSON: {\"isRelevant\": boolean, \"topicTags\": string[]}.",
    `Title: ${draft.title}`,
    `Summary: ${draft.summary ?? ""}`,
    `Organizer: ${draft.organizer ?? ""}`,
    `Location: ${draft.city ?? ""} ${draft.venueName ?? ""}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        input: prompt,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };

    const rawText =
      data.output_text ??
      data.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join(" ") ??
      "";

    const parsed = JSON.parse(rawText) as LlmResult;
    if (typeof parsed.isRelevant !== "boolean") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
