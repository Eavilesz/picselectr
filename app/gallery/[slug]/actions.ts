"use server";

import { getGalleryBySlug, grantGalleryAccess } from "@/lib/galleries";
import { checkPinWithLimit, type PinCheck } from "@/lib/pin-attempts";

// Checks the PIN (with the server-side attempt limit) and, on success, sets
// the access cookie. Setting a cookie in a server action re-renders the
// page, which then shows the photos.
export async function unlockGallery(
  slug: string,
  pin: string,
): Promise<{ result: PinCheck }> {
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return { result: "wrong" };

  const result = await checkPinWithLimit(
    "gallery",
    gallery.slug,
    async () => /^\d{4}$/.test(pin) && gallery.pin === pin,
  );
  if (result === "ok") await grantGalleryAccess(gallery);
  return { result };
}
