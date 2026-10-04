import { getBucketUsage } from "@/lib/r2";

export function StorageUsageSkeleton() {
  return <StorageCard label="Calculando…" pulse />;
}

export default async function StorageUsage() {
  const { bytes } = await getBucketUsage().catch(() => ({ bytes: 0 }));

  const usedGB = bytes / 1024 ** 3;

  return <StorageCard label={`${usedGB.toFixed(2)} GB`} />;
}

function StorageCard({
  label,
  pulse = false,
}: {
  label: string;
  pulse?: boolean;
}) {
  return (
    <div className="w-fit bg-neutral-900 border border-white/10 px-5 py-4 mb-8">
      <div className="flex items-end gap-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
          Almacenamiento
        </p>
        <p
          className={`text-xs text-neutral-400 tabular-nums ${pulse ? "animate-pulse" : ""}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
