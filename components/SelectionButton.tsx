interface SelectionButtonProps {
  selectedCount: number;
  onSave: () => void;
}

export default function SelectionButton({
  selectedCount,
  onSave,
}: SelectionButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-10 pb-8 px-6">
        <button
          onClick={onSave}
          disabled={selectedCount === 0}
          className="w-full border border-white/60 text-white py-4 text-xs tracking-[0.3em] uppercase font-medium disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all duration-300"
        >
          {selectedCount > 0
            ? `Guardar selección · ${selectedCount}`
            : "Guardar selección"}
        </button>
      </div>
    </div>
  );
}
