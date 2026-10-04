"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import SelectionButton from "@/components/SelectionButton";
import ImagePreview from "@/components/ImagePreview";
import SelectionModeNav, { SelectionMode } from "@/components/SelectionModeNav";
import { Client, getEventTitleLabel } from "@/app/events/types";
import { Photo } from "@/lib/r2";
import {
  saveSelections,
  finalizeSelections,
  Selections,
} from "@/app/events/store";

const COVER_LIMIT = 2;
const INITIAL_BATCH = 60;
const BATCH_SIZE = 40;
const AUTOSAVE_DELAY = 1500;
const RETRY_DELAY = 5000;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isFinalized, setIsFinalized] = useState(client.isReady);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Autosave bookkeeping (refs so the debounced flush always sees fresh data)
  const latestRef = useRef({ digitalPhotos, albumPhotos, coverPhotos });
  latestRef.current = { digitalPhotos, albumPhotos, coverPhotos };
  const dirtyRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const isComplete =
    (client.photoLimit == null || digitalPhotos.size >= client.photoLimit) &&
    (client.albumLimit == null ||
      (albumPhotos.size >= client.albumLimit &&
        coverPhotos.size >= COVER_LIMIT)) &&
    (client.photoLimit != null || client.albumLimit != null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Sends the latest selection. Never runs two saves at once, so an older
  // state can't overwrite a newer one; changes made mid-save trigger another pass.
  const flush = useCallback((): Promise<void> => {
    clearTimer();
    if (inFlightRef.current) return inFlightRef.current;
    if (!dirtyRef.current) return Promise.resolve();

    const run = (async () => {
      setSaveStatus("saving");
      try {
        while (dirtyRef.current) {
          dirtyRef.current = false;
          const { digitalPhotos, albumPhotos, coverPhotos } = latestRef.current;
          try {
            await saveSelections(
              client.slug,
              Array.from(digitalPhotos),
              Array.from(albumPhotos),
              Array.from(coverPhotos),
            );
          } catch {
            dirtyRef.current = true;
            setSaveStatus("error");
            timerRef.current = setTimeout(() => void flush(), RETRY_DELAY);
            return;
          }
        }
        setSaveStatus("saved");
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = run;
    return run;
  }, [client.slug]);

  // Debounced autosave whenever the selection changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    setFinalizeError(false);
    if (!isComplete) setIsFinalized(false);
    clearTimer();
    timerRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digitalPhotos, albumPhotos, coverPhotos, flush]);

  // Flush pending changes when the tab is hidden or closed
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clearTimer();
    };
  }, [flush]);

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

  const handleFinalize = async () => {
    setIsFinalizing(true);
    setFinalizeError(false);
    try {
      await flush();
      await finalizeSelections(
        client.slug,
        Array.from(digitalPhotos),
        Array.from(albumPhotos),
        Array.from(coverPhotos),
      );
      setIsFinalized(true);
    } catch {
      setFinalizeError(true);
    } finally {
      setIsFinalizing(false);
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
  const titleLabel = getEventTitleLabel(client);

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
        <p className="mt-5 flex items-baseline gap-2 text-white">
          <span className="text-3xl md:text-4xl font-serif tabular-nums">
            {photos.length}
          </span>
          <span className="text-xs tracking-[0.3em] text-white/60 uppercase">
            {photos.length === 1 ? "foto" : "fotos"}
          </span>
        </p>
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

      {/* Autosave status + finalize button */}
      <SelectionButton
        selectedCount={albumOnly ? albumPhotos.size : digitalPhotos.size}
        saveStatus={saveStatus}
        canFinalize={isComplete}
        isFinalizing={isFinalizing}
        isFinalized={isFinalized}
        finalizeError={finalizeError}
        onFinalize={handleFinalize}
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
