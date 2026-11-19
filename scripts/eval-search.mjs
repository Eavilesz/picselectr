// Semantic search evaluation: runs hand-labeled test queries against one
// indexed event and reports recall@K, so the similarity threshold can be
// chosen from data instead of guessed.
//
//   node --env-file=.env.local scripts/eval-search.mjs scripts/eval/<file>.json
//   node --env-file=.env.local scripts/eval-search.mjs <file>.json --k 12 --thresholds 0.5,0.55,0.6 --margins 0.04,0.06,0.08
//
// Ground-truth file (see scripts/eval/ground-truth.example.json):
//   {
//     "eventSlug": "abc123",
//     "queries": [
//       { "query": "la novia bailando", "relevant": ["IMG_1234", "IMG_1240"] },
//       { "query": "un avión", "relevant": [] }
//     ]
//   }
// `relevant` lists photo names (file name without extension, as uploaded) or
// photo ids. An empty list marks a NEGATIVE query: nothing in the event
// matches, so ideally search returns nothing.
//
// The app drops a result when its similarity is below the threshold t OR
// more than the margin m below the best match. Metrics:
//   recall@K  = relevant photos found in the top K / min(relevant photos, K)
//               (averaged over positive queries)
//   precision = relevant photos shown / photos shown (averaged over positive
//               queries that show anything). Only as good as the labels: a
//               fitting photo you didn't label counts as wrong.
//   negatives = negative queries that correctly returned nothing
//   avg shown = average number of results a client would see (capped at K)
// Two sweeps: thresholds with no margin, then margins at the app threshold.
// "none" disables that filter.
//
// Embeds the queries with the same model/dimensions/input_type as the app
// (read from lib/embeddings.ts) and ranks through the same search_photos RPC.
// Costs a fraction of a cent; not logged to ai_usage, so it never counts
// toward an event's daily search cap.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Args + config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!file) {
  console.error(
    "Usage: node --env-file=.env.local scripts/eval-search.mjs <ground-truth.json> [--k 12] [--thresholds 0.5,0.6] [--margins 0.04,0.06]",
  );
  process.exit(1);
}

// Single source of truth: the app's own constants
const embeddingsSource = await readFile(
  new URL("../lib/embeddings.ts", import.meta.url),
  "utf8",
);
function constant(name) {
  const m = embeddingsSource.match(
    new RegExp(`export const ${name} = ["']?([^"';\\n]+)["']?;`),
  );
  if (!m) throw new Error(`Couldn't read ${name} from lib/embeddings.ts`);
  return m[1].trim();
}
const MODEL = constant("EMBEDDING_MODEL");
const DIMENSIONS = Number(constant("EMBEDDING_DIMENSIONS").split(/\s/)[0]);
const MODEL_TAG = `${MODEL}@${DIMENSIONS}`;
const APP_THRESHOLD = Number(constant("SEARCH_MIN_SIMILARITY").split(/\s/)[0]);
const APP_MARGIN = Number(constant("SEARCH_RELATIVE_MARGIN").split(/\s/)[0]);

// Default = what the /select page shows before "Ver más resultados"
// (SEARCH_FIRST_RESULTS in app/select/[slug]/SelectionPage.tsx)
const K = Number(flag("k") ?? 12);
const numberList = (value, appValue) =>
  [...new Set(value.split(",").map(Number).concat(appValue))].sort(
    (a, b) => a - b,
  );
const thresholds = numberList(flag("thresholds") ?? "0.5,0.55,0.6,0.65,0.7", APP_THRESHOLD);
const margins = numberList(flag("margins") ?? "0.03,0.04,0.05,0.06,0.08,0.1", APP_MARGIN);
const RPC_LIMIT = 100; // search_photos caps match_limit at 100
if (K > RPC_LIMIT) throw new Error(`--k must be <= ${RPC_LIMIT}`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ---------------------------------------------------------------------------
// Ground truth
// ---------------------------------------------------------------------------

const truth = JSON.parse(await readFile(file, "utf8"));
if (!truth.eventSlug || !Array.isArray(truth.queries)) {
  throw new Error('Ground truth needs "eventSlug" and a "queries" array');
}
const slug = truth.eventSlug;

// name -> ids and id set, for resolving labels
const photos = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("photos")
    .select("id, name")
    .eq("event_slug", slug)
    .order("id")
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  photos.push(...data);
  if (data.length < 1000) break;
}
if (photos.length === 0) throw new Error(`Event "${slug}" has no photos`);

