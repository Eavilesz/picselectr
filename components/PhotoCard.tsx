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
    digital: { heart: "text-gray-400", ring: "ring-gray-400" },
    album: { heart: "text-slate-400", ring: "ring-slate-500" },
    cover: { heart: "text-amber-600", ring: "ring-amber-700" },
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

      {/* Selection Indicator - Shows highest level selection */}
      {selectionType && (
        <div
          className={`absolute top-1 right-1 w-2 h-2 ${
            selectionType === "cover"
              ? "bg-amber-700"
              : selectionType === "album"
                ? "bg-slate-500"
                : "bg-gray-400"
          }`}
        />
      )}

      {/* Heart Icon - Separate clickable area */}
      <button
        onClick={handleHeartClick}
        className={`absolute top-1 left-1 z-10 p-2 focus:outline-none focus:ring-2 ${displayColor.ring} focus:ring-offset-2 focus:ring-offset-black hover:bg-black/20 transition-colors`}
        aria-label={isSelected ? "Unselect photo" : "Select photo"}
      >
        {isSelected ? (
          <svg
            className={`w-6 h-6 md:w-7 md:h-7 ${currentColor.heart} drop-shadow-sm`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            className={`w-6 h-6 md:w-7 md:h-7 ${currentColor.heart}/80 drop-shadow-sm`}
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
