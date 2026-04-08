export type SelectionMode = "digital" | "album" | "cover";

interface SelectionModeNavProps {
  currentMode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  counts: {
    digital: { selected: number; total: number };
    album: { selected: number; total: number };
    cover: { selected: number; total: number };
  };
}

export default function SelectionModeNav({
  currentMode,
  onModeChange,
  counts,
}: SelectionModeNavProps) {
  const modes = [
    {
      id: "digital" as SelectionMode,
      label: "Digital",
      color: "bg-gray-400",
      textColor: "text-gray-400",
      activeRing: "ring-gray-400",
    },
    {
      id: "album" as SelectionMode,
      label: "Album",
      color: "bg-slate-500",
      textColor: "text-slate-400",
      activeRing: "ring-slate-500",
    },
    {
      id: "cover" as SelectionMode,
      label: "Cover",
      color: "bg-amber-700",
      textColor: "text-amber-600",
      activeRing: "ring-amber-700",
    },
  ];

  return (
    <div className="px-6 py-4 border-b border-gray-800">
      <div className="grid grid-cols-3 gap-3">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          const { selected, total } = counts[mode.id];

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`px-3 py-3 transition-all ${
                isActive
                  ? `${mode.color} text-black ring-2 ${mode.activeRing}`
                  : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`font-medium text-sm md:text-base ${isActive ? "text-black" : mode.textColor}`}
                >
                  {mode.label}
                </div>
                <div
                  className={`text-base md:text-lg font-bold ${
                    isActive ? "text-black" : mode.textColor
                  }`}
                >
                  {selected}/{total}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
