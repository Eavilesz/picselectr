import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Model config. Vectors are only comparable when model, dimensions AND
// input_type all match, so these never change without re-indexing.
// ---------------------------------------------------------------------------

export const EMBEDDING_MODEL = "google/gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768; // must match vector(768) in the DB

// Stored in photo_embeddings.model and passed to search_photos(). Includes the
// dimension count because a truncated (MRL) vector isn't comparable to a
// full-size one from the same model.
export const EMBEDDING_MODEL_TAG = `${EMBEDDING_MODEL}@${EMBEDDING_DIMENSIONS}`;

// Cosine similarity below which a photo isn't returned. This model scores
// unrelated text/image pairs around 0.5, so the bar sits above that.
// PROVISIONAL: tune with scripts/eval-search.mjs.
export const SEARCH_MIN_SIMILARITY = 0.6;

const ENDPOINT = "https://openrouter.ai/api/v1/embeddings";
const REQUEST_TIMEOUT_MS = 30_000;

export interface EmbeddingUsage {
  tokens: number;
  costUsd: number | null;
}

interface OpenRouterResponse {
  data?: { embedding: number[]; index: number }[];
  usage?: { total_tokens?: number; prompt_tokens?: number; cost?: number };
  error?: { message?: string };
}

type InputType = "search_document" | "search_query";

async function requestEmbeddings(
  input: unknown[],
  inputType: InputType,
): Promise<{ embeddings: number[][]; usage: EmbeddingUsage }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const body = JSON.stringify({
    model: EMBEDDING_MODEL,
    input,
    input_type: inputType,
    dimensions: EMBEDDING_DIMENSIONS,
    encoding_format: "float",
    // Client photos are personal data: only route to providers that don't
    // store or train on inputs
    provider: { data_collection: "deny" },
  });

  // One retry for rate limits / transient upstream errors
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    if (!res.ok || !json.data) {
      throw new Error(
        `OpenRouter embeddings failed (${res.status}): ${json.error?.message ?? "no data"}`,
      );
    }

    const embeddings = [...json.data]
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    if (
      embeddings.length !== input.length ||
      embeddings.some((e) => e.length !== EMBEDDING_DIMENSIONS)
    ) {
      throw new Error("OpenRouter returned unexpected embedding shape");
    }

    return {
      embeddings,
      usage: {
        tokens: json.usage?.total_tokens ?? json.usage?.prompt_tokens ?? 0,
        costUsd: json.usage?.cost ?? null,
      },
    };
  }
}

// JPEG buffers (already downscaled) -> one embedding each, same order
export function embedImages(images: Buffer[]) {
  return requestEmbeddings(
    images.map((buf) => ({
      content: [
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}` },
        },
      ],
    })),
    "search_document",
  );
}

export async function embedQuery(
  text: string,
): Promise<{ embedding: number[]; usage: EmbeddingUsage }> {
  const { embeddings, usage } = await requestEmbeddings([text], "search_query");
  return { embedding: embeddings[0], usage };
}

// Cost tracking per event. Never throws: a failed log must not fail the
// indexing or search request that already paid for the call.
export async function logAiUsage(
  eventSlug: string,
  operation: "index" | "query",
  usage: EmbeddingUsage,
): Promise<void> {
  const { error } = await createServiceClient().from("ai_usage").insert({
    event_slug: eventSlug,
    operation,
    tokens: usage.tokens,
    cost_usd: usage.costUsd,
    model: EMBEDDING_MODEL,
  });
  if (error) console.error("Could not log AI usage:", error.message);
}
