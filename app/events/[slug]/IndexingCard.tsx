"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { indexEventPhotos } from "../indexing";

// Semantic search status on the event page: how many photos are indexed,
// plus a button to finish an indexing run that was interrupted (tab closed,
// provider error) or to index photos added later.
export default function IndexingCard({
  slug,
  initialIndexed,
  initialTotal,
}: {
  slug: string;
  initialIndexed: number;
  initialTotal: number;
}) {
  const router = useRouter();
  const [indexed, setIndexed] = useState(initialIndexed);
  const [total, setTotal] = useState(initialTotal);
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pct = total > 0 ? Math.round((indexed / total) * 100) : 0;
  const complete = total > 0 && indexed >= total;

  async function handleIndex() {
    setRunning(true);
    setMessage(null);
    const result = await indexEventPhotos(slug, (done, all, isWaiting) => {
      setIndexed(done);
      setTotal(all);
      setWaiting(isWaiting);
    });
    setRunning(false);
    setWaiting(false);

    if (result.error) setMessage(result.error);
    else if (result.done < result.total)
      setMessage(
        `${result.total - result.done} foto${result.total - result.done !== 1 ? "s" : ""} no se pudieron indexar.`,
      );
    router.refresh();
  }

  return (
    <div className="mt-5 bg-neutral-900 border border-white/10 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500">
          Búsqueda inteligente
        </p>
        {!complete && total > 0 && (
          <button
            type="button"
            onClick={handleIndex}
            disabled={running}
            className="text-xs tracking-[0.15em] uppercase px-4 py-2 border border-white/20 text-neutral-300 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running
              ? waiting
                ? "Esperando límite..."
                : "Indexando..."
              : indexed === 0
                ? "Indexar fotos"
                : "Reanudar indexado"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-neutral-400 tracking-wide">
          {complete ? "Todas las fotos indexadas" : "Fotos indexadas"}
        </span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {indexed}/{total}
        </span>
      </div>
      <div className="h-px bg-white/10 overflow-hidden">
        <div
          className={`h-full transition-all ${complete ? "bg-emerald-500" : "bg-white"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {message && <p className="mt-3 text-xs text-rose-400">{message}</p>}
    </div>
  );
}
