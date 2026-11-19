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

// Cosine similarity below which a photo isn't returned. Set with
// scripts/eval-search.mjs on a 122-photo wedding (Nov 2026): unrelated
// queries topped out at 0.551, real matches start around 0.60, and recall
// drops past 0.60. 0.58 sits mid-gap. Re-run the eval if you change it.
export const SEARCH_MIN_SIMILARITY = 0.58;

// Results scoring more than this below the best match are dropped. Every
// photo of an event shares its theme (a wedding scores ~0.60 against any
// wedding query), so the fixed threshold alone lets the whole event through;
// this keeps only the photos close to what the query actually describes.
// PROVISIONAL: tune with scripts/eval-search.mjs (--margins).
export const SEARCH_RELATIVE_MARGIN = 0.06;

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

// The provider is saturated: it hit its per-minute request quota (429) or
// held the request until it timed out. Both clear up on their own, so
// callers that can wait (the indexing loop in the browser) should back off
// and retry rather than treat it as a failure.
export class EmbeddingBusyError extends Error {}

const RETRY_DELAY_MS = 3000;
const MIN_ATTEMPT_MS = 5000; // don't start an attempt with less time than this

// `deadline` (epoch ms) bounds the whole call, retries included, so it can't
// outlive the serverless function that is waiting on it.
async function requestEmbeddings(
  input: unknown[],
  inputType: InputType,
  deadline = Date.now() + REQUEST_TIMEOUT_MS,
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

  // One short retry for rate limits / transient upstream errors, if time
  // allows. Longer waits belong to the caller: a server function can't sleep
  // through a per-minute quota within Vercel's time limit.
  for (let attempt = 0; ; attempt++) {
    const timeLeft = deadline - Date.now();
    if (timeLeft < MIN_ATTEMPT_MS) {
      throw new EmbeddingBusyError("No time left for another attempt");
    }

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, timeLeft)),
      });
    } catch (err) {
      // Normal requests answer in ~2s; a timeout means the provider is
      // queueing us, the same situation as a 429
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new EmbeddingBusyError("OpenRouter request timed out");
      }
      throw err;
    }

    const canRetry =
      attempt === 0 &&
      deadline - Date.now() > RETRY_DELAY_MS + MIN_ATTEMPT_MS;
    if ((res.status === 429 || res.status >= 500) && canRetry) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    if (res.status === 429) {
      throw new EmbeddingBusyError(
        `OpenRouter rate limited: ${json.error?.message ?? "429"}`,
      );
    }
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

// JPEG buffers (already downscaled) -> one embedding each, same order.
// `deadline` (epoch ms) caps the call, retries included.
export function embedImages(images: Buffer[], deadline?: number) {
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
    deadline,
  );
}

export async function embedQuery(
  text: string,
  deadline?: number,
): Promise<{ embedding: number[]; usage: EmbeddingUsage }> {
  const { embeddings, usage } = await requestEmbeddings(
    [text],
    "search_query",
    deadline,
  );
  return { embedding: embeddings[0], usage };
}

// Photos of the event that have an embedding for the current model. Callers
// must have already authorized access to the event.
export async function getIndexedCount(eventSlug: string): Promise<number> {
  const { count, error } = await createServiceClient()
    .from("photo_embeddings")
    .select("photo_id", { count: "exact", head: true })
    .eq("event_slug", eventSlug)
    .eq("model", EMBEDDING_MODEL_TAG);
  return error ? 0 : (count ?? 0);
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
