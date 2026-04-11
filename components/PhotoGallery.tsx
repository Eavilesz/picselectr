import PhotoCard, { SelectionMode } from "./PhotoCard";

interface Photo {
  id: number;
  url: string;
  alt: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  selectedPhotos: Set<number>;
  currentMode: SelectionMode;
  getSelectionType: (id: number) => "digital" | "album" | "cover" | null;
  onToggle: (id: number) => void;
  onPreview: (photo: Photo) => void;
}

export default function PhotoGallery({
  photos,
  selectedPhotos,
  currentMode,
  getSelectionType,
  onToggle,
  onPreview,
}: PhotoGalleryProps) {
  return (
    <div>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            selectionType={getSelectionType(photo.id)}
            currentMode={currentMode}
            onToggle={() => onToggle(photo.id)}
            onPreview={() => onPreview(photo)}
          />
        ))}
      </div>
    </div>
  );
}
