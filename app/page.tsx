"use client";

import { useState } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import SelectionButton from "@/components/SelectionButton";
import ImagePreview from "@/components/ImagePreview";
import SelectionModeNav, { SelectionMode } from "@/components/SelectionModeNav";

// Mock data - replace with real data from your backend
const mockPhotos = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  url: `https://picsum.photos/seed/${i + 1}/800/800`,
  alt: `Foto de boda ${i + 1}`,
}));

interface Photo {
  id: number;
  url: string;
  alt: string;
}

export default function Home() {
  const [currentMode, setCurrentMode] = useState<SelectionMode>("digital");
  const [digitalPhotos, setDigitalPhotos] = useState<Set<number>>(new Set());
  const [albumPhotos, setAlbumPhotos] = useState<Set<number>>(new Set());
  const [coverPhotos, setCoverPhotos] = useState<Set<number>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  const COVER_LIMIT = 2;

  // Get current selection set based on mode
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

  // Toggle photo selection based on current mode
  const togglePhoto = (id: number) => {
    switch (currentMode) {
      case "digital":
        setDigitalPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
            // Also remove from album and cover if in digital
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
            newSet.add(id);
          }
          return newSet;
        });
        break;
      case "album":
        setAlbumPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
            // Also remove from cover if in album
            setCoverPhotos((coverPrev) => {
              const newCover = new Set(coverPrev);
              newCover.delete(id);
              return newCover;
            });
          } else {
            // Can only add if it's in digital selection
            if (digitalPhotos.has(id)) {
              newSet.add(id);
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
            // Can only add if it's in album selection and limit not reached
            if (albumPhotos.has(id) && newSet.size < COVER_LIMIT) {
              newSet.add(id);
            }
          }
          return newSet;
        });
        break;
    }
  };

  // Get highest selection type for a photo
  const getSelectionType = (
    id: number,
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
    // Implement your save logic here
  };

  const currentSelection = getCurrentSelection();

  // Filter photos based on current mode
  const getAvailablePhotos = () => {
    switch (currentMode) {
      case "digital":
        return mockPhotos; // All photos available
      case "album":
        return mockPhotos.filter((photo) => digitalPhotos.has(photo.id)); // Only digital photos
      case "cover":
        return mockPhotos.filter((photo) => albumPhotos.has(photo.id)); // Only album photos
    }
  };

  const availablePhotos = getAvailablePhotos();

  return (
    <div className="min-h-screen bg-black pb-36">
      {/* Header */}
      <header className="px-6 pt-14 pb-8">
        <p className="text-[10px] tracking-[0.35em] text-white/35 uppercase mb-5">
          Selección de fotos
        </p>
        <h1 className="text-5xl md:text-6xl font-serif font-normal text-white leading-[1.1]">
          La Boda de
          <br />
          <em>María &amp; Juan</em>
        </h1>
        <div className="mt-6 w-12 h-px bg-white/20" />
      </header>

      {/* Selection Mode Navigation */}
      <SelectionModeNav
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        counts={{
          digital: { selected: digitalPhotos.size, total: mockPhotos.length },
          album: { selected: albumPhotos.size, total: digitalPhotos.size },
          cover: { selected: coverPhotos.size, total: COVER_LIMIT },
        }}
      />

      {/* Info Message */}
      <div className="px-6 py-3">
        <p className="text-xs text-white/35 italic tracking-wide">
          {currentMode === "digital" &&
            "Selecciona las fotos que deseas recibir digitalmente"}
          {currentMode === "album" &&
            "De tu selección digital, elige las que irán en el álbum"}
          {currentMode === "cover" &&
            `Elige ${COVER_LIMIT} fotos para la portada del álbum`}
        </p>
      </div>

      {/* Photo Grid */}
      <PhotoGallery
        photos={availablePhotos}
        selectedPhotos={currentSelection}
        currentMode={currentMode}
        getSelectionType={getSelectionType}
        onToggle={togglePhoto}
        onPreview={setPreviewPhoto}
      />

      {/* Save Button */}
      <SelectionButton selectedCount={digitalPhotos.size} onSave={handleSave} />

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
