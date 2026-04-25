"use client";

import { useState } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import SelectionButton from "@/components/SelectionButton";
import ImagePreview from "@/components/ImagePreview";
import SelectionModeNav, { SelectionMode } from "@/components/SelectionModeNav";
import { Client, EventType } from "@/app/events/types";
import { Photo } from "@/lib/r2";

const EVENT_TITLE_LABELS: Record<EventType, string> = {
  wedding: "La Boda de",
  quinceañera: "La Quinceañera de",
  birthday: "El Cumpleaños de",
  photobooth: "La Sesión de",
  other: "El Evento de",
};

const COVER_LIMIT = 2;

type LocalPhoto = Photo;

export default function SelectionPage({
  client,
  photos,
}: {
  client: Client;
  photos: LocalPhoto[];
}) {
  const albumOnly = client.photoLimit == null && client.albumLimit != null;
  const hasAlbum = client.albumLimit != null;

  const [currentMode, setCurrentMode] = useState<SelectionMode>(
    albumOnly ? "album" : "digital",
  );
  const [digitalPhotos, setDigitalPhotos] = useState<Set<string>>(new Set());
  const [albumPhotos, setAlbumPhotos] = useState<Set<string>>(new Set());
  const [coverPhotos, setCoverPhotos] = useState<Set<string>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<LocalPhoto | null>(null);

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

  const handleSave = () => {
    console.log("Digital photos:", Array.from(digitalPhotos));
    console.log("Album photos:", Array.from(albumPhotos));
    console.log("Cover photos:", Array.from(coverPhotos));
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
  const titleLabel = EVENT_TITLE_LABELS[client.eventType];

  return (
    <div className="min-h-screen bg-black pb-36">
      {/* Header */}
      <header className="px-6 pt-14 pb-8">
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

      {/* Selection Mode Navigation */}
      {(hasAlbum || !albumOnly) && (
        <SelectionModeNav
          currentMode={currentMode}
          onModeChange={setCurrentMode}
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
        <PhotoGallery
          photos={availablePhotos}
          selectedPhotos={currentSelection}
          currentMode={currentMode}
          getSelectionType={getSelectionType}
          onToggle={togglePhoto}
          onPreview={setPreviewPhoto}
        />
      )}

      {/* Save Button */}
      <SelectionButton
        selectedCount={albumOnly ? albumPhotos.size : digitalPhotos.size}
        onSave={handleSave}
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
      />
    </div>
  );
}
