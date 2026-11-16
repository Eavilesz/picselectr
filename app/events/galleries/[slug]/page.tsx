import Link from "next/link";
import { notFound } from "next/navigation";
import { getGalleryPhotos, getOwnedGallery } from "@/lib/galleries";
import { CopyButton } from "../../[slug]/CopyButton";
import GalleryManager from "./GalleryManager";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getOwnedGallery(slug);
  if (!gallery) notFound();

  const photos = await getGalleryPhotos(gallery.id);
  const coverId = gallery.cover_photo_id ?? photos[0]?.id ?? null;
  const cover = photos.find((p) => p.id === coverId);
  const clientPath = `/gallery/${gallery.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/events/galleries"
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          ← Galerías
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-xs text-neutral-300 font-medium">
          {gallery.title}
        </span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Galería de entrega
          </p>
          <h1 className="text-2xl font-serif text-white">{gallery.title}</h1>
        </div>
        <a
          href={clientPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-white/20 text-neutral-300 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-white hover:text-neutral-900 transition-all whitespace-nowrap"
        >
          Ver galería
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Info card */}
        <div className="md:col-span-2 bg-neutral-900 border border-white/10 p-6 space-y-5">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
            Información
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Título
              </p>
              <p className="text-neutral-200">{gallery.title}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Estudio
              </p>
              <p className="text-neutral-200">{gallery.studio_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Fotos
              </p>
              <p className="text-neutral-200 tabular-nums">{photos.length}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                PIN de acceso
              </p>
              <p className="text-neutral-200 tabular-nums tracking-widest">
                {gallery.pin}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-2">
              Enlace del cliente
            </p>
            <div className="flex items-center gap-3">
              <code className="text-xs text-neutral-400 bg-white/5 border border-white/10 px-3 py-2 flex-1 truncate font-mono">
                {clientPath}
              </code>
              <CopyButton value={clientPath} />
            </div>
          </div>
        </div>

        {/* Cover card */}
        <div className="bg-neutral-900 border border-white/10 p-6 flex flex-col">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4">
            Portada
          </p>
          <div className="relative aspect-3/2 bg-neutral-800 overflow-hidden">
            {cover ? (
              <img
                src={cover.thumbnailUrl}
                alt="Portada"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.2em] uppercase text-neutral-600">
                Sin fotos
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-neutral-600">
            Elige otra portada desde las fotos de abajo.
          </p>
        </div>
      </div>

      <GalleryManager
        slug={gallery.slug}
        photos={photos.map((p) => ({
          id: p.id,
          thumbnailUrl: p.thumbnailUrl,
          fileName: p.fileName,
        }))}
        coverId={coverId}
      />
    </div>
  );
}
