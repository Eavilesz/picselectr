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
  usageCache = null;
}

export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  usageCache = null;
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

export interface BucketUsage {
  bytes: number;
  objectCount: number;
}

// Listing the whole bucket takes many sequential requests (1000 objects each),
// so the result is cached in memory and shared between concurrent callers.
const USAGE_TTL_MS = 10 * 60 * 1000;
let usageCache: { value: BucketUsage; at: number } | null = null;
let usageInFlight: Promise<BucketUsage> | null = null;

export async function getBucketUsage(): Promise<BucketUsage> {
  if (usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) {
    return usageCache.value;
  }
  usageInFlight ??= scanBucketUsage()
    .then((value) => {
      usageCache = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      usageInFlight = null;
    });
  return usageInFlight;
}

async function scanBucketUsage(): Promise<BucketUsage> {
  let bytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }),
    );

    for (const obj of result.Contents ?? []) {
      bytes += obj.Size ?? 0;
      objectCount += 1;
    }

    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return { bytes, objectCount };
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

export async function getPhotosBySlug(slug: string): Promise<Photo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .select("id, original_key, thumbnail_key, display_order, name")
    .eq("event_slug", slug)
    .order("display_order", { ascending: true });

  if (error || !data) return [];

  return (data as PhotoRow[]).map((row, i) => ({
    id: row.id,
    originalUrl: `${PUBLIC_URL}/${row.original_key}`,
    thumbnailUrl: `${PUBLIC_URL}/${row.thumbnail_key}`,
    alt: `Foto ${i + 1}`,
    name: row.name ?? null,
  }));
}

export async function getPhotosByIds(ids: string[]): Promise<Photo[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .select("id, original_key, thumbnail_key, display_order, name")
    .in("id", ids)
    .order("display_order", { ascending: true });

  if (error || !data) return [];

  return (data as PhotoRow[]).map((row, i) => ({
    id: row.id,
    originalUrl: `${PUBLIC_URL}/${row.original_key}`,
    thumbnailUrl: `${PUBLIC_URL}/${row.thumbnail_key}`,
    alt: `Foto ${i + 1}`,
    name: row.name ?? null,
  }));
}

export async function getPhotoCountsBySlug(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("photos").select("event_slug");

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as { event_slug: string }[]) {
    counts[row.event_slug] = (counts[row.event_slug] ?? 0) + 1;
  }
  return counts;
}
