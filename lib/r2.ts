"use server";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// R2 client
// ---------------------------------------------------------------------------

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Photo {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  alt: string;
  name: string | null;
}

// ---------------------------------------------------------------------------
// R2 helpers
// ---------------------------------------------------------------------------

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteEventPhotos(slug: string): Promise<void> {
  const prefix = `events/${slug}/`;
  let continuationToken: string | undefined;

  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }),
    );

    const keys = (result.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
    await Promise.all(keys.map((key) => deleteR2Object(key)));

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

// ---------------------------------------------------------------------------
// Photo queries (backed by Supabase photos table)
// ---------------------------------------------------------------------------

interface PhotoRow {
  id: string;
  original_key: string;
  thumbnail_key: string;
  display_order: number;
  name: string | null;
}

// Supabase returns at most 1000 rows per request, so larger sets are read in pages
const PAGE_SIZE = 1000;
// Keeps `.in()` filters well under URL length limits
const ID_CHUNK = 100;

function toPhoto(row: PhotoRow, i: number): Photo {
  return {
    id: row.id,
    originalUrl: `${PUBLIC_URL}/${row.original_key}`,
    thumbnailUrl: `${PUBLIC_URL}/${row.thumbnail_key}`,
    alt: `Foto ${i + 1}`,
    name: row.name ?? null,
  };
}

export async function getPhotosBySlug(slug: string): Promise<Photo[]> {
  const supabase = await createClient();
  const rows: PhotoRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("photos")
      .select("id, original_key, thumbnail_key, display_order, name")
      .eq("event_slug", slug)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true }) // tie-breaker keeps pages stable
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) return [];
    rows.push(...(data as PhotoRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(toPhoto);
}

export async function getPhotoCount(slug: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_slug", slug);

  return error ? 0 : (count ?? 0);
}

export async function getPhotosByIds(ids: string[]): Promise<Photo[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const rows: PhotoRow[] = [];

  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data, error } = await supabase
      .from("photos")
      .select("id, original_key, thumbnail_key, display_order, name")
      .in("id", ids.slice(i, i + ID_CHUNK));

    if (error || !data) return [];
    rows.push(...(data as PhotoRow[]));
  }

  rows.sort((a, b) => a.display_order - b.display_order);
  return rows.map(toPhoto);
}

export async function getPhotoCountsBySlug(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("photo_counts");
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data as { event_slug: string; photo_count: number }[]) {
    counts[row.event_slug] = row.photo_count;
  }
  return counts;
}

// Bytes stored in R2 (originals + thumbnails), summed from sizes recorded at upload
export async function getStorageBytes(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("storage_usage");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
