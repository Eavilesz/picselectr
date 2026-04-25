import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getStoredProducts, getSelections } from "../store";
import { EVENT_LABELS } from "../types";
import { CopyButton } from "./CopyButton";
import { getPhotosByIds } from "@/lib/r2";

function formatDeadline(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ProgressBar({
  label,
  selected,
  total,
}: {
  label: string;
  selected: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((selected / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-neutral-400 tracking-wide">{label}</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {selected}/{total}
        </span>
      </div>
      <div className="h-px bg-white/10 overflow-hidden">
        <div
          className="h-full bg-white transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [products, selections] = await Promise.all([
    getStoredProducts(),
    getSelections(slug),
  ]);
  const client = products.find((c) => c.slug === slug);
  if (!client) notFound();

  // Fetch photos for each selection tier (only what was selected)
  const allSelectedIds = [
    ...new Set([
      ...selections.digital,
      ...selections.album,
      ...selections.cover,
    ]),
  ];
  const selectedPhotos = await getPhotosByIds(allSelectedIds);
  const photoMap = new Map(selectedPhotos.map((p) => [p.id, p]));

  const clientPath = `/select/${client.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
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
          {client.name}
        </span>
      </div>

      {/* Page title row */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            {client.name} · {EVENT_LABELS[client.eventType]}
          </p>
          <h1 className="text-2xl font-medium text-white">Evento</h1>
        </div>
        <a
          href={clientPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-white/20 text-neutral-300 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-white hover:text-neutral-900 transition-all"
        >
          Ver sitio
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Info card */}
        <div className="md:col-span-2 bg-neutral-900 border border-white/10 p-6 space-y-5">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
            Información
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Nombre
              </p>
              <p className="text-neutral-200">{client.name}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Tipo de evento
              </p>
              <p className="text-neutral-200">
                {EVENT_LABELS[client.eventType]}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Fecha límite
              </p>
              <p className="text-neutral-200">
                {formatDeadline(client.deadline)}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Fotos digitales
              </p>
              <p className="text-neutral-200">{client.photoLimit ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                Fotos de álbum
              </p>
              <p className="text-neutral-200">{client.albumLimit ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-1">
                PIN de acceso
              </p>
              <p className="text-neutral-200 tabular-nums tracking-widest">
                {client.pin ?? "—"}
              </p>
            </div>
          </div>

          {/* Client URL */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 mb-2">
              Enlace del cliente
            </p>
            <div className="flex items-center gap-3">
              <code className="text-xs text-neutral-400 bg-white/5 border border-white/10 px-3 py-2 flex-1 truncate font-mono">
                {clientPath}
              </code>
              <CopyButton value={clientPath} />
            </div>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-neutral-900 border border-white/10 p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-5">
            Progreso
          </p>
          <div className="space-y-5">
            {client.photoLimit != null && (
              <ProgressBar
                label="Fotos seleccionadas"
                selected={selections.digital.length}
                total={client.photoLimit}
              />
            )}
            {client.albumLimit != null && (
              <>
                <ProgressBar
                  label="Álbum"
                  selected={selections.album.length}
                  total={client.albumLimit}
                />
                <ProgressBar
                  label="Portada"
                  selected={selections.cover.length}
                  total={2}
                />
              </>
            )}
            {client.photoLimit == null && client.albumLimit == null && (
              <p className="text-xs text-neutral-600 italic">
                Sin límites configurados
              </p>
            )}
          </div>
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="inline-flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  client.isReady ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span
                className={`text-xs ${
                  client.isReady ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {client.isReady ? "Listo" : "En progreso"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Selected photos section */}
      {allSelectedIds.length > 0 && (
        <div className="mt-5 space-y-5">
          {(
            [
              {
                key: "digital" as const,
                label: "Digital",
                ids: selections.digital,
                dot: "bg-neutral-400",
              },
              {
                key: "album" as const,
                label: "Álbum",
                ids: selections.album,
                dot: "bg-slate-400",
              },
              {
                key: "cover" as const,
                label: "Portada",
                ids: selections.cover,
                dot: "bg-amber-600",
              },
            ] as const
          )
            .filter(({ ids }) => ids.length > 0)
            .map(({ label, ids, dot }) => (
              <div
                key={label}
                className="bg-neutral-900 border border-white/10 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
                    {label}
                  </p>
                  <span className="text-[10px] text-neutral-600 tabular-nums ml-auto">
                    {ids.length} foto{ids.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {ids.map((id) => {
                    const photo = photoMap.get(id);
                    if (!photo) return null;
                    const displayName = photo.name ?? id.slice(0, 8);
                    return (
                      <div key={id} className="flex flex-col gap-1.5">
                        <div className="relative aspect-square overflow-hidden bg-neutral-800">
                          <Image
                            src={photo.thumbnailUrl}
                            alt={displayName}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        </div>
                        <p
                          className="text-[10px] text-neutral-500 truncate leading-tight"
                          title={displayName}
                        >
                          {displayName}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
