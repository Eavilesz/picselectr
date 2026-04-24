"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const EVENTS_PREFIX = "picselectr/events/";

/**
 * Returns a map of { [slug]: photoCount } for all events.
 * Uses a single Cloudinary Admin API call and groups results by slug.
 */
export async function getPhotoCountsBySlug(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  let nextCursor: string | undefined;

  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await cloudinary.api.resources({
      type: "upload",
      prefix: EVENTS_PREFIX,
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });

    for (const resource of result.resources ?? []) {
      // public_id looks like "picselectr/events/<slug>/<filename>"
      const rest = (resource.public_id as string).slice(EVENTS_PREFIX.length);
      const slug = rest.split("/")[0];
      if (slug) {
        counts[slug] = (counts[slug] ?? 0) + 1;
      }
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return counts;
}
