"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EventType, ProductType } from "../../types";
import { addStoredProduct } from "../../store";

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
  const router = useRouter();

  const [eventType, setEventType] = useState<EventType>("wedding");
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hasDigital, setHasDigital] = useState(true);
  const [hasAlbum, setHasAlbum] = useState(false);
  const [digitalLimit, setDigitalLimit] = useState<number | "">(50);
  const [albumLimit, setAlbumLimit] = useState<number | "">(20);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clientName =
    eventType === "wedding"
      ? [name1.trim(), name2.trim()].filter(Boolean).join(" & ")
      : name1.trim();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!clientName) e.name = "El nombre es requerido.";
    if (!deadline) e.deadline = "La fecha límite es requerida.";
    if (!hasDigital && !hasAlbum)
      e.products = "Selecciona al menos un producto.";
    if (hasDigital && (!digitalLimit || Number(digitalLimit) < 1))
      e.digitalLimit = "Ingresa un límite válido.";
    if (hasAlbum && (!albumLimit || Number(albumLimit) < 1))
      e.albumLimit = "Ingresa un límite válido.";
    if (hasAlbum && hasDigital && Number(albumLimit) >= Number(digitalLimit))
      e.albumLimit = `El álbum debe tener menos de ${digitalLimit} fotos.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const products: { type: ProductType; photoLimit: number | null }[] = [];
    if (hasDigital)
      products.push({ type: "digital", photoLimit: Number(digitalLimit) });
    if (hasAlbum)
      products.push({ type: "album", photoLimit: Number(albumLimit) });

    const slug = generateSlug();
    addStoredProduct({
      id: slug,
      slug,
      name: clientName,
      eventType,
      deadline: deadline || null,
      products,
      isReady: false,
      digitalSelected: 0,
      albumSelected: 0,
      coverSelected: 0,
    });

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin"
          className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          ← Productos
        </Link>
        <span className="text-white/15">/</span>
        <span className="text-xs text-neutral-300 font-medium">
          Nuevo producto
        </span>
      </div>

      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
          Admin
        </p>
        <h1 className="text-2xl font-medium text-white">Nuevo paquete</h1>
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

        {/* Products */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            Productos
          </p>
          <div className="space-y-3">
            {/* Digital */}
            <div className="bg-neutral-900 border border-white/10 p-4">
              <label className="flex items-center gap-3 cursor-pointer mb-0">
                <button
                  type="button"
                  onClick={() => setHasDigital(!hasDigital)}
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                    hasDigital ? "border-white bg-white" : "border-white/20"
                  }`}
                >
                  {hasDigital && (
                    <svg
                      className="w-2.5 h-2.5 text-neutral-900"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-neutral-200 font-medium">
                  Digital
                </span>
              </label>
              {hasDigital && (
                <div className="mt-3 pl-7">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-2">
                    Límite de fotos
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={digitalLimit}
                    onChange={(e) =>
                      setDigitalLimit(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-28 bg-white/5 border border-white/10 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-white/30 tabular-nums"
                  />
                  {errors.digitalLimit && (
                    <p className="mt-1.5 text-xs text-rose-400">
                      {errors.digitalLimit}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Album */}
            <div className="bg-neutral-900 border border-white/10 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setHasAlbum(!hasAlbum)}
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                    hasAlbum ? "border-rose-400 bg-rose-400" : "border-white/20"
                  }`}
                >
                  {hasAlbum && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-neutral-200 font-medium">
                  Álbum
                </span>
              </label>
              {hasAlbum && (
                <div className="mt-3 pl-7">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-2">
                    Límite de fotos de álbum
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={albumLimit}
                    onChange={(e) =>
                      setAlbumLimit(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-28 bg-white/5 border border-white/10 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-white/30 tabular-nums"
                  />
                  {hasDigital && digitalLimit !== "" && (
                    <p className="mt-1.5 text-xs text-neutral-600">
                      Debe ser menor que {digitalLimit} (fotos digitales)
                    </p>
                  )}
                  {errors.albumLimit && (
                    <p className="mt-1.5 text-xs text-rose-400">
                      {errors.albumLimit}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {errors.products && (
            <p className="mt-2 text-xs text-rose-400">{errors.products}</p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center gap-4">
          <button
            type="submit"
            className="bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-6 py-3 hover:bg-neutral-600 transition-colors"
          >
            Crear producto
          </button>
          <Link
            href="/admin"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
