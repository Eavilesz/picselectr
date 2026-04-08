interface SelectionButtonProps {
  selectedCount: number;
  onSave: () => void;
}

export default function SelectionButton({
  selectedCount,
  onSave,
}: SelectionButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-black z-40">
      <button
        onClick={onSave}
        disabled={selectedCount === 0}
        className="w-full bg-gray-800 text-white py-4 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
      >
        Save
      </button>
    </div>
  );
}
