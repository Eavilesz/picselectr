// Client-side helper: drives POST /api/events/<slug>/index until the event is
// fully indexed. Each call handles one time-boxed batch (Vercel's 60s limit),
// so progress survives across calls and an interrupted run can be resumed
// with the same function.
//
// The embedding provider has a per-minute request quota. When a call reports
// "provider_busy", this waits here in the browser (free, no server time) and
// carries on, giving up only after several minutes without progress.

const MAX_CALLS = 500; // hard stop; 1,500 photos take ~30 calls
const RATE_LIMIT_WAIT_MS = 30_000;
const MAX_RATE_LIMIT_WAITS = 6; // consecutive waits with no progress (~3 min)

export interface IndexingResult {
  done: number;
  total: number;
  error: string | null;
}

interface IndexResponse {
  indexed: number;
  total: number;
  remaining: number;
  failed: unknown[];
  stopReason: string | null;
  error?: string;
}

export async function indexEventPhotos(
  slug: string,
  // waiting = true while paused for the provider's rate limit
  onProgress: (done: number, total: number, waiting: boolean) => void,
): Promise<IndexingResult> {
  let done = 0;
  let total = 0;
  let idleWaits = 0;

  for (let call = 0; call < MAX_CALLS; call++) {
    let body: IndexResponse;
    try {
      const res = await fetch(`/api/events/${slug}/index`, { method: "POST" });
      body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? res.statusText);
    } catch (err) {
      return {
        done,
        total,
        error: err instanceof Error ? err.message : "Error desconocido",
      };
    }

    done = body.total - body.remaining;
    total = body.total;
    onProgress(done, total, false);
    if (body.remaining === 0) return { done, total, error: null };

    if (body.stopReason === "provider_busy") {
      idleWaits = body.indexed > 0 ? 0 : idleWaits + 1;
      if (idleWaits > MAX_RATE_LIMIT_WAITS) {
        return {
          done,
          total,
          error:
            "El servicio de indexado está saturado. Intenta en unos minutos.",
        };
      }
      onProgress(done, total, true);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
      continue;
    }

    // Nothing new got indexed for another reason: every pending photo is
    // unreadable or the provider is failing. Stop instead of looping; the
    // event page can resume it later.
    if (body.indexed === 0) {
      return {
        done,
        total,
        error:
          body.stopReason === "embedding_error"
            ? "El servicio de indexado no respondió. Intenta más tarde."
            : null,
      };
    }
  }

  return { done, total, error: null };
}
