import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/app/events/store";
import { getEventTitleLabel } from "@/app/events/types";

export const alt = "Selección de fotos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deliberately shows no client photos: the gallery is PIN-protected, but
// link previews are fetched by bots without any PIN.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getEventBySlug(slug);

  const titleLabel = client ? getEventTitleLabel(client) : "Selección de fotos";
  const name = client?.name ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #1a1a1a 0%, #000000 70%)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {client?.studioName || "Selección de fotos"}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 44, color: "rgba(255,255,255,0.7)" }}>
            {titleLabel}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: name.length > 24 ? 84 : 112,
              lineHeight: 1.1,
              marginTop: 12,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 2,
              background: "rgba(255,255,255,0.3)",
              marginTop: 40,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Elige tus fotos favoritas →
        </div>
      </div>
    ),
    { ...size },
  );
}
