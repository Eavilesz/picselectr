"use client";

// Per-event opt-in for semantic photo search (new + edit event forms)
export default function SemanticSearchToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-3">
        Búsqueda inteligente
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className="flex items-center gap-3 group"
      >
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 border transition-colors ${
            enabled
              ? "border-white/40 bg-white/20"
              : "border-white/10 bg-white/5 group-hover:border-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${
              enabled ? "left-[18px] bg-white" : "left-0.5 bg-neutral-500"
            }`}
          />
        </span>
        <span
          className={`text-xs tracking-[0.15em] uppercase ${
            enabled ? "text-white" : "text-neutral-500"
          }`}
        >
          {enabled ? "Activada" : "Desactivada"}
        </span>
      </button>
      <p className="mt-1.5 text-xs text-neutral-600">
        Permite buscar fotos describiéndolas (ej. &ldquo;la novia
        bailando&rdquo;) en la página de selección.
      </p>
    </div>
  );
}
