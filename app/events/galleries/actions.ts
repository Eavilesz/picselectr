"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGalleryObjects,
  deleteGalleryPrefix,
  generateGallerySlug,
  generatePin,
  getOwnedGallery,
} from "@/lib/galleries";

// Every action re-checks ownership through RLS (getOwnedGallery) before
// touching R2, since server actions are callable by anyone.

async function requireOwnedGallery(slug: string) {
  const gallery = await getOwnedGallery(slug);
  if (!gallery) throw new Error("Galería no encontrada");
  return gallery;
}

export async function createGallery(title: string): Promise<{ slug: string }> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error("El título es requerido");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");

  const studioName =
    (user.user_metadata?.studio_name as string | undefined) ?? null;

  // Retry on the (very unlikely) slug collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateGallerySlug();
    const { error } = await supabase.from("galleries").insert({
      slug,
      title: cleanTitle,
      studio_name: studioName,
      pin: generatePin(),
      created_by: user.id,
    });
    if (!error) {
      revalidatePath("/events/galleries");
      return { slug };
    }
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudo crear la galería. Intenta de nuevo.");
}

export async function setGalleryCover(
  slug: string,
  photoId: string,
): Promise<void> {
  const gallery = await requireOwnedGallery(slug);
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("id")
    .eq("id", photoId)
    .eq("gallery_id", gallery.id)
    .maybeSingle();
  if (!photo) throw new Error("Foto no encontrada");

  const { error } = await supabase
    .from("galleries")
    .update({ cover_photo_id: photoId })
    .eq("id", gallery.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/events/galleries/${slug}`);
}

export async function deleteGalleryPhoto(
  slug: string,
  photoId: string,
): Promise<void> {
  const gallery = await requireOwnedGallery(slug);
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("original_key, display_key, thumbnail_key")
    .eq("id", photoId)
    .eq("gallery_id", gallery.id)
    .maybeSingle();
  if (!photo) throw new Error("Foto no encontrada");

  // Row first: a dangling R2 object is harmless, a row without files is not.
  // The cover FK is "on delete set null", so deleting the cover is fine.
  const { error } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw new Error(error.message);

  const p = photo as {
    original_key: string;
    display_key: string;
    thumbnail_key: string;
  };
  await deleteGalleryObjects([p.original_key, p.display_key, p.thumbnail_key]);

  revalidatePath(`/events/galleries/${slug}`);
}

export async function deleteGallery(slug: string): Promise<void> {
  const gallery = await requireOwnedGallery(slug);
  const supabase = await createClient();

  // photos cascade-delete via FK
  const { error } = await supabase
    .from("galleries")
    .delete()
    .eq("id", gallery.id);
  if (error) throw new Error(error.message);

  await deleteGalleryPrefix(slug);
  revalidatePath("/events/galleries");
}
