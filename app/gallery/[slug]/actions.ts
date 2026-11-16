"use server";

import { getGalleryBySlug, grantGalleryAccess } from "@/lib/galleries";

// Checks the PIN and, on success, sets the access cookie. Setting a cookie
// in a server action re-renders the page, which then shows the photos.
export async function unlockGallery(
  slug: string,
  pin: string,
): Promise<{ ok: boolean }> {
  const gallery = await getGalleryBySlug(slug);
  if (gallery && /^\d{4}$/.test(pin) && gallery.pin === pin) {
    await grantGalleryAccess(gallery);
    return { ok: true };
  }
  // Slows down scripted guessing
  await new Promise((r) => setTimeout(r, 800));
  return { ok: false };
}
