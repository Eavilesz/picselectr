import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getEventBySlug, isEventOwner } from "@/app/events/store";
import { hasEventAccess } from "@/lib/event-access";
import { getMessages } from "@/lib/i18n";
import {
  EMBEDDING_MODEL_TAG,
  EmbeddingBusyError,
  SEARCH_MIN_SIMILARITY,
  SEARCH_RELATIVE_MARGIN,
  embedQuery,
  logAiUsage,
} from "@/lib/embeddings";

// Semantic search over one event's photos, for the /select page.
// Allowed for the event owner (session) or a client who entered the PIN
// (event access cookie). Each query costs money, so non-owners get a daily
// cap per event.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A query embeds in well under a second; past this the provider is
// saturated and the client is better off being told to retry
const EMBED_DEADLINE_MS = 15_000;
const MAX_QUERY_LENGTH = 200;
const MATCH_LIMIT = 48;
const DAILY_QUERY_CAP = 200; // per event, non-owner searches

function error(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const body = (await request.json().catch(() => null)) as {
    query?: unknown;
  } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  // Disabled and missing events look the same from outside
  const event = await getEventBySlug(slug);
  // Errors are shown to the client, in the event's language
  const t = getMessages(event?.language);
  if (!event?.semanticSearchEnabled) {
    return error(t.api.unavailable, 404);
  }
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return error(t.api.emptyQuery, 400);
  }

  const owner = await isEventOwner(slug);
  if (!owner && !(await hasEventAccess(slug))) {
    // The client UI asks for the PIN again on this code (covers visitors
    // who passed PinGate before the access cookie existed)
    return error(t.api.pinRequired, 401, "pin_required");
  }

  const supabase = createServiceClient();

  if (!owner) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("event_slug", slug)
      .eq("operation", "query")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_QUERY_CAP) {
      return error(t.api.dailyCap, 429, "daily_cap");
    }
  }

  let embedding: number[];
  try {
    const result = await embedQuery(query, Date.now() + EMBED_DEADLINE_MS);
    embedding = result.embedding;
    await logAiUsage(slug, "query", result.usage);
  } catch (err) {
    console.error("Search: embedding failed", err);
    return error(
      err instanceof EmbeddingBusyError ? t.api.busy : t.api.failed,
      503,
    );
  }

  // search_photos always filters by event + model; the threshold drops
  // weak matches so unrelated queries return nothing
  const { data, error: rpcError } = await supabase.rpc("search_photos", {
    p_event_slug: slug,
    query_embedding: embedding,
    match_limit: MATCH_LIMIT,
    p_model: EMBEDDING_MODEL_TAG,
    min_similarity: SEARCH_MIN_SIMILARITY,
  });
  if (rpcError) {
    console.error("Search: rpc failed", rpcError);
    return error(t.api.failed, 500);
  }

  // Rows come best-first. Keep only those close to the best match: the rest
  // pass the threshold just for sharing the event's theme.
  const rows = data as { photo_id: string; similarity: number }[];
  const cutoff = (rows[0]?.similarity ?? 0) - SEARCH_RELATIVE_MARGIN;
  const results = rows
    .filter((r) => r.similarity >= cutoff)
    .map((r) => ({ id: r.photo_id, similarity: r.similarity }));
  return NextResponse.json({ results });
}
