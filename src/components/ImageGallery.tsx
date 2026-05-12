import { useState } from 'react';
import { TodoImage } from '../api/todo';

interface Props {
  images: TodoImage[];
  onDelete?: (imageId: number) => void;
}

export default function ImageGallery({ images, onDelete }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {sorted.map((img, i) => (
          <div key={img.id} className="relative group">
            <img
              src={`/uploads/${img.image_path}`}
              alt=""
              className="w-16 h-16 object-cover rounded-lg cursor-pointer border hover:opacity-90"
              onClick={() => setLightboxIndex(i)}
            />
            {onDelete && (
              <button
                onClick={() => onDelete(img.id)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs hidden group-hover:flex items-center justify-center"
              >×</button>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => Math.max(0, (i ?? 0) - 1)); }}
          >‹</button>
          <img src={`/uploads/${sorted[lightboxIndex].image_path}`} alt="" className="max-h-[85vh] max-w-[85vw] rounded-lg" onClick={e => e.stopPropagation()} />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl"
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => Math.min(sorted.length - 1, (i ?? 0) + 1)); }}
          >›</button>
          <button className="absolute top-4 right-4 text-white text-xl" onClick={() => setLightboxIndex(null)}>✕</button>
        </div>
      )}
    </>
  );
}
