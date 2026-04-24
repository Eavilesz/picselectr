"use client";

import { useSyncExternalStore, useState, useTransition } from "react";
import { verifyEventPin } from "@/app/events/store";

const SESSION_KEY = (slug: string) => `pin_verified_${slug}`;
const PIN_EVENT = "picselectr:pin-verified";
const MAX_ATTEMPTS = 5;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(PIN_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PIN_EVENT, callback);
  };
}

export default function PinGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const verified = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(SESSION_KEY(slug)) === "1",
    () => false,
  );
  // false on the server, true on the client — prevents PIN gate flash for authenticated users
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (attempts >= MAX_ATTEMPTS) return;

    startTransition(async () => {
      const ok = await verifyEventPin(slug, pin);
      if (ok) {
        localStorage.setItem(SESSION_KEY(slug), "1");
        window.dispatchEvent(new Event(PIN_EVENT));
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin("");
        setError(
          next >= MAX_ATTEMPTS
            ? "Demasiados intentos. Contacta al fotógrafo."
            : "PIN incorrecto. Intenta de nuevo.",
        );
      }
    });
  }

  if (!mounted) return null;
  if (verified) return <>{children}</>;

  const blocked = attempts >= MAX_ATTEMPTS;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <p className="text-[10px] tracking-[0.35em] text-white/35 uppercase mb-8">
        Acceso protegido
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
            PIN de acceso
          </label>
          <input
            type="text"
            inputMode="numeric"
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
          {isPending ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
