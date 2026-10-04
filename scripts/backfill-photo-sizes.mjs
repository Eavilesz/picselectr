// One-time backfill: fills photos.original_size / thumbnail_size for rows
// uploaded before those columns existed, using the sizes stored in R2.
//
//   node --env-file=.env.local scripts/backfill-photo-sizes.mjs
//
// Safe to re-run: it only touches rows whose sizes are still 0.

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const PAGE_SIZE = 1000;
const CONCURRENCY = 10;

// key -> size for every object under events/
const sizes = new Map();
let continuationToken;
do {
  const result = await r2.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "events/",
      ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
    }),
  );
  for (const obj of result.Contents ?? []) sizes.set(obj.Key, obj.Size ?? 0);
  continuationToken = result.IsTruncated
    ? result.NextContinuationToken
    : undefined;
} while (continuationToken);
console.log(`Listed ${sizes.size} R2 objects`);

// Rows still missing sizes. Updated rows drop out of this filter, so each
// pass re-reads from the start; rows with no R2 object are skipped by id.
const missing = new Set();
let updated = 0;
for (;;) {
  const { data: rows, error } = await supabase
    .from("photos")
    .select("id, original_key, thumbnail_key")
    .eq("original_size", 0)
    .eq("thumbnail_size", 0)
    .order("id", { ascending: true })
    .range(missing.size, missing.size + PAGE_SIZE - 1);
  if (error) throw error;
  if (rows.length === 0) break;

  const todo = [];
  for (const row of rows) {
    const original = sizes.get(row.original_key);
    const thumbnail = sizes.get(row.thumbnail_key);
    if (original == null && thumbnail == null) missing.add(row.id);
    else todo.push({ id: row.id, original: original ?? 0, thumbnail: thumbnail ?? 0 });
  }

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map(async ({ id, original, thumbnail }) => {
        const { error } = await supabase
          .from("photos")
          .update({ original_size: original, thumbnail_size: thumbnail })
          .eq("id", id);
        if (error) throw error;
      }),
    );
  }
  updated += todo.length;
  console.log(`Updated ${updated} rows`);
}

console.log(
  `Done. ${updated} rows updated, ${missing.size} rows have no matching R2 object.`,
);
