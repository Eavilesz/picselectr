import Link from "next/link";
import { mockClients } from "./mock-data";
import { EVENT_LABELS, PRODUCT_LABELS, ProductType } from "./types";
import { CopyButton } from "./products/[slug]/CopyButton";

const PRODUCT_COLORS: Record<ProductType, string> = {
  digital: "bg-white/10 text-neutral-300",
  album: "bg-rose-900/30 text-rose-300",
};

function formatDeadline(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const ready = mockClients.filter((c) => c.isReady).length;
  const inProgress = mockClients.length - ready;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Panel de administración
          </p>
          <h1 className="text-2xl font-medium text-white">Productos</h1>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 bg-white text-neutral-900 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-neutral-200 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo producto
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total", value: mockClients.length },
          { label: "En progreso", value: inProgress },
          { label: "Listos", value: ready },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-neutral-900 border border-white/10 px-5 py-4"
          >
            <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-light text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-neutral-900 border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
                Cliente
              </th>
              <th className="px-5 py-3" />
              <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
                Evento
              </th>
              <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
                Límite
              </th>
              <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
                Productos
              </th>
              <th className="text-left px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-500 font-medium">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mockClients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-white/5 transition-colors group"
              >
                {/* Name + copy URL button */}
                <td className="px-5 py-4">
                  <p className="font-medium text-white">{client.name}</p>
                  <div className="mt-1.5">
                    <CopyButton
                      value={`/select/${client.slug}`}
                      label="Copiar enlace"
                      compact
                    />
                  </div>
                </td>
                {/* Ver button */}
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/products/${client.slug}`}
                    className="text-xs text-neutral-500 group-hover:text-white transition-colors"
                  >
                    Ver →
                  </Link>
                </td>

                {/* Event type */}
                <td className="px-5 py-4 text-neutral-400">
                  {EVENT_LABELS[client.eventType]}
                </td>

                {/* Deadline */}
                <td className="px-5 py-4 text-neutral-400 tabular-nums">
                  {formatDeadline(client.deadline)}
                </td>

                {/* Products */}
                <td className="px-5 py-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {client.products.map((p) => (
                      <span
                        key={p.type}
                        className={`text-[10px] tracking-widest uppercase px-2 py-0.5 ${PRODUCT_COLORS[p.type]}`}
                      >
                        {PRODUCT_LABELS[p.type]}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
