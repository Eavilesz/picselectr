"use client";

import { useEffect, useState } from "react";
import { Photo } from "@/lib/r2";

export type SelectionMode = "digital" | "album" | "cover";

interface ImagePreviewProps {
  photo: Photo | null;
  onClose: () => void;
  isSelected: boolean;
  onToggle: () => void;
  currentMode: SelectionMode;
  selectionType: "digital" | "album" | "cover" | null;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function ImagePreview({
  photo,
  onClose,
  isSelected,
  onToggle,
  currentMode,
  selectionType,
  onNext,
  onPrev,
}: ImagePreviewProps) {
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  useEffect(() => {
    if (photo) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [photo]);

  useEffect(() => {
    if (!photo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNext?.();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [photo, onNext, onPrev, onClose]);

  if (!photo) return null;

  // Color configuration for each mode
  const modeColors = {
    digital: { heart: "text-white", bg: "bg-white" },
    album: { heart: "text-rose-300", bg: "bg-rose-300" },
    cover: { heart: "text-amber-400", bg: "bg-amber-400" },
  };

  const currentColor = modeColors[currentMode];
  const displayColor = selectionType ? modeColors[selectionType] : currentColor;

  return (
    <div className="fixed inset-0 z-50 bg-black/95" onClick={onClose}>
      {/* Full-screen image area with controls overlaid */}
      <div
        className="relative h-full flex items-center justify-center p-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Selection Type Indicator — top-center */}
        {selectionType && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full ${displayColor.bg}`} />
            <span className="text-xs tracking-[0.2em] text-white/50 uppercase">
              {selectionType === "digital"
                ? "Digital"
                : selectionType === "album"
                  ? "Álbum"
                  : "Portada"}
            </span>
          </div>
        )}

        {/* Heart Button — top-left corner */}
        <button
          onClick={handleToggle}
          className="absolute top-3 left-3 z-20 p-2 bg-black/50 hover:bg-black/80 transition-colors"
          aria-label={isSelected ? "Unselect photo" : "Select photo"}
        >
          {isSelected ? (
            <svg
              className={`w-7 h-7 ${currentColor.heart}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg
              className={`w-7 h-7 ${currentColor.heart} opacity-30 hover:opacity-70 transition-opacity`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          )}
        </button>

        {/* Close Button — top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 bg-black/50 hover:bg-black/80 text-white hover:text-gray-300 transition-colors"
          aria-label="Close preview"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Prev arrow */}
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all"
            aria-label="Foto anterior"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
        )}

        <div className="flex flex-col items-center gap-3 max-h-full min-h-0">
          <img
            src={photo.originalUrl}
            alt={photo.alt}
            className="min-h-0 max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {photo.name && (
            <span className="text-xl tracking-[0.15em] text-white/60 uppercase shrink-0">
              {photo.name}
            </span>
          )}
        </div>

        {/* Next arrow */}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all"
            aria-label="Siguiente foto"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
