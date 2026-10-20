interface SelectionButtonProps {
  selectedCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  canFinalize: boolean;
  isFinalizing?: boolean;
  isFinalized?: boolean;
  finalizeError?: boolean;
  onFinalize: () => void;
}

export default function SelectionButton({
  selectedCount,
  saveStatus,
  canFinalize,
  isFinalizing = false,
  isFinalized = false,
  finalizeError = false,
  onFinalize,
}: SelectionButtonProps) {
  const disabled = !canFinalize || isFinalizing || isFinalized;

  let label: string;
  if (isFinalizing) {
    label = "Finalizando…";
  } else if (isFinalized) {
    label = "Selección finalizada ✓";
  } else if (selectedCount > 0) {
    label = `Finalizar selección · ${selectedCount}`;
  } else {
    label = "Finalizar selección";
  }

  let status: string | null = null;
  if (finalizeError) {
    status = "No se pudo finalizar. Inténtalo de nuevo.";
  } else if (saveStatus === "saving") {
    status = "Guardando…";
  } else if (saveStatus === "saved") {
    status = "Cambios guardados ✓";
  } else if (saveStatus === "error") {
    status = "No se pudo guardar. Reintentando…";
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-10 pb-8 px-6">
        <div className="max-w-sm mx-auto">
          <div
            aria-live="polite"
            className={`h-7 mb-2 flex items-center justify-center text-[11px] tracking-[0.25em] uppercase ${
              finalizeError || saveStatus === "error"
                ? "text-amber-500/80"
                : "text-white/40"
            }`}
          >
            {!finalizeError && saveStatus === "saving" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.35)]">
                <svg
                  className="w-3 h-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                {status}
              </span>
            ) : (
              status
            )}
          </div>
          <button
            onClick={onFinalize}
            disabled={disabled}
            className="w-full border border-white/60 text-white py-4 text-xs tracking-[0.3em] uppercase font-medium disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all duration-300"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
