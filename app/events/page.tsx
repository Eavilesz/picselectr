import Link from "next/link";
import { getStoredProducts, getStudioName } from "./store";
import { getPhotoCountsBySlug, getBucketUsage } from "@/lib/r2";
import EventsTable from "./EventsTable";

const BUCKET_LIMIT_GB = 10; // Cloudflare R2 free tier

export default async function AdminPage() {
  const [products, photoCounts, studioName, bucketUsage] = await Promise.all([
    getStoredProducts(),
    getPhotoCountsBySlug().catch(() => ({}) as Record<string, number>),
    getStudioName(),
    getBucketUsage().catch(() => ({ bytes: 0, objectCount: 0 })),
  ]);

  const ready = products.filter((c) => c.isReady).length;
  const inProgress = products.length - ready;

  const usedGB = bucketUsage.bytes / 1024 ** 3;
  const usedPercent = Math.min((usedGB / BUCKET_LIMIT_GB) * 100, 100);
  const usageColor =
    usedPercent >= 90
      ? "bg-red-400"
      : usedPercent >= 70
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 mb-1">
            Panel de administración
          </p>
          <h1 className="text-2xl font-medium text-white">Eventos</h1>
          {studioName && (
            <p className="mt-1 text-xs text-neutral-500 tracking-wide">
              {studioName}
            </p>
          )}
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

      {/* Storage usage */}
      <div className="bg-neutral-900 border border-white/10 px-5 py-4 mb-8">
        <div className="flex items-end justify-between mb-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
            Almacenamiento
          </p>
          <p className="text-xs text-neutral-400 tabular-nums">
            {usedGB.toFixed(2)} GB de {BUCKET_LIMIT_GB} GB
          </p>
        </div>
        <div className="h-1.5 w-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${usageColor} transition-all`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      <EventsTable products={products} photoCounts={photoCounts} />
    </div>
  );
}
