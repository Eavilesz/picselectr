import { ImageResponse } from "next/og";
import { getGalleryBySlug } from "@/lib/galleries";

export const alt = "Galería de fotos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deliberately shows no photos: the gallery is PIN-protected, but link
// previews are fetched by bots without any PIN.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  const title = gallery?.title ?? "Galería de fotos";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #1a1a1a 0%, #000000 70%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {gallery?.studio_name && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 40,
            }}
          >
            {gallery.studio_name}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 24 ? 84 : 112,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 2,
            background: "rgba(255,255,255,0.3)",
            marginTop: 48,
            marginBottom: 40,
          }}
        />
        <div
          style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.8)" }}
        >
          Tus fotos están listas →
        </div>
      </div>
    ),
    { ...size },
  );
}
