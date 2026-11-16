import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import {
  deleteGalleryObjects,
  galleryPrefix,
  getOwnedGallery,
  putGalleryObject,
} from "@/lib/galleries";

sharp.cache(false);

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DISPLAY_SIZE = 2048; // lightbox, long edge
const THUMBNAIL_WIDTH = 1000; // grid (sharp on 2x screens at ~450px columns)

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/tiff": "tiff",
};

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("Error al leer el formulario", 400);
  }

  const file = formData.get("file");
  const slug = formData.get("slug");
  const orderRaw = formData.get("order");

  if (!(file instanceof File) || typeof slug !== "string" || !slug) {
    return error("Parámetros inválidos", 400);
  }

  // RLS: only the gallery owner gets a row back (also covers "not signed in")
  const gallery = await getOwnedGallery(slug);
  if (!gallery) return error("Galería no encontrada", 404);

  const order = typeof orderRaw === "string" ? parseInt(orderRaw, 10) || 0 : 0;
  const nameExt = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const ext = nameExt ?? MIME_TO_EXT[file.type] ?? "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || `foto-${order + 1}`;
  const fileName = `${baseName}.${ext}`;

  const originalBuffer = Buffer.from(await file.arrayBuffer());

  // .rotate() applies EXIF orientation so derived images match the original
  let display: { data: Buffer; info: sharp.OutputInfo };
  let thumbnail: Buffer;
  try {
    const base = sharp(originalBuffer, { failOn: "none" }).rotate();
    [display, thumbnail] = await Promise.all([
      base
        .clone()
        .resize({
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true }),
      base
        .clone()
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer(),
    ]);
  } catch {
    return error(`No se pudo procesar "${file.name}"`, 422);
  }

  const id = crypto.randomUUID();
  const prefix = galleryPrefix(slug);
  const originalKey = `${prefix}originals/${id}.${ext}`;
  const displayKey = `${prefix}display/${id}.webp`;
  const thumbnailKey = `${prefix}thumbnails/${id}.webp`;

  try {
    await Promise.all([
      putGalleryObject(
        originalKey,
        originalBuffer,
        file.type || "image/jpeg",
        fileName,
      ),
      putGalleryObject(displayKey, display.data, "image/webp"),
      putGalleryObject(thumbnailKey, thumbnail, "image/webp"),
    ]);
  } catch {
    return error("Error al subir la imagen", 502);
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("gallery_photos").insert({
    id,
    gallery_id: gallery.id,
    original_key: originalKey,
    display_key: displayKey,
    thumbnail_key: thumbnailKey,
    file_name: fileName,
    width: display.info.width,
    height: display.info.height,
    display_order: order,
    original_size: originalBuffer.length,
    display_size: display.data.length,
    thumbnail_size: thumbnail.length,
  });

  if (insertError) {
    await deleteGalleryObjects([originalKey, displayKey, thumbnailKey]).catch(
      () => {},
    );
    return error("Error al guardar la foto", 500);
  }

  return NextResponse.json({ id });
}
