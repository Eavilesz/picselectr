"use client";

import { useState } from "react";
import Link from "next/link";
import { EventType } from "../../types";
import { addStoredProduct } from "../store";

const EVENT_OPTIONS: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Boda" },
  { value: "quinceañera", label: "Quinceañera" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "photobooth", label: "Sesión de fotos" },
];

function generateSlug(): string {
  return Math.random().toString(36).slice(2, 8);
}

export default function NewProductPage() {
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [deadline, setDeadline] = useState("");
  const [photoLimit, setPhotoLimit] = useState<number | "">(50);
  const [albumLimit, setAlbumLimit] = useState<number | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const clientName =
    eventType === "wedding"
      ? [name1.trim(), name2.trim()].filter(Boolean).join(" & ")
      : name1.trim();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!clientName) e.name = "El nombre es requerido.";
    if (!deadline) e.deadline = "La fecha límite es requerida.";
    if (!photoLimit || Number(photoLimit) < 1)
      e.photoLimit = "Ingresa un límite válido.";
    if (albumLimit !== "" && Number(albumLimit) < 1)
      e.albumLimit = "Ingresa un límite válido.";
    if (albumLimit !== "" && photoLimit !== "" && Number(albumLimit) >= Number(photoLimit))
      e.albumLimit = `Debe ser menor que ${photoLimit} (fotos digitales).`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const slug = generateSlug();
    setSubmitting(true);
    try {
      await addStoredProduct({
        id: slug,
        slug,
        name: clientName,
        eventType,
        deadline: deadline || null,
        photoLimit: Number(photoLimit),
        albumLimit: albumLimit !== "" ? Number(albumLimit) : null,
        isReady: false,
        selected: 0,
      });
    } catch {
      setSubmitting(false);
      setErrors({ form: "Error al crear el evento. Intenta de nuevo." });
      return;
    }

    setSubmitting(false);
    window.location.href = `/events/${slug}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/events"
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          ← Eventos
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-xs text-neutral-300 font-medium">
          Nuevo evento
        </span>
      </div>

      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
          Admin
        </p>
        <h1 className="text-2xl font-medium text-white">Nuevo evento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event type */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Tipo de evento
          </p>
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEventType(opt.value)}
                className={`text-xs tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                  eventType === opt.value
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client name */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            {eventType === "wedding" ? "Nombres" : "Nombre del cliente"}
          </p>
          {eventType === "wedding" ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                placeholder="María"
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
              />
              <span className="text-neutral-500 text-sm">&</span>
              <input
                type="text"
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                placeholder="Juan"
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
              />
            </div>
          ) : (
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
            />
          )}
          {errors.name && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.name}</p>
          )}
        </div>

        {/* Deadline */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Fecha límite
          </p>
          <input
            type="date"
            value={deadline}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDeadline(e.target.value)}
            className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-white/30 scheme-dark"
          />
          {errors.deadline && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.deadline}</p>
          )}
        </div>

        {/* Photo limit */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Límite de fotos digitales
          </p>
          <input
            type="number"
            min={1}
            value={photoLimit}
            onChange={(e) =>
              setPhotoLimit(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="w-28 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-white/30 tabular-nums"
          />
          {errors.photoLimit && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.photoLimit}</p>
          )}
        </div>

        {/* Album limit (optional) */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-1">
            Límite de fotos de álbum
          </p>
          <p className="text-xs text-neutral-600 mb-3">Opcional</p>
          <input
            type="number"
            min={1}
            value={albumLimit}
            placeholder="—"
            onChange={(e) =>
              setAlbumLimit(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="w-28 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30 tabular-nums"
          />
          {photoLimit !== "" && (
            <p className="mt-1.5 text-xs text-neutral-600">
              Debe ser menor que {photoLimit}
            </p>
          )}
          {errors.albumLimit && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.albumLimit}</p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && (
              <svg
                className="w-3.5 h-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            {submitting ? "Creando..." : "Crear evento"}
          </button>
          {!submitting && (
            <Link
              href="/events"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Cancelar
            </Link>
          )}
          {errors.form && (
            <p className="text-xs text-rose-400">{errors.form}</p>
          )}
        </div>
      </form>
    </div>
  );
}
