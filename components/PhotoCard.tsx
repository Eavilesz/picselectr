import Image from "next/image";

export type SelectionMode = "digital" | "album" | "cover";

interface Photo {
  id: number;
  url: string;
  alt: string;
}

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  selectionType?: "digital" | "album" | "cover" | null;
  currentMode: SelectionMode;
  onToggle: () => void;
  onPreview: () => void;
}

export default function PhotoCard({
  photo,
  isSelected,
  selectionType,
  currentMode,
  onToggle,
  onPreview,
}: PhotoCardProps) {
  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  // Color configuration for each mode
  const modeColors = {
    digital: { heart: "text-white", ring: "ring-white" },
    album: { heart: "text-rose-300", ring: "ring-rose-300" },
    cover: { heart: "text-amber-400", ring: "ring-amber-400" },
  };

  const currentColor = modeColors[currentMode];

  // Display color based on highest selection level
  const displayColor = selectionType ? modeColors[selectionType] : currentColor;

  return (
    <div className="relative aspect-square overflow-hidden group">
      {/* Image - Clickable for preview */}
      <button
        onClick={onPreview}
        className={`absolute inset-0 w-full h-full focus:outline-none focus:ring-2 ${displayColor.ring} focus:ring-offset-2 focus:ring-offset-black`}
      >
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </button>

      {/* Selection border overlay */}
      {selectionType && (
        <div
          className={`absolute inset-0 pointer-events-none ring-2 ring-inset ${
            selectionType === "cover"
              ? "ring-amber-400"
              : selectionType === "album"
                ? "ring-rose-300"
                : "ring-white/70"
          }`}
        />
      )}

      {/* Gradient vignette for heart legibility */}
      <div className="absolute top-0 left-0 w-14 h-14 bg-linear-to-br from-black/50 to-transparent pointer-events-none z-10" />

      {/* Heart Icon - Separate clickable area */}
      <button
        onClick={handleHeartClick}
        className="absolute top-1.5 left-1.5 z-20 p-1.5 focus:outline-none hover:scale-110 transition-transform"
        aria-label={isSelected ? "Deseleccionar foto" : "Seleccionar foto"}
      >
        {isSelected ? (
          <svg
            className={`w-5 h-5 md:w-6 md:h-6 ${currentColor.heart} drop-shadow-md`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 md:w-6 md:h-6 text-white/50 drop-shadow-md"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
    </div>
  );
}
