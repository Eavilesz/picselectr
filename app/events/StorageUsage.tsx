import { getBucketUsage } from "@/lib/r2";

const BUCKET_LIMIT_GB = 10; // Cloudflare R2 free tier

export function StorageUsageSkeleton() {
  return (
    <StorageCard label="Calculando…" percent={0} color="bg-white/20" pulse />
  );
}

export default async function StorageUsage() {
  const { bytes } = await getBucketUsage().catch(() => ({ bytes: 0 }));

  const usedGB = bytes / 1024 ** 3;
  const percent = Math.min((usedGB / BUCKET_LIMIT_GB) * 100, 100);
  const color =
    percent >= 90
      ? "bg-red-400"
      : percent >= 70
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <StorageCard
      label={`${usedGB.toFixed(2)} GB de ${BUCKET_LIMIT_GB} GB`}
      percent={percent}
      color={color}
    />
  );
}

function StorageCard({
  label,
  percent,
  color,
  pulse = false,
}: {
  label: string;
  percent: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="bg-neutral-900 border border-white/10 px-5 py-4 mb-8">
      <div className="flex items-end justify-between mb-2">
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
          Almacenamiento
        </p>
        <p className="text-xs text-neutral-400 tabular-nums">{label}</p>
      </div>
      <div className="h-1.5 w-full bg-white/10 overflow-hidden">
        <div
          className={`h-full ${color} transition-all ${pulse ? "animate-pulse w-full" : ""}`}
          style={pulse ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