const ids = new Set(photos.map((p) => p.id));
const byName = new Map();
for (const p of photos) {
  if (!p.name) continue;
  byName.set(p.name, [...(byName.get(p.name) ?? []), p.id]);
}
const nameOf = new Map(photos.map((p) => [p.id, p.name ?? p.id.slice(0, 8)]));

const labelErrors = [];
const queries = truth.queries.map(({ query, relevant = [] }) => {
  const resolved = new Set();
  for (const label of relevant) {
    if (ids.has(label)) resolved.add(label);
    else if (byName.get(label)?.length === 1) resolved.add(byName.get(label)[0]);
    else if (byName.get(label)?.length > 1)
      labelErrors.push(`"${query}": name "${label}" matches several photos; use its id`);
    else labelErrors.push(`"${query}": no photo named or with id "${label}"`);
  }
  return { query, relevant: resolved };
});
if (labelErrors.length) {
  console.error("Fix these labels first:\n  " + labelErrors.join("\n  "));
  process.exit(1);
}

const { count: indexed } = await supabase
  .from("photo_embeddings")
  .select("photo_id", { count: "exact", head: true })
  .eq("event_slug", slug)
  .eq("model", MODEL_TAG);
if (!indexed) throw new Error(`Event "${slug}" has no embeddings for ${MODEL_TAG}`);

// ---------------------------------------------------------------------------
// Embed queries (batched) + rank
// ---------------------------------------------------------------------------

// Transient provider errors (429, 5xx, timeouts) are common; retry with backoff
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

