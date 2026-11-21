"use client";

import { useState, useTransition } from "react";
import { verifyEventPin } from "@/app/events/store";
import { useT } from "@/components/I18nProvider";

// PIN form for /select. The page only renders this when the visitor has no
// access cookie, and sends no photos with it: the PIN is enforced on the
// server. A correct PIN sets the cookie in the server action, which
// re-renders the page with the selection view.
export default function PinGate({ slug }: { slug: string }) {
  const t = useT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  // The server decides when to lock (see lib/pin-attempts.ts)
  const [blocked, setBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;

    startTransition(async () => {
      const result = await verifyEventPin(slug, pin);
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <p className="text-[10px] tracking-[0.35em] text-white/35 uppercase mb-8">
        {t.pin.protectedAccess}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label
            htmlFor="event-pin"
            className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3"
          >
            {t.pin.label}
          </label>
          <input
            id="event-pin"
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
          {error && (
            <p className="mt-2 text-xs text-rose-400 text-center">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pin.length !== 4 || blocked || isPending}
          className="w-full border border-white/60 text-white py-3 text-xs tracking-[0.3em] uppercase font-medium disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all duration-300"
        >
          {isPending ? t.pin.verifying : t.pin.submit}
        </button>
      </form>
    </div>
  );
}
