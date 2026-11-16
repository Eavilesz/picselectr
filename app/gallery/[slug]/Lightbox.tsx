"use client";

import { useEffect, useRef } from "react";
import type { GalleryPhoto } from "@/lib/galleries";
import { DownloadIcon } from "./icons";

const SWIPE_THRESHOLD = 50;

export default function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: GalleryPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const touchStartX = useRef<number | null>(null);

  const prev = () => hasPrev && onIndexChange(index - 1);
  const next = () => hasNext && onIndexChange(index + 1);

  // Lock page scroll while open
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1)
        onIndexChange(index + 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndexChange, onClose]);

  // Warm the cache for the neighbours so arrowing through feels instant
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      if (photos[i]) new Image().src = photos[i].displayUrl;
    }
  }, [index, photos]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${photos.length}`}
    >
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center justify-between px-3 md:px-5">
        <span className="text-xs tracking-[0.2em] text-white/50 tabular-nums">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={photo.originalUrl}
            download={photo.fileName}
            className="inline-flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar</span>
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-16 pb-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (dx > SWIPE_THRESHOLD) prev();
          else if (dx < -SWIPE_THRESHOLD) next();
        }}
      >
        <img
          key={photo.id}
          src={photo.displayUrl}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {hasPrev && (
          <button
            onClick={prev}
            className="hidden md:block absolute left-3 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
            aria-label="Foto anterior"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              viewBox="0 0 24 24"
            >
              <path d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={next}
            className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white transition-colors"
            aria-label="Foto siguiente"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              viewBox="0 0 24 24"
            >
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
