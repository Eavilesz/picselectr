"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { GalleryPhoto } from "@/lib/galleries";
import Lightbox from "./Lightbox";
import { DownloadIcon } from "./icons";

// Column count by viewport. The server renders 2 columns; the client
// corrects it after hydration.
const BREAKPOINTS = [
  { query: "(min-width: 1280px)", columns: 4 },
  { query: "(min-width: 768px)", columns: 3 },
];

function subscribeToViewport(callback: () => void) {
  const lists = BREAKPOINTS.map((b) => window.matchMedia(b.query));
  lists.forEach((l) => l.addEventListener("change", callback));
  return () => lists.forEach((l) => l.removeEventListener("change", callback));
}

function useColumnCount(): number {
  return useSyncExternalStore(
    subscribeToViewport,
    () =>
      BREAKPOINTS.find((b) => window.matchMedia(b.query).matches)?.columns ?? 2,
    () => 2,
  );
}

// Masonry: each photo goes to the currently shortest column, so the reading
// order stays roughly left-to-right instead of top-to-bottom per column.
function distribute(photos: GalleryPhoto[], columnCount: number) {
  const columns: { photo: GalleryPhoto; index: number }[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  const heights = new Array(columnCount).fill(0);
  photos.forEach((photo, index) => {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push({ photo, index });
    heights[shortest] += photo.height / photo.width;
  });
  return columns;
}

export default function GalleryView({
  title,
  studioName,
  cover,
  photos,
}: {
  title: string;
  studioName: string | null;
  cover: GalleryPhoto | null;
  photos: GalleryPhoto[];
}) {
  const columnCount = useColumnCount();
  const columns = useMemo(
    () => distribute(photos, columnCount),
    [photos, columnCount],
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover */}
      <section className="relative h-svh min-h-120 flex items-center justify-center overflow-hidden">
        {cover && (
          <img
            src={cover.displayUrl}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/35 to-black/70" />

        <div className="relative z-10 px-6 text-center">
          {studioName && (
            <p className="text-xs md:text-sm tracking-[0.35em] uppercase text-white/80 mb-6">
              {studioName}
            </p>
          )}
          <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] drop-shadow-sm">
            {title}
          </h1>
          <div className="mx-auto mt-8 w-12 h-px bg-white/50" />
          <button
            onClick={() =>
              gridRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="mt-10 border border-white/70 px-8 py-3 text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors duration-300"
          >
            Ver galería
          </button>
        </div>

        <svg
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-5 h-5 text-white/60 animate-bounce"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </section>

      {/* Sticky header */}
      <header
        ref={gridRef}
        className="sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-white/10 scroll-mt-0"
      >
        <div className="px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-serif text-lg md:text-xl truncate">{title}</p>
            {studioName && (
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/50 truncate">
                {studioName}
              </p>
            )}
          </div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-white/50 whitespace-nowrap">
            {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          </p>
        </div>
      </header>

      {/* Masonry grid */}
      {photos.length === 0 ? (
        <p className="py-32 text-center text-sm tracking-widest uppercase text-white/30">
          Sin fotos
        </p>
      ) : (
        <main className="flex gap-1.5 md:gap-2.5 p-1.5 md:p-2.5">
          {columns.map((column, c) => (
            <div key={c} className="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2.5">
              {column.map(({ photo, index }) => (
                <figure key={photo.id} className="relative group bg-neutral-900">
                  <button
                    onClick={() => setOpenIndex(index)}
                    className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    <img
                      src={photo.thumbnailUrl}
                      alt={`Foto ${index + 1}`}
                      width={photo.width}
                      height={photo.height}
                      loading={index < 8 ? "eager" : "lazy"}
                      decoding="async"
                      className="block w-full h-auto"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                  </button>
                  <a
                    href={photo.originalUrl}
                    download={photo.fileName}
                    className="absolute bottom-2 right-2 p-2 bg-black/55 text-white/90 hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    aria-label={`Descargar foto ${index + 1}`}
                    title="Descargar"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </a>
                </figure>
              ))}
            </div>
          ))}
        </main>
      )}

      {studioName && (
        <footer className="py-12 text-center text-[10px] tracking-[0.3em] uppercase text-white/30">
          {studioName}
        </footer>
      )}

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
