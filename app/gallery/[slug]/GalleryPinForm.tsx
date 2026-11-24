"use client";

import { useState, useTransition } from "react";
import { unlockGallery } from "./actions";
import { getMessages } from "@/lib/i18n";
import StudioName from "@/components/StudioName";

// Delivery galleries aren't translated yet
const t = getMessages("es");

export default function GalleryPinForm({
  slug,
  title,
  studioName,
}: {
  slug: string;
  title: string;
  studioName: string | null;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  // The server decides when to lock (see lib/pin-attempts.ts)
  const [blocked, setBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;
    startTransition(async () => {
      const { result } = await unlockGallery(slug, pin);
      // On success the server re-renders this route with the gallery
      if (result === "ok") return;
      setPin("");
      if (result === "locked") {
        setBlocked(true);
        setError(t.pin.locked);
      } else {
        setError(t.pin.wrong);
      }
    });
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      {studioName && (
        <StudioName
          name={studioName}
          className="text-xs tracking-[0.3em] text-white/60 uppercase font-medium mb-6"
        />
      )}
      <h1 className="text-4xl md:text-5xl font-serif text-white leading-tight max-w-xl">
        {title}
      </h1>
      <div className="mt-6 mb-10 w-12 h-px bg-white/20" />

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label
            htmlFor="gallery-pin"
            className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3"
          >
            PIN de acceso
          </label>
          <input
            id="gallery-pin"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            disabled={blocked || isPending}
            autoFocus
            placeholder="• • • •"
            className="w-full bg-white/5 border border-white/10 px-4 py-3 text-center text-lg text-white tracking-[0.5em] placeholder:text-neutral-700 focus:outline-none focus:border-white/30 disabled:opacity-40"
          />
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={pin.length !== 4 || blocked || isPending}
          className="w-full border border-white/60 text-white py-3 text-xs tracking-[0.3em] uppercase font-medium disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all duration-300"
        >
          {isPending ? "Verificando..." : "Ver galería"}
        </button>
      </form>
    </div>
  );
}
