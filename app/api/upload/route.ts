import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

export const maxDuration = 60;

// Increase body size limit to 50 MB for large photo uploads
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  // Require authenticated session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Error al leer el formulario" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const slug = formData.get("slug");
  const orderRaw = formData.get("order");

  if (!(file instanceof Blob) || typeof slug !== "string" || !slug) {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  const order = typeof orderRaw === "string" ? parseInt(orderRaw, 10) : 0;

  // Extract original filename without extension
  const originalName =
    "name" in file && typeof (file as File).name === "string"
      ? (file as File).name.replace(/\.[^.]+$/, "")
      : null;

  // Validate slug belongs to an existing event (prevents unauthorized uploads)
  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("slug")
    .eq("slug", slug)
    .single();

  if (eventError || !eventRow) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 },
    );
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());

  // Determine original file extension from MIME type
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
  };
  const ext = mimeToExt[file.type] ?? "jpg";

  const id = crypto.randomUUID();
  const originalKey = `events/${slug}/originals/${id}.${ext}`;
  const thumbnailKey = `events/${slug}/thumbnails/${id}.webp`;

  // Generate thumbnail with Sharp (600px wide, WebP, quality 80)
  let thumbnailBuffer: Buffer;
  try {
    thumbnailBuffer = await sharp(originalBuffer)
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Error al procesar la imagen" },
      { status: 422 },
    );
  }

  // Upload both to R2
  try {
    await Promise.all([
      uploadToR2(originalKey, originalBuffer, file.type || "image/jpeg"),
      uploadToR2(thumbnailKey, thumbnailBuffer, "image/webp"),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 502 },
    );
  }

  // Insert record into Supabase photos table
  const { data: photoRow, error: insertError } = await supabase
    .from("photos")
    .insert({
      id,
      event_slug: slug,
      original_key: originalKey,
      thumbnail_key: thumbnailKey,
      display_order: order,
      name: originalName,
    })
    .select("id, original_key, thumbnail_key, display_order")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Error al guardar la foto" },
      { status: 500 },
    );
  }

  const publicUrl = process.env.R2_PUBLIC_URL!;
  return NextResponse.json({
    id: photoRow.id,
    originalUrl: `${publicUrl}/${photoRow.original_key}`,
    thumbnailUrl: `${publicUrl}/${photoRow.thumbnail_key}`,
    alt: `Foto ${order + 1}`,
  });
}
