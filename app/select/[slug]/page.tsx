import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, getSelections, isEventOwner } from "@/app/events/store";
import { getEventTitleLabel } from "@/app/events/types";
import { getPhotosBySlug } from "@/lib/r2";
import SelectionPage from "./SelectionPage";
import PinGate from "@/components/PinGate";
import { hasEventAccess } from "@/lib/event-access";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await getEventBySlug(slug);
  if (!client) return {};
  const title = `${getEventTitleLabel(client)} ${client.name}`;
  const description = client.studioName
    ? `${client.studioName} · Elige tus fotos favoritas de la galería`
    : "Elige tus fotos favoritas de la galería";
  return {
    title: `${title} — Selección de Fotos`,
    description,
    // The OG image comes from opengraph-image.tsx in this folder
    openGraph: { title, description, type: "website", locale: "es_MX" },
  };
}

export default async function SelectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await getEventBySlug(slug);
  if (!client) notFound();

  // The PIN is enforced here, on the server: without the access cookie
  // (set by a correct PIN) no photos or selections are sent. The signed-in
  // owner skips the PIN.
  const [isOwner, hasAccess] = await Promise.all([
    isEventOwner(slug),
    hasEventAccess(slug),
  ]);
  if (!isOwner && !hasAccess) return <PinGate slug={slug} />;

  const [photos, savedSelections] = await Promise.all([
    getPhotosBySlug(slug),
    getSelections(slug),
  ]);

  return (
    <SelectionPage
      client={client}
      photos={photos}
      savedSelections={savedSelections}
    />
  );
}
