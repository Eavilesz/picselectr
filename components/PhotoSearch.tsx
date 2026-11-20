"use client";

import { useState } from "react";
import { resetPinVerification } from "@/components/PinGate";
import type { EventType } from "@/app/events/types";

// Example query per event type. They follow the pattern that searched best
// in scripts/eval-search.mjs: who appears + who they're with / what they do.
// Vague groups ("los invitados") and places scored worst.
const SEARCH_EXAMPLES: Record<EventType, string> = {
  wedding: "la novia con su papá",
  quinceañera: "la quinceañera con sus padres",
  birthday: "soplando las velas",
  photobooth: "sonriendo con la familia",
  other: "con la familia",
};

export function searchExample(eventType: EventType): string {
  return SEARCH_EXAMPLES[eventType] ?? SEARCH_EXAMPLES.other;
}

// Semantic search box for the /select page. Reports the matching photo ids
// (best first) to the parent, which narrows its own grid; null = no search.
export default function PhotoSearch({
  slug,
  eventType,
  activeQuery,
  onResults,
}: {
  slug: string;
  eventType: EventType;
  activeQuery: string | null;
  onResults: (query: string | null, ids: string[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401 && body?.code === "pin_required") {
        resetPinVerification(slug);
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? "No se pudo buscar");

      onResults(
        q,
        (body.results as { id: string }[]).map((r) => r.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setError(null);
    onResults(null, null);
  }

  return (
    <div className="px-6 pb-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xl">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            placeholder={`Busca una foto, ej. “${searchExample(eventType)}”`}
            className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="border border-white/30 text-white text-xs tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {!activeQuery && !error && (
        <p className="mt-2 text-xs text-white/30">
          Describe quién aparece y qué está haciendo.
        </p>
      )}
      {activeQuery && (
        <p className="mt-2 text-xs text-white/40">
          Resultados para &ldquo;{activeQuery}&rdquo; ·{" "}
          <button
            type="button"
            onClick={handleClear}
            className="underline underline-offset-2 hover:text-white/70"
          >
            Ver todas
          </button>
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
