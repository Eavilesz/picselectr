"use client";

import { useEffect, useState } from "react";

export type SelectionMode = "digital" | "album" | "cover";

interface Photo {
  id: string;
  originalUrl: string;
  thumbnailUrl: string;
  alt: string;
}

interface ImagePreviewProps {
  photo: Photo | null;
  onClose: () => void;
  isSelected: boolean;
  onToggle: () => void;
  currentMode: SelectionMode;
  selectionType: "digital" | "album" | "cover" | null;
}

export default function ImagePreview({
  photo,
  onClose,
  isSelected,
  onToggle,
  currentMode,
  selectionType,
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
      <div
        className="h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4 shrink-0">
          {/* Heart Icon for Selection */}
          <button
            onClick={handleToggle}
            className="p-2 hover:bg-white/10 transition-colors"
            aria-label={isSelected ? "Unselect photo" : "Select photo"}
          >
            {isSelected ? (
              <svg
                className={`w-8 h-8 ${currentColor.heart} drop-shadow-lg`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg
                className={`w-8 h-8 ${currentColor.heart} drop-shadow-lg`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </button>

          {/* Selection Type Indicator */}
          {selectionType && (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10">
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

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close preview"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-6xl flex items-center justify-center">
            <img
              src={photo.originalUrl}
              alt={photo.alt}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
