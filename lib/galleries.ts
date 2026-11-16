import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { r2, BUCKET, PUBLIC_URL } from "@/lib/r2-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GalleryRow {
  id: string;
  slug: string;
  title: string;
  studio_name: string | null;
  pin: string;
  cover_photo_id: string | null;
  created_by: string;
  created_at: string;
}

interface GalleryPhotoRow {
  id: string;
  original_key: string;
  display_key: string;
  thumbnail_key: string;
  file_name: string | null;
  width: number;
  height: number;
}

// Safe to pass to client components
export interface GalleryPhoto {
  id: string;
  thumbnailUrl: string;
  displayUrl: string;
  originalUrl: string;
  fileName: string;
  width: number;
  height: number;
}

const PHOTO_COLUMNS =
  "id, original_key, display_key, thumbnail_key, file_name, width, height";
const PAGE_SIZE = 1000;

export function toGalleryPhoto(row: GalleryPhotoRow, i: number): GalleryPhoto {
  return {
    id: row.id,
    thumbnailUrl: `${PUBLIC_URL}/${row.thumbnail_key}`,
    displayUrl: `${PUBLIC_URL}/${row.display_key}`,
    originalUrl: `${PUBLIC_URL}/${row.original_key}`,
    fileName: row.file_name ?? `foto-${i + 1}.jpg`,
    width: row.width,
    height: row.height,
  };
}

export function thumbnailUrlFor(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

// Public lookup (service role). Includes the PIN — never hand the row itself
// to a client component.
export const getGalleryBySlug = cache(
  async (slug: string): Promise<GalleryRow | null> => {
    const { data } = await createServiceClient()
      .from("galleries")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as GalleryRow | null) ?? null;
  },
);

// Owner lookup through RLS: null when the gallery doesn't exist or belongs
// to another studio. Every admin mutation goes through this first.
export async function getOwnedGallery(
  slug: string,
): Promise<GalleryRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("galleries")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as GalleryRow | null) ?? null;
}

export async function getGalleryPhotos(
  galleryId: string,
): Promise<GalleryPhoto[]> {
  const supabase = createServiceClient();
  const rows: GalleryPhotoRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select(PHOTO_COLUMNS)
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true }) // tie-breaker keeps pages stable
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) break;
    rows.push(...(data as GalleryPhotoRow[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(toGalleryPhoto);
}

export async function isGalleryOwner(gallery: GalleryRow): Promise<boolean> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  return auth?.claims.sub === gallery.created_by;
}

// ---------------------------------------------------------------------------
// PIN + slug generation
// ---------------------------------------------------------------------------

const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateGallerySlug(): string {
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  }
  return slug;
}

export function generatePin(): string {
  return String(randomInt(1000, 10000));
}

// ---------------------------------------------------------------------------
// Access cookie: proves the visitor entered the right PIN. The value is an
// HMAC of slug + PIN, so it can't be forged without the server secret and
// it stops working if the PIN ever changes.
// ---------------------------------------------------------------------------

const ACCESS_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const accessCookieName = (slug: string) => `gallery_access_${slug}`;

function accessToken(slug: string, pin: string): string {
  const secret =
    process.env.GALLERY_ACCESS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing GALLERY_ACCESS_SECRET");
  return createHmac("sha256", secret).update(`${slug}:${pin}`).digest("hex");
}

export async function hasGalleryAccess(gallery: GalleryRow): Promise<boolean> {
  const value = (await cookies()).get(accessCookieName(gallery.slug))?.value;
  if (!value) return false;
  const expected = Buffer.from(accessToken(gallery.slug, gallery.pin));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function grantGalleryAccess(gallery: GalleryRow): Promise<void> {
  (await cookies()).set(
    accessCookieName(gallery.slug),
    accessToken(gallery.slug, gallery.pin),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/gallery/${gallery.slug}`,
      maxAge: ACCESS_MAX_AGE,
    },
  );
}

// ---------------------------------------------------------------------------
// R2
// ---------------------------------------------------------------------------

export const galleryPrefix = (slug: string) => `galleries/${slug}/`;

// RFC 6266 header: ASCII fallback plus the exact UTF-8 name
function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function putGalleryObject(
  key: string,
  body: Buffer,
  contentType: string,
  downloadName?: string,
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Originals are served as downloads so the client gets the file
      // instead of the browser opening it (<a download> is ignored
      // cross-origin). <img> tags are unaffected by this header.
      ...(downloadName
        ? { ContentDisposition: attachmentDisposition(downloadName) }
        : {}),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteGalleryObjects(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (batch.length === 0) continue;
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

export async function deleteGalleryPrefix(slug: string): Promise<void> {
  let continuationToken: string | undefined;
  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: galleryPrefix(slug),
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }),
    );
    await deleteGalleryObjects(
      (result.Contents ?? []).map((o) => o.Key!).filter(Boolean),
    );
    continuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
