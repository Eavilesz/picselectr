import { NextResponse } from "next/server";
import sharp from "sharp";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { r2, BUCKET } from "@/lib/r2-client";
import {
  EMBEDDING_MODEL_TAG,
  EmbeddingRateLimitError,
  embedImages,
  logAiUsage,
} from "@/lib/embeddings";

// Indexes one batch of an event's photos for semantic search. Idempotent and
// resumable: each call picks up photos that still have no embedding for the
// current model, so the caller just repeats it until `remaining` is 0.
//
// Vercel Hobby caps functions at 60s, so the batch stops starting new work
// once TIME_BUDGET_MS is spent and returns what it finished.

sharp.cache(false);

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 50; // photos per call
// Images per OpenRouter request. The upstream quota counts requests per
// minute, so bigger requests go further (25 measured at ~1.2s; 50 at ~11s).
const CHUNK_SIZE = 25;
const PREP_CONCURRENCY = 4; // originals decoded at once (memory)
const TIME_BUDGET_MS = 45_000; // leaves headroom for the last chunk
const AI_IMAGE_SIZE = 768; // long edge sent to the model
const PAGE_SIZE = 1000;

interface PhotoRow {
  id: string;
  event_slug: string;
  original_key: string | null;
  thumbnail_key: string;
}

type Supabase = ReturnType<typeof createServiceClient>;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// All of the event's photos, oldest-first so progress follows upload order
async function listPhotos(supabase: Supabase, slug: string) {
  const rows: PhotoRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("photos")
      .select("id, event_slug, original_key, thumbnail_key")
      .eq("event_slug", slug)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data as PhotoRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function listIndexedIds(supabase: Supabase, slug: string) {
  const ids = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("photo_embeddings")
      .select("photo_id")
      .eq("event_slug", slug)
      .eq("model", EMBEDDING_MODEL_TAG)
      .order("photo_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data as { photo_id: string }[]) ids.add(row.photo_id);
    if (data.length < PAGE_SIZE) break;
  }
  return ids;
}

async function readR2(key: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error("empty object");
  return Buffer.from(await res.Body.transformToByteArray());
}

// ~768px JPEG for the model. Prefers the original (best detail); falls back
// to the 600px thumbnail when there is no original or it can't be decoded.
async function prepareImage(photo: PhotoRow): Promise<Buffer> {
  const keys = [photo.original_key, photo.thumbnail_key].filter(
    (k): k is string => !!k,
  );
  let lastError: unknown;
  for (const key of keys) {
    try {
      return await sharp(await readR2(key), { failOn: "none" })
        .rotate() // apply EXIF orientation
        .resize({
          width: AI_IMAGE_SIZE,
          height: AI_IMAGE_SIZE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("no image key");
}

// Runs fn over items with at most `limit` in flight; keeps input order
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const startedAt = Date.now();
  const { slug } = await params;

  // Ownership through RLS: only the owner gets the event row back (also
  // covers "not signed in"). Everything after this uses the service role.
  const { data: event } = await (await createClient())
    .from("events")
    .select("slug, semantic_search_enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!event) return error("Evento no encontrado", 404);
  if (!event.semantic_search_enabled) {
    return error("La búsqueda inteligente no está activada", 409);
  }

  const supabase = createServiceClient();
  let photos: PhotoRow[];
  let indexedIds: Set<string>;
  try {
    [photos, indexedIds] = await Promise.all([
      listPhotos(supabase, slug),
      listIndexedIds(supabase, slug),
    ]);
  } catch (err) {
    console.error("Index: listing failed", err);
    return error("Error al leer las fotos", 500);
  }

  const pending = photos.filter((p) => !indexedIds.has(p.id));
  const batch = pending.slice(0, BATCH_SIZE);

  let indexed = 0;
  let stopReason: string | null = null;
  const failed: { id: string; error: string }[] = [];

  for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      stopReason = "time_budget";
      break;
    }

    const chunk = batch.slice(i, i + CHUNK_SIZE);
    const prepared = await mapLimit(chunk, PREP_CONCURRENCY, prepareImage);

    const ready: { photo: PhotoRow; image: Buffer }[] = [];
    prepared.forEach((r, j) => {
      if (r.status === "fulfilled") ready.push({ photo: chunk[j], image: r.value });
      else failed.push({ id: chunk[j].id, error: message(r.reason) });
    });
    if (ready.length === 0) continue;

    let embeddings: number[][];
    try {
      const result = await embedImages(ready.map((r) => r.image));
      embeddings = result.embeddings;
      await logAiUsage(slug, "index", result.usage);
    } catch (err) {
      // Stop here; the next call resumes. "rate_limited" tells the client
      // to wait for the per-minute quota to reset before calling again.
      if (err instanceof EmbeddingRateLimitError) {
        console.warn("Index: rate limited", err.message);
        stopReason = "rate_limited";
      } else {
        console.error("Index: embedding failed", err);
        stopReason = "embedding_error";
      }
      break;
    }

    // ignoreDuplicates: a concurrent call that already stored a photo wins
    const { error: insertError } = await supabase
      .from("photo_embeddings")
      .upsert(
        ready.map((r, j) => ({
          photo_id: r.photo.id,
          event_slug: r.photo.event_slug,
          embedding: embeddings[j],
          model: EMBEDDING_MODEL_TAG,
        })),
        { onConflict: "photo_id,model", ignoreDuplicates: true },
      );
    if (insertError) {
      console.error("Index: insert failed", insertError);
      stopReason = "insert_error";
      break;
    }
    indexed += ready.length;
  }

  return NextResponse.json({
    indexed,
    total: photos.length,
    remaining: pending.length - indexed,
    failed,
    stopReason,
  });
}
