import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, getSelections, isEventOwner } from "@/app/events/store";
import { getPhotosBySlug } from "@/lib/r2";
import SelectionPage from "./SelectionPage";
import PinGate from "@/components/PinGate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await getEventBySlug(slug);
  if (!client) return {};
  return {
    title: `${client.name} — Selección de Fotos`,
    description: `Selecciona tus fotos favoritas`,
  };
}

export default async function SelectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [client, photos, savedSelections, isOwner] = await Promise.all([
    getEventBySlug(slug),
    getPhotosBySlug(slug),
    getSelections(slug),
    isEventOwner(slug),
  ]);
  if (!client) notFound();

  const selectionPage = (
    <SelectionPage
      client={client}
      photos={photos}
      savedSelections={savedSelections}
    />
  );

  // The signed-in owner skips the client PIN
  if (isOwner) return selectionPage;

  return <PinGate slug={slug}>{selectionPage}</PinGate>;
}
