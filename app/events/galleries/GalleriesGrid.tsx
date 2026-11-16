"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "../[slug]/CopyButton";
import { deleteGallery } from "./actions";

export interface GalleryListItem {
  slug: string;
  title: string;
  pin: string;
  createdAt: string;
  photoCount: number;
  coverUrl: string | null;
}

export default function GalleriesGrid({
  galleries,
}: {
  galleries: GalleryListItem[];
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, startTransition] = useTransition();

  function handleDelete(slug: string) {
    startTransition(async () => {
      await deleteGallery(slug);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  if (galleries.length === 0) {
    return (
      <div className="bg-neutral-900 border border-white/10 px-5 py-16 text-center">
        <p className="text-neutral-500 text-sm">No hay galerías creadas aún.</p>
        <Link
          href="/events/galleries/new"
          className="mt-4 inline-block text-xs text-neutral-400 hover:text-white transition-colors underline underline-offset-4"
        >
          Crear la primera
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {galleries.map((g) => (
        <div
          key={g.slug}
          className="bg-neutral-900 border border-white/10 group flex flex-col"
        >
          <Link
            href={`/events/galleries/${g.slug}`}
            className="relative block aspect-3/2 bg-neutral-800 overflow-hidden"
          >
            {g.coverUrl ? (
              <img
                src={g.coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-[0.2em] uppercase text-neutral-600">
                Sin fotos
              </span>
            )}
          </Link>

          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/events/galleries/${g.slug}`}
                className="font-serif text-lg text-white leading-snug hover:underline underline-offset-4"
              >
                {g.title}
              </Link>
              <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap mt-1">
                {g.photoCount} {g.photoCount === 1 ? "foto" : "fotos"}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              PIN{" "}
              <span className="text-neutral-300 tabular-nums tracking-widest">
                {g.pin}
              </span>
            </p>

            <div className="mt-auto pt-4 flex items-center justify-between">
              <CopyButton
                value={`/gallery/${g.slug}`}
                label="Copiar enlace"
                compact
              />
              {confirmDelete === g.slug ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">¿Eliminar?</span>
                  <button
                    onClick={() => handleDelete(g.slug)}
                    disabled={deleting}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Eliminando..." : "Sí"}
                  </button>
                  {!deleting && (
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      No
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(g.slug)}
                  className="text-neutral-600 hover:text-red-400 transition-all opacity-30 group-hover:opacity-100"
                  aria-label="Eliminar galería"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
