import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getGalleryBySlug,
  getGalleryPhotos,
  hasGalleryAccess,
  isGalleryOwner,
} from "@/lib/galleries";
import GalleryPinForm from "./GalleryPinForm";
import GalleryView from "./GalleryView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return {};
  const description = gallery.studio_name
    ? `${gallery.studio_name} · Tus fotos están listas`
    : "Tus fotos están listas";
  return {
    title: gallery.title,
    description,
    robots: { index: false, follow: false },
    // The OG image comes from opengraph-image.tsx in this folder
    openGraph: {
      title: gallery.title,
      description,
      type: "website",
      locale: "es_MX",
    },
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  // The PIN is checked on the server: without access, no photo URLs are sent
  const [isOwner, hasAccess] = await Promise.all([
    isGalleryOwner(gallery),
    hasGalleryAccess(gallery),
  ]);

  if (!isOwner && !hasAccess) {
    return (
      <GalleryPinForm
        slug={gallery.slug}
        title={gallery.title}
        studioName={gallery.studio_name}
      />
    );
  }

  const photos = await getGalleryPhotos(gallery.id);
  const cover =
    photos.find((p) => p.id === gallery.cover_photo_id) ?? photos[0] ?? null;

  return (
    <GalleryView
      title={gallery.title}
      studioName={gallery.studio_name}
      cover={cover}
      photos={photos}
    />
  );
}
