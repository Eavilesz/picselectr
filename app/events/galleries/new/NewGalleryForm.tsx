"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createGallery, setGalleryCover } from "../actions";
import { uploadGalleryFiles } from "../upload";
import { Spinner } from "../Spinner";

// Local preview of a not-yet-uploaded file. The object URL is assigned
// imperatively so it can be revoked when the tile unmounts.
function FilePreview({ file }: { file: File }) {
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imgRef.current) imgRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <img
      ref={imgRef}
      alt={file.name}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

export default function NewGalleryForm({
  studioName,
}: {
  studioName: string | null;
}) {
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [partial, setPartial] = useState<{
    slug: string;
    failed: { name: string; error: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const added = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [
        ...prev,
        ...added.filter((f) => !existing.has(`${f.name}:${f.size}`)),
      ];
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((c) => (index < c ? c - 1 : index === c ? 0 : c));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "El título es requerido.";
    if (files.length === 0) e.files = "Debes agregar al menos una foto.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { slug } = await createGallery(title);
      const { ids, failed } = await uploadGalleryFiles(slug, files, 0, (done, total) =>
        setProgress({ done, total }),
      );

      const coverId = ids[coverIndex] ?? ids.find((id) => id !== null);
      if (coverId) await setGalleryCover(slug, coverId);

      if (failed.length > 0) {
        setPartial({ slug, failed });
        setSubmitting(false);
        setProgress(undefined);
        return;
      }
      window.location.href = `/events/galleries/${slug}`;
    } catch (err) {
      setSubmitting(false);
      setProgress(undefined);
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : "Error al crear la galería. Intenta de nuevo.",
      });
    }
  }

  if (partial) {
    return (
      <div className="bg-neutral-900 border border-white/10 p-6 space-y-4">
        <p className="text-sm text-amber-400">
          La galería se creó, pero {partial.failed.length}{" "}
          {partial.failed.length === 1
            ? "foto no se pudo subir"
            : "fotos no se pudieron subir"}
          :
        </p>
        <ul className="text-xs text-neutral-400 space-y-1 max-h-48 overflow-y-auto">
          {partial.failed.map((f) => (
            <li key={f.name}>
              <span className="text-neutral-200">{f.name}</span> — {f.error}
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500">
          Puedes volver a subirlas desde la página de la galería.
        </p>
        <Link
          href={`/events/galleries/${partial.slug}`}
          className="inline-block bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-neutral-600 transition-colors"
        >
          Ir a la galería
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          Título principal
        </p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Carolina & Jorge"
          className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
        />
        {errors.title && (
          <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>
        )}
      </div>

      {/* Studio */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          Estudio
        </p>
        {studioName ? (
          <p className="text-sm text-neutral-200">{studioName}</p>
        ) : (
          <p className="text-xs text-neutral-500">
            Aún no tienes nombre de estudio.{" "}
            <Link
              href="/events/settings"
              className="text-neutral-300 underline underline-offset-4 hover:text-white"
            >
              Agrégalo en Configuración
            </Link>{" "}
            para que aparezca en la galería.
          </p>
        )}
      </div>

      {/* PIN */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          PIN de acceso
        </p>
        <p className="text-xs text-neutral-500">
          Se generará automáticamente al crear la galería. Lo verás junto con el
          enlace para compartir.
        </p>
      </div>

      {/* Photos + cover picker */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          Fotos
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="text-xs tracking-[0.15em] uppercase px-4 py-2 border border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            + Agregar fotos
          </button>
          <p className="text-xs text-neutral-600">
            {files.length === 0
              ? "Sin fotos seleccionadas"
              : `${files.length} foto${files.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {errors.files && (
          <p className="mt-1.5 text-xs text-rose-400">{errors.files}</p>
        )}

        {files.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs text-neutral-500">
              Haz clic en una foto para elegirla como portada.
            </p>
            <div className="max-h-112 overflow-y-auto border border-white/10 p-1">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                {files.map((file, i) => {
                  const isCover = i === coverIndex;
                  return (
                    <div
                      key={`${file.name}:${file.size}`}
                      className="relative aspect-square bg-neutral-800 group"
                    >
                      <button
                        type="button"
                        onClick={() => setCoverIndex(i)}
                        disabled={submitting}
                        className="absolute inset-0"
                        aria-label={`Usar ${file.name} como portada`}
                      >
                        <FilePreview file={file} />
                      </button>
                      {isCover && (
                        <>
                          <div className="absolute inset-0 ring-2 ring-inset ring-amber-400 pointer-events-none" />
                          <span className="absolute bottom-1 left-1 bg-amber-400 text-black text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 pointer-events-none">
                            Portada
                          </span>
                        </>
                      )}
                      {!submitting && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Quitar ${file.name}`}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Submit */}
      <div className="pt-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Spinner />}
          {progress
            ? `Subiendo ${progress.done} de ${progress.total}...`
            : submitting
              ? "Creando..."
              : "Crear galería"}
        </button>
        {!submitting && (
          <Link
            href="/events/galleries"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Cancelar
          </Link>
        )}
        {errors.form && <p className="text-xs text-rose-400">{errors.form}</p>}
      </div>
    </form>
  );
}
