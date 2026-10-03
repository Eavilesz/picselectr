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
          <p
            aria-live="polite"
            className={`h-4 mb-2 text-center text-[10px] tracking-[0.25em] uppercase ${
              finalizeError || saveStatus === "error"
                ? "text-amber-500/80"
                : "text-white/40"
            }`}
          >
            {status}
          </p>
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
