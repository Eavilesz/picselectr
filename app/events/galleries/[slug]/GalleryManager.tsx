"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryPhoto, setGalleryCover } from "../actions";
import { uploadGalleryFiles } from "../upload";
import { Spinner } from "../Spinner";

interface ManagedPhoto {
  id: string;
  thumbnailUrl: string;
  fileName: string;
}

export default function GalleryManager({
  slug,
  photos,
  coverId,
}: {
  slug: string;
  photos: ManagedPhoto[];
  coverId: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [message, setMessage] = useState<string | null>(null);

  function handleSetCover(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await setGalleryCover(slug, id);
        router.refresh();
      } catch {
        setMessage("No se pudo cambiar la portada.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleDelete(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteGalleryPhoto(slug, id);
        setConfirmDelete(null);
        router.refresh();
      } catch {
        setMessage("No se pudo eliminar la foto.");
      } finally {
        setBusyId(null);
      }
    });
  }

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setMessage(null);
    const { ids, failed } = await uploadGalleryFiles(
      slug,
      files,
      photos.length,
      (done, total) => setProgress({ done, total }),
    );
    // A gallery that was empty gets its first photo as cover
    if (!coverId) {
      const first = ids.find((id) => id !== null);
      if (first) await setGalleryCover(slug, first).catch(() => {});
    }
    setProgress(undefined);
    if (failed.length > 0) {
      setMessage(
        `No se pudieron subir: ${failed.map((f) => `${f.name} (${f.error})`).join(", ")}`,
      );
    }
    router.refresh();
  }

  const uploading = progress !== undefined;

  return (
    <div className="mt-5 bg-neutral-900 border border-white/10 p-6">
      <div className="flex items-center justify-between mb-5 gap-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
          Fotos · {photos.length}
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase px-4 py-2 border border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200 transition-colors disabled:opacity-60"
        >
          {uploading && <Spinner />}
          {uploading
            ? `Subiendo ${progress.done} de ${progress.total}...`
            : "+ Agregar fotos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleAddFiles}
        />
      </div>

      {message && <p className="mb-4 text-xs text-rose-400">{message}</p>}

      {photos.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          Esta galería aún no tiene fotos.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1">
          {photos.map((photo) => {
            const isCover = photo.id === coverId;
            const busy = pending && busyId === photo.id;
            return (
              <div
                key={photo.id}
                className="relative aspect-square bg-neutral-800 group overflow-hidden"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.fileName}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isCover && (
                  <>
                    <div className="absolute inset-0 ring-2 ring-inset ring-amber-400 pointer-events-none" />
                    <span className="absolute bottom-1 left-1 bg-amber-400 text-black text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5">
                      Portada
                    </span>
                  </>
                )}

                {busy ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <Spinner className="w-4 h-4" />
                  </div>
                ) : confirmDelete === photo.id ? (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-neutral-300">
                      ¿Eliminar?
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-neutral-400 hover:text-neutral-200"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    {!isCover && (
                      <button
                        onClick={() => handleSetCover(photo.id)}
                        disabled={pending}
                        className="text-[10px] tracking-[0.15em] uppercase border border-white/50 text-white px-2 py-1 hover:bg-white hover:text-black transition-colors"
                      >
                        Usar de portada
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(photo.id)}
                      disabled={pending}
                      className="text-[10px] tracking-[0.15em] uppercase text-neutral-300 hover:text-red-400 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
