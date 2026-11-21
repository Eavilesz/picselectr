"use client";

import { useState } from "react";
import { EventType, EventLanguage, Client } from "../../types";
import { updateStoredProduct } from "../../store";
import SemanticSearchToggle from "@/components/SemanticSearchToggle";
import EventLanguagePicker from "@/components/EventLanguagePicker";
import { indexEventPhotos } from "../../indexing";

const EVENT_OPTIONS: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Boda" },
  { value: "quinceañera", label: "Quinceañera" },
  { value: "birthday", label: "Cumpleaños" },
  { value: "photobooth", label: "Sesión de fotos" },
  { value: "other", label: "Otro" },
];

function deriveNames(name: string, eventType: EventType) {
  if (eventType === "wedding" && name.includes(" & ")) {
    const parts = name.split(" & ");
    return { name1: parts[0] ?? "", name2: parts[1] ?? "" };
  }
  return { name1: name, name2: "" };
}

function deriveSelectionMode(client: Client): "digital" | "album" | "both" {
  if (client.photoLimit != null && client.albumLimit != null) return "both";
  if (client.albumLimit != null) return "album";
  return "digital";
}

export default function EditForm({ client }: { client: Client }) {
  const [eventType, setEventType] = useState<EventType>(client.eventType);
  const [selectionMode, setSelectionMode] = useState<
    "digital" | "album" | "both"
  >(() => deriveSelectionMode(client));

  const initNames = deriveNames(client.name, client.eventType);
  const [name1, setName1] = useState(initNames.name1);
  const [name2, setName2] = useState(initNames.name2);
  const [deadline, setDeadline] = useState(client.deadline ?? "");
  const [photoLimit, setPhotoLimit] = useState<number | "">(
    client.photoLimit ?? "",
  );
  const [albumLimit, setAlbumLimit] = useState<number | "">(
    client.albumLimit ?? "",
  );
  const [customEventLabel, setCustomEventLabel] = useState(
    client.customEventLabel ?? "",
  );
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(
    client.semanticSearchEnabled ?? false,
  );
  const [language, setLanguage] = useState<EventLanguage>(
    client.language ?? "es",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [indexProgress, setIndexProgress] = useState<string | null>(null);

  const clientName =
    eventType === "wedding"
      ? [name1.trim(), name2.trim()].filter(Boolean).join(" & ")
      : name1.trim();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!clientName) e.name = "El nombre es requerido.";
    if (!deadline) e.deadline = "La fecha límite es requerida.";
    if (eventType === "other" && !customEventLabel.trim())
      e.customEventLabel = "Escribe el nombre del evento.";
    if (selectionMode !== "album") {
      if (!photoLimit || Number(photoLimit) < 1)
        e.photoLimit = "Ingresa un límite válido.";
    }
    if (selectionMode !== "digital") {
      if (!albumLimit || Number(albumLimit) < 1)
        e.albumLimit = "Ingresa un límite válido.";
      if (
        selectionMode === "both" &&
        albumLimit !== "" &&
        photoLimit !== "" &&
        Number(albumLimit) >= Number(photoLimit)
      )
        e.albumLimit = `Debe ser menor que ${photoLimit} (fotos digitales).`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await updateStoredProduct(client.slug, {
        name: clientName,
        eventType,
        deadline: deadline || null,
        photoLimit: selectionMode !== "album" ? Number(photoLimit) : null,
        albumLimit: selectionMode !== "digital" ? Number(albumLimit) : null,
        customEventLabel:
          eventType === "other" ? customEventLabel.trim() : null,
        semanticSearchEnabled,
        language,
      });
    } catch (err) {
      setSubmitting(false);
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : "Error al guardar. Intenta de nuevo.",
      });
      return;
    }

    // Index only when search was just turned on, so ordinary edits never
    // wait on it. A partial run can be resumed from the event page.
    if (semanticSearchEnabled && !client.semanticSearchEnabled) {
      await indexEventPhotos(client.slug, (done, total, waiting) =>
        setIndexProgress(
          waiting
            ? `Esperando límite del servicio (${done} de ${total})...`
            : `Indexando fotos ${done} de ${total}...`,
        ),
      );
    }

    window.location.href = `/events/${client.slug}`;
  }

  return (
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
        {eventType === "other" && (
          <div className="mt-3">
            <input
              type="text"
              value={customEventLabel}
              onChange={(e) => setCustomEventLabel(e.target.value)}
              placeholder="Ej: El bautizo, La graduación..."
              className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
            />
            {errors.customEventLabel && (
              <p className="mt-1.5 text-xs text-rose-400">
                {errors.customEventLabel}
              </p>
            )}
          </div>
        )}
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

      {/* Selection mode */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          Tipo de selección
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "digital", label: "Solo digital" },
              { value: "album", label: "Solo álbum" },
              { value: "both", label: "Digital + álbum" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectionMode(opt.value)}
              className={`text-xs tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                selectionMode === opt.value
                  ? "border-white/40 bg-white/10 text-white"
                  : "border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
          Fecha límite
        </p>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-white/30 scheme-dark"
        />
        {errors.deadline && (
          <p className="mt-1.5 text-xs text-rose-400">{errors.deadline}</p>
        )}
      </div>

      {/* Photo limit */}
      {selectionMode !== "album" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Límite de fotos digitales
          </p>
          <input
            type="number"
            min={1}
            value={photoLimit}
            onChange={(e) =>
              setPhotoLimit(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-28 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-white/30 tabular-nums"
          />
          {errors.photoLimit && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.photoLimit}</p>
          )}
        </div>
      )}

      {/* Album limit */}
      {selectionMode !== "digital" && (
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Límite de fotos de álbum
          </p>
          <input
            type="number"
            min={1}
            value={albumLimit}
            onChange={(e) =>
              setAlbumLimit(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-28 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-white/30 tabular-nums"
          />
          {selectionMode === "both" && photoLimit !== "" && (
            <p className="mt-1.5 text-xs text-neutral-600">
              Debe ser menor que {photoLimit}
            </p>
          )}
          {errors.albumLimit && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.albumLimit}</p>
          )}
        </div>
      )}

      <SemanticSearchToggle
        enabled={semanticSearchEnabled}
        onChange={setSemanticSearchEnabled}
      />

      <EventLanguagePicker value={language} onChange={setLanguage} />

      {/* Form error */}
      {errors.form && <p className="text-xs text-rose-400">{errors.form}</p>}

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
          {indexProgress ?? (submitting ? "Guardando..." : "Guardar cambios")}
        </button>
        <a
          href={`/events/${client.slug}`}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
