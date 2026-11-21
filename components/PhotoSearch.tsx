"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventType } from "@/app/events/types";
import { useT } from "@/components/I18nProvider";

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
  const t = useT();
  const router = useRouter();
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

      // Access expired or the PIN changed: re-rendering the page on the
      // server shows the PIN form again
      if (res.status === 401 && body?.code === "pin_required") {
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(body?.error ?? t.search.failed);

      onResults(
        q,
        (body.results as { id: string }[]).map((r) => r.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.search.failed);
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
            placeholder={t.search.placeholder(t.search.examples[eventType])}
            className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="border border-white/30 text-white text-xs tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white"
        >
          {loading ? t.search.searching : t.search.submit}
        </button>
      </form>

      {!activeQuery && !error && (
        <p className="mt-2 text-xs text-white/30">{t.search.hint}</p>
      )}
      {activeQuery && (
        <p className="mt-2 text-xs text-white/40">
          {t.search.resultsFor} &ldquo;{activeQuery}&rdquo; ·{" "}
          <button
            type="button"
            onClick={handleClear}
            className="underline underline-offset-2 hover:text-white/70"
          >
            {t.search.showAll}
          </button>
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
