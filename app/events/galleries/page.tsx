import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { thumbnailUrlFor } from "@/lib/galleries";
import GalleriesGrid, { GalleryListItem } from "./GalleriesGrid";

export const metadata = { title: "Galerías — Picselectr" };

interface ListRow {
  slug: string;
  title: string;
  pin: string;
  created_at: string;
  cover: { thumbnail_key: string } | null;
  first: { thumbnail_key: string }[];
  photos: { count: number }[];
}

export default async function GalleriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("galleries")
    .select(
      `slug, title, pin, created_at,
       cover:gallery_photos!galleries_cover_photo_id_fkey(thumbnail_key),
       first:gallery_photos!gallery_photos_gallery_id_fkey(thumbnail_key),
       photos:gallery_photos!gallery_photos_gallery_id_fkey(count)`,
    )
    .order("created_at", { ascending: false })
    .order("display_order", { referencedTable: "first", ascending: true })
    .limit(1, { referencedTable: "first" });

  const galleries: GalleryListItem[] = ((data ?? []) as unknown as ListRow[]).map(
    (g) => {
      const coverKey = g.cover?.thumbnail_key ?? g.first[0]?.thumbnail_key;
      return {
        slug: g.slug,
        title: g.title,
        pin: g.pin,
        createdAt: g.created_at,
        photoCount: g.photos[0]?.count ?? 0,
        coverUrl: coverKey ? thumbnailUrlFor(coverKey) : null,
      };
    },
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Entregas finales
          </p>
          <h1 className="text-2xl font-medium text-white">Galerías</h1>
        </div>
        <Link
          href="/events/galleries/new"
          className="inline-flex items-center gap-2 bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-neutral-600 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva galería
        </Link>
      </div>

      <GalleriesGrid galleries={galleries} />
    </div>
  );
}
