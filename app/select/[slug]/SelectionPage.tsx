"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import SelectionButton from "@/components/SelectionButton";
import ImagePreview from "@/components/ImagePreview";
import SelectionModeNav, { SelectionMode } from "@/components/SelectionModeNav";
import { Client, EventType } from "@/app/events/types";
import { Photo } from "@/lib/r2";
import { saveSelections, Selections } from "@/app/events/store";

const EVENT_TITLE_LABELS: Record<EventType, string> = {
  wedding: "La Boda de",
  quinceañera: "La Quinceañera de",
  birthday: "El Cumpleaños de",
  photobooth: "La Sesión de",
  other: "El Evento de",
};

const COVER_LIMIT = 2;
const INITIAL_BATCH = 60;
const BATCH_SIZE = 40;

type LocalPhoto = Photo;

export default function SelectionPage({
  client,
  photos,
  savedSelections,
}: {
  client: Client;
  photos: LocalPhoto[];
  savedSelections: Selections;
}) {
  const albumOnly = client.photoLimit == null && client.albumLimit != null;
  const hasAlbum = client.albumLimit != null;

  const [currentMode, setCurrentMode] = useState<SelectionMode>(
    albumOnly ? "album" : "digital",
  );
  const [digitalPhotos, setDigitalPhotos] = useState<Set<string>>(
    () => new Set(savedSelections.digital),
  );
  const [albumPhotos, setAlbumPhotos] = useState<Set<string>>(
    () => new Set(savedSelections.album),
  );
  const [coverPhotos, setCoverPhotos] = useState<Set<string>>(
    () => new Set(savedSelections.cover),
  );
  const [previewPhoto, setPreviewPhoto] = useState<LocalPhoto | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset "saved" state when the user changes their selection
  useEffect(() => {
    setSavedOk(false);
  }, [digitalPhotos, albumPhotos, coverPhotos]);

  const handleModeChange = useCallback((mode: SelectionMode) => {
    setCurrentMode(mode);
    setVisibleCount(INITIAL_BATCH);
  }, []);

  // Infinite scroll: load more photos when sentinel enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount]);

  const getCurrentSelection = () => {
    switch (currentMode) {
      case "digital":
        return digitalPhotos;
      case "album":
        return albumPhotos;
      case "cover":
        return coverPhotos;
    }
  };

  const togglePhoto = (id: string) => {
    switch (currentMode) {
      case "digital":
        setDigitalPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
            setAlbumPhotos((albumPrev) => {
              const newAlbum = new Set(albumPrev);
              newAlbum.delete(id);
              return newAlbum;
            });
            setCoverPhotos((coverPrev) => {
              const newCover = new Set(coverPrev);
              newCover.delete(id);
              return newCover;
            });
          } else {
            if (client.photoLimit == null || newSet.size < client.photoLimit) {
              newSet.add(id);
            }
          }
          return newSet;
        });
        break;
      case "album":
        setAlbumPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
            setCoverPhotos((coverPrev) => {
              const newCover = new Set(coverPrev);
              newCover.delete(id);
              return newCover;
            });
          } else {
            // album-only events can select from all photos; others need digital first
            if (albumOnly || digitalPhotos.has(id)) {
              if (
                client.albumLimit == null ||
                newSet.size < client.albumLimit
              ) {
                newSet.add(id);
              }
            }
          }
          return newSet;
        });
        break;
      case "cover":
        setCoverPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            if (albumPhotos.has(id) && newSet.size < COVER_LIMIT) {
              newSet.add(id);
            }
          }
          return newSet;
        });
        break;
    }
  };

  const getSelectionType = (
    id: string,
  ): "digital" | "album" | "cover" | null => {
    if (coverPhotos.has(id)) return "cover";
    if (albumPhotos.has(id)) return "album";
    if (digitalPhotos.has(id)) return "digital";
    return null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedOk(false);
    try {
      await saveSelections(
        client.slug,
        Array.from(digitalPhotos),
        Array.from(albumPhotos),
        Array.from(coverPhotos),
      );
      setSavedOk(true);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSelection = getCurrentSelection();

  const getAvailablePhotos = () => {
    switch (currentMode) {
      case "digital":
        return photos;
      case "album":
        // album-only: all photos available; otherwise filtered by digital selection
        return albumOnly
          ? photos
          : photos.filter((p) => digitalPhotos.has(p.id));
      case "cover":
        return photos.filter((p) => albumPhotos.has(p.id));
    }
  };

  const availablePhotos = getAvailablePhotos();
  const visiblePhotos = availablePhotos.slice(0, visibleCount);
  const titleLabel = EVENT_TITLE_LABELS[client.eventType];

  const daysLeft = (() => {
    if (!client.deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(client.deadline + "T00:00:00");
    const diff = Math.round(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  })();

  return (
    <div className="min-h-screen bg-black pb-36">
      {/* Header */}
      <header className="px-6 pt-14 pb-8">
        {client.studioName && (
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase font-medium mb-4">
            {client.studioName}
          </p>
        )}
        <p className="text-[10px] tracking-[0.35em] text-white/35 uppercase mb-5">
          Selección de fotos
        </p>
        <h1 className="text-5xl md:text-6xl font-serif font-normal text-white leading-[1.1]">
          {titleLabel}
          <br />
          <em>{client.name}</em>
        </h1>
        <div className="mt-6 w-12 h-px bg-white/20" />
      </header>

      {/* Deadline Warning */}
      {daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && (
        <div className="mx-6 mb-2  px-4 py-3 flex items-start gap-3">
          <svg
            className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-xs text-amber-500/80 leading-relaxed">
            {daysLeft === 0
              ? "Hoy es el último día para seleccionar tus fotos."
              : daysLeft === 1
                ? "Queda 1 día para seleccionar tus fotos."
                : `Quedan ${daysLeft} días para seleccionar tus fotos.`}
          </p>
        </div>
      )}

      {/* Selection Mode Navigation */}
      {(hasAlbum || !albumOnly) && (
        <SelectionModeNav
          currentMode={currentMode}
          onModeChange={handleModeChange}
          modes={
            albumOnly ? ["album", "cover"] : hasAlbum ? undefined : ["digital"]
          }
          counts={{
            digital: {
              selected: digitalPhotos.size,
              total: client.photoLimit ?? photos.length,
            },
            album: {
              selected: albumPhotos.size,
              total:
                client.albumLimit ??
                (albumOnly ? photos.length : digitalPhotos.size),
            },
            cover: { selected: coverPhotos.size, total: COVER_LIMIT },
          }}
        />
      )}

      {/* Info Message */}
      <div className="px-6 py-3">
        <p className="text-xs text-white/35 italic tracking-wide">
          {currentMode === "digital" &&
            "Selecciona las fotos que deseas recibir digitalmente"}
          {currentMode === "album" &&
            (albumOnly
              ? "Selecciona las fotos que irán en el álbum"
              : "De tu selección digital, elige las que irán en el álbum")}
          {currentMode === "cover" &&
            `Elige ${COVER_LIMIT} fotos para la portada del álbum`}
        </p>
      </div>

      {/* Photo Grid */}
      {availablePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-white/30 text-sm tracking-widest uppercase">
            Sin fotos
          </p>
        </div>
      ) : (
        <>
          <PhotoGallery
            photos={visiblePhotos}
            selectedPhotos={currentSelection}
            currentMode={currentMode}
            getSelectionType={getSelectionType}
            onToggle={togglePhoto}
            onPreview={setPreviewPhoto}
          />
          {visibleCount < availablePhotos.length && (
            <div ref={sentinelRef} className="h-24" />
          )}
        </>
      )}

      {/* Save Button */}
      <SelectionButton
        selectedCount={albumOnly ? albumPhotos.size : digitalPhotos.size}
        onSave={handleSave}
        isSaving={isSaving}
        savedOk={savedOk}
      />

      {/* Image Preview Modal */}
      <ImagePreview
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        isSelected={
          previewPhoto ? currentSelection.has(previewPhoto.id) : false
        }
        onToggle={() => previewPhoto && togglePhoto(previewPhoto.id)}
        currentMode={currentMode}
        selectionType={previewPhoto ? getSelectionType(previewPhoto.id) : null}
        onPrev={(() => {
          if (!previewPhoto) return undefined;
          const idx = availablePhotos.findIndex(
            (p) => p.id === previewPhoto.id,
          );
          return idx > 0
            ? () => setPreviewPhoto(availablePhotos[idx - 1])
            : undefined;
        })()}
        onNext={(() => {
          if (!previewPhoto) return undefined;
          const idx = availablePhotos.findIndex(
            (p) => p.id === previewPhoto.id,
          );
          return idx < availablePhotos.length - 1
            ? () => setPreviewPhoto(availablePhotos[idx + 1])
            : undefined;
        })()}
      />
    </div>
  );
}
