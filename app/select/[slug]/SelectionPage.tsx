"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PhotoGallery from "@/components/PhotoGallery";
import StudioName from "@/components/StudioName";
import SelectionButton from "@/components/SelectionButton";
import ImagePreview from "@/components/ImagePreview";
import SelectionModeNav, { SelectionMode } from "@/components/SelectionModeNav";
import PhotoSearch from "@/components/PhotoSearch";
import { useT } from "@/components/I18nProvider";
import { Client, getEventTitleLabel } from "@/app/events/types";
import { Photo } from "@/lib/r2";
import {
  saveSelections,
  finalizeSelections,
  Selections,
} from "@/app/events/store";

const COVER_LIMIT = 2;
const INITIAL_BATCH = 60;
// Search results shown before "See more results". Scores flatten out after
// the first dozen (the rest just share the event's theme); 12 measured ~75%
// precision on a labeled wedding. Keep scripts/eval-search.mjs's K in sync.
const SEARCH_FIRST_RESULTS = 12;
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
  const t = useT();
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
  // Active semantic search: matching photo ids, best match first. showAll =
  // the client asked for the results past SEARCH_FIRST_RESULTS.
  const [search, setSearch] = useState<{
    query: string;
    ids: string[];
    showAll: boolean;
  } | null>(null);
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

  // A search narrows the current mode's photos to the matches, in relevance
  // order, first SEARCH_FIRST_RESULTS only until "Ver más". Selection,
  // preview and prev/next all work off this same list.
  const searchMatches = (() => {
    if (!search) return null;
    const rank = new Map(search.ids.map((id, i) => [id, i]));
    return getAvailablePhotos()
      .filter((p) => rank.has(p.id))
      .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  })();
  const hiddenSearchResults =
    searchMatches && !search?.showAll
      ? Math.max(searchMatches.length - SEARCH_FIRST_RESULTS, 0)
      : 0;
  const availablePhotos = searchMatches
    ? searchMatches.slice(0, searchMatches.length - hiddenSearchResults)
    : getAvailablePhotos();

  const handleSearchResults = (query: string | null, ids: string[] | null) => {
    setSearch(query && ids ? { query, ids, showAll: false } : null);
    setVisibleCount(INITIAL_BATCH);
  };
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
          <StudioName
            name={client.studioName}
            className="text-xs tracking-[0.25em] text-white/60 uppercase font-medium mb-4"
          />
        )}
        <p className="text-[10px] tracking-[0.35em] text-white/35 uppercase mb-5">
          {t.page.eyebrow}
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
            {t.page.photoCount(photos.length)}
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
            {t.page.deadline(daysLeft)}
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
          {currentMode === "digital" && t.page.hintDigital}
          {currentMode === "album" &&
            (albumOnly ? t.page.hintAlbumOnly : t.page.hintAlbumFromDigital)}
          {currentMode === "cover" && t.page.hintCover(COVER_LIMIT)}
        </p>
      </div>

      {client.semanticSearchEnabled && (
        <PhotoSearch
          slug={client.slug}
          eventType={client.eventType}
          activeQuery={search?.query ?? null}
          onResults={handleSearchResults}
        />
      )}

      {/* Photo Grid */}
      {availablePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-white/30 text-sm tracking-widest uppercase">
            {search ? t.page.noResults : t.page.noPhotos}
          </p>
          {search && (
            <p className="mt-3 text-xs text-white/30">
              {t.page.noResultsTip(t.search.examples[client.eventType])}
            </p>
          )}
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
          {hiddenSearchResults > 0 && (
            <div className="flex justify-center px-6 pt-8">
              <button
                type="button"
                onClick={() =>
                  setSearch((s) => (s ? { ...s, showAll: true } : s))
                }
                className="border border-white/30 text-white text-xs tracking-[0.2em] uppercase px-6 py-3 hover:bg-white hover:text-black transition-all"
              >
                {t.page.moreResults(hiddenSearchResults)}
              </button>
            </div>
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
