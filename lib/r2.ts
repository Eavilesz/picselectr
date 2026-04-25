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

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
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
}

export async function getPhotosBySlug(slug: string): Promise<Photo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .select("id, original_key, thumbnail_key, display_order")
    .eq("event_slug", slug)
    .order("display_order", { ascending: true });

  if (error || !data) return [];

  return (data as PhotoRow[]).map((row, i) => ({
    id: row.id,
    originalUrl: `${PUBLIC_URL}/${row.original_key}`,
    thumbnailUrl: `${PUBLIC_URL}/${row.thumbnail_key}`,
    alt: `Foto ${i + 1}`,
  }));
}

export async function getPhotoCountsBySlug(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("photos")
    .select("event_slug");

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as { event_slug: string }[]) {
    counts[row.event_slug] = (counts[row.event_slug] ?? 0) + 1;
  }
  return counts;
}
