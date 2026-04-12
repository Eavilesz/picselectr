import Link from "next/link";
import { notFound } from "next/navigation";
import { mockClients } from "../../mock-data";
import { EVENT_LABELS, PRODUCT_LABELS, ProductType } from "../../types";
import { CopyButton } from "./CopyButton";

const PRODUCT_COLORS: Record<ProductType, string> = {
  digital: "border-white/15 text-neutral-300",
  album: "border-rose-400/30 text-rose-300",
};

const PRODUCT_BAR_COLORS: Record<ProductType, string> = {
  digital: "bg-white",
  album: "bg-rose-400",
};

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
  type,
}: {
  label: string;
  selected: number;
  total: number;
  type: ProductType;
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
          className={`h-full transition-all ${PRODUCT_BAR_COLORS[type]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const client = mockClients.find((c) => c.slug === params.slug);
  if (!client) notFound();

  const hasAlbum = client.products.some((p) => p.type === "album");
  const albumProduct = client.products.find((p) => p.type === "album");
  const digitalLimit =
    client.products.find((p) => p.type === "digital")?.photoLimit ?? 0;

  const clientPath = `/select/${client.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
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
          {client.name}
        </span>
      </div>

      {/* Page title row */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            {client.name} · {EVENT_LABELS[client.eventType]}
          </p>
          <h1 className="text-2xl font-medium text-white">Producto</h1>
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
                Slug
              </p>
              <p className="font-mono text-neutral-400 text-xs">
                {client.slug}
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

          {/* Products */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
              Productos
            </p>
            <div className="flex gap-2 flex-wrap">
              {client.products.map((p) => (
                <span
                  key={p.type}
                  className={`text-[11px] tracking-widest uppercase px-3 py-1 border ${PRODUCT_COLORS[p.type]}`}
                >
                  {PRODUCT_LABELS[p.type]}
                  {p.photoLimit != null && (
                    <span className="ml-1.5 opacity-40">· {p.photoLimit}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-neutral-900 border border-white/10 p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-5">
            Progreso
          </p>
          <div className="space-y-5">
            <ProgressBar
              label="Fotos digitales"
              selected={client.digitalSelected}
              total={digitalLimit}
              type="digital"
            />
            {hasAlbum && (
              <ProgressBar
                label="Álbum"
                selected={client.albumSelected}
                total={client.digitalSelected}
                type="album"
              />
            )}
            {hasAlbum && albumProduct?.includesCover && (
              <ProgressBar
                label="Portada"
                selected={client.coverSelected}
                total={2}
                type="album"
              />
            )}
          </div>

          {/* Status */}
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
    </div>
  );
}
