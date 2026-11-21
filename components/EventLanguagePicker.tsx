"use client";

import { EVENT_LANGUAGES, type EventLanguage } from "@/app/events/types";

// Language of the client's pages (new + edit event forms)
export default function EventLanguagePicker({
  value,
  onChange,
}: {
  value: EventLanguage;
  onChange: (language: EventLanguage) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
        Idioma para el cliente
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {EVENT_LANGUAGES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`text-xs tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
              value === opt.value
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-neutral-600">
        El PIN, la página de selección y la búsqueda se muestran en este idioma.
        Tu panel sigue en español.
      </p>
    </div>
  );
}
