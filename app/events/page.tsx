import Link from "next/link";
import { getStoredProducts } from "./store";
import { getPhotoCountsBySlug } from "@/lib/cloudinary";
import EventsTable from "./EventsTable";

export default async function AdminPage() {
  const [products, photoCounts] = await Promise.all([
    getStoredProducts(),
    getPhotoCountsBySlug().catch(() => ({}) as Record<string, number>),
  ]);

  const ready = products.filter((c) => c.isReady).length;
  const inProgress = products.length - ready;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Panel de administración
          </p>
          <h1 className="text-2xl font-medium text-white">Eventos</h1>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 bg-neutral-700 text-neutral-200 text-xs tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-neutral-600 transition-colors"
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
          Nuevo evento
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total", value: products.length },
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

      <EventsTable products={products} photoCounts={photoCounts} />
    </div>
  );
}
