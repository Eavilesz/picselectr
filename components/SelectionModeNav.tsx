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
      activeText: "text-white",
      activeLine: "bg-white",
    },
    {
      id: "album" as SelectionMode,
      label: "Álbum",
      activeText: "text-rose-300",
      activeLine: "bg-rose-300",
    },
    {
      id: "cover" as SelectionMode,
      label: "Portada",
      activeText: "text-amber-400",
      activeLine: "bg-amber-400",
    },
  ];

  return (
    <div className="border-b border-white/10">
      <div className="flex">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          const { selected, total } = counts[mode.id];

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex-1 px-4 pt-5 pb-4 relative transition-all duration-200 ${
                isActive ? mode.activeText : "text-white/25 hover:text-white/50"
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] tracking-[0.2em] uppercase font-medium">
                  {mode.label}
                </span>
                <span
                  className={`text-2xl font-light tabular-nums leading-none ${
                    isActive ? "" : "text-white/25"
                  }`}
                >
                  {selected}
                  <span className="text-xs font-normal opacity-50 ml-0.5">
                    /{total}
                  </span>
                </span>
              </div>
              {isActive && (
                <div
                  className={`absolute bottom-0 left-6 right-6 h-px ${mode.activeLine}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