async function embedBatch(input) {
  for (let attempt = 0; ; attempt++) {
    let status = 0;
    let message;
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          input,
          input_type: "search_query",
          dimensions: DIMENSIONS,
          encoding_format: "float",
          provider: { data_collection: "deny" },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) return json;
      status = res.status;
      message = json.error?.message ?? "no data";
    } catch (err) {
      if (err?.name !== "TimeoutError") throw err;
      message = "timed out";
    }

    const retryable = status === 0 || status === 429 || status >= 500;
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(`Embedding failed (${status || "timeout"}): ${message}`);
    }
    const wait = RETRY_DELAYS_MS[attempt];
    console.warn(`  OpenRouter ${status || "timeout"}: ${message} — retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

async function embedQueries(texts) {
  const out = [];
  let cost = 0;
  for (let i = 0; i < texts.length; i += 50) {
    const json = await embedBatch(texts.slice(i, i + 50));
    out.push(...json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    cost += json.usage?.cost ?? 0;
  }
  return { embeddings: out, cost };
}

const { embeddings, cost } = await embedQueries(queries.map((q) => q.query));

for (const [i, q] of queries.entries()) {
  // min_similarity -1 = no threshold: the full ranking, thresholds applied below
  const { data, error } = await supabase.rpc("search_photos", {
    p_event_slug: slug,
    query_embedding: embeddings[i],
    match_limit: RPC_LIMIT,
    p_model: MODEL_TAG,
    min_similarity: -1,
  });
  if (error) throw new Error(error.message);
  q.ranked = data; // [{ photo_id, similarity }] best first
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

const positives = queries.filter((q) => q.relevant.size > 0);
const negatives = queries.filter((q) => q.relevant.size === 0);

// t = threshold, m = margin below the best match; null disables either
function evaluate(q, t, m = null) {
  const best = q.ranked[0]?.similarity ?? 0;
  const shown = q.ranked
    .filter(
      (r) =>
        (t === null || r.similarity >= t) &&
        (m === null || r.similarity >= best - m),
    )
    .slice(0, K);
  const hits = shown.filter((r) => q.relevant.has(r.photo_id)).length;
  return {
    shown: shown.length,
    shownRows: shown,
    // Out of what fits in K: with 75 relevant photos and K=20, finding 20 is
    // a perfect score, not 27%
    recall: q.relevant.size ? hits / Math.min(q.relevant.size, K) : null,
    precision: q.relevant.size && shown.length ? hits / shown.length : null,
  };
}

const mean = (values) => {
  const xs = values.filter((x) => x !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
};
const pct = (x) => (Number.isNaN(x) ? "  —  " : `${(x * 100).toFixed(1)}%`.padStart(6));
const sim = (x) => (x === undefined ? "  —  " : x.toFixed(3));

console.log(`\nEvent ${slug}: ${photos.length} photos, ${indexed} indexed (${MODEL_TAG})`);
if (indexed < photos.length) {
  console.log(`  ⚠ ${photos.length - indexed} photos aren't indexed yet; they can't be found`);
}
console.log(
  `${positives.length} positive / ${negatives.length} negative queries · K=${K} · query cost $${cost.toFixed(6)}\n`,
);

// Per query: where the relevant photos rank, and how scores separate
console.log(`Per query (ranking without filters; "app" = what a client sees now)`);
for (const q of queries) {
  const r = evaluate(q, null);
  const app = evaluate(q, APP_THRESHOLD, APP_MARGIN);
  // What a client sees that isn't labeled: check these by eye. Any that fit
  // the query belong in "relevant" (they're counted as wrong until then).
  const unlabeled = app.shownRows
    .filter((row) => !q.relevant.has(row.photo_id))
    .map((row) => nameOf.get(row.photo_id));
  const relevantRanks = q.ranked
    .map((row, i) => (q.relevant.has(row.photo_id) ? i + 1 : null))
    .filter(Boolean);
  const bestOther = q.ranked.find((row) => !q.relevant.has(row.photo_id));
  const worstRelevant = q.ranked.filter((row) => q.relevant.has(row.photo_id)).at(-1);
  const missing = [...q.relevant].filter(
    (id) => !q.ranked.some((row) => row.photo_id === id),
  );
  console.log(
    `  "${q.query}"` +
      (q.relevant.size
        ? `\n      recall@${K} ${pct(r.recall)} · relevant at ranks [${relevantRanks.join(", ")}]` +
          (missing.length ? ` · not in top ${RPC_LIMIT}: ${missing.map((id) => nameOf.get(id)).join(", ")}` : "") +
          `\n      lowest relevant sim ${sim(worstRelevant?.similarity)} · best non-relevant sim ${sim(bestOther?.similarity)}` +
          `\n      app: shows ${app.shown} · recall ${pct(app.recall)} · precision ${pct(app.precision ?? NaN)}` +
          (unlabeled.length ? `\n      shown but not labeled (check): ${unlabeled.join(", ")}` : "")
        : `\n      NEGATIVE · top sim ${sim(q.ranked[0]?.similarity)} · app shows ${app.shown}` +
          (unlabeled.length ? ` (${unlabeled.join(", ")})` : "")),
  );
}

function sweepRow(label, t, m) {
  const results = queries.map((q) => evaluate(q, t, m));
  const pos = results.filter((_, i) => queries[i].relevant.size > 0);
  const negOk = results.filter((r, i) => !queries[i].relevant.size && r.shown === 0).length;
  console.log(
    `  ${label.padEnd(9)}   ${pct(mean(pos.map((r) => r.recall)))}     ` +
      `${pct(mean(pos.map((r) => r.precision)))}      ` +
      `${negatives.length ? `${negOk}/${negatives.length}`.padStart(5) : "    —"}           ` +
      `${mean(results.map((r) => r.shown)).toFixed(1).padStart(5)}`,
  );
}
const header = (name) =>
  console.log(`  ${name.padEnd(9)}   recall@${K}   precision   negatives empty   avg shown`);
const tag = (v, appValue) => String(v) + (v === appValue ? " ←" : "");

// Threshold sweep: picks SEARCH_MIN_SIMILARITY (keeps unrelated queries empty)
console.log(`\nThreshold sweep, no margin (app uses ${APP_THRESHOLD})`);
header("threshold");
for (const t of [null, ...thresholds]) {
  sweepRow(t === null ? "none" : tag(t, APP_THRESHOLD), t, null);
}

// Margin sweep: picks SEARCH_RELATIVE_MARGIN (trims same-theme filler). It
// never empties a negative query: the best match is always within the margin.
console.log(`\nMargin sweep at threshold ${APP_THRESHOLD} (app uses ${APP_MARGIN})`);
header("margin");
for (const m of [null, ...margins]) {
  sweepRow(m === null ? "none" : tag(m, APP_MARGIN), APP_THRESHOLD, m);
}

console.log(
  "\nThreshold: the highest one that keeps recall close to 'none' while emptying\n" +
    "the negative queries. Margin: the smallest one that keeps that recall, which\n" +
    "maximizes precision. Set both in lib/embeddings.ts.\n",
);
