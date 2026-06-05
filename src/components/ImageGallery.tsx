import { useState, useCallback } from 'react';
import type { TodoImage } from '../api/todo';
import { useConfirm } from '../hooks/useConfirm';
import ImageLightbox from './ImageLightbox';

interface Props {
  images: TodoImage[];
  onDelete?: (imageId: number) => void;
}

export default function ImageGallery({ images, onDelete }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  const { confirm, dialog } = useConfirm();
  const close = useCallback(() => setLightboxIndex(null), []);

  const handleDelete = useCallback(
    async (imageId: number) => {
      if (!onDelete) return;
      if (!(await confirm('确认删除这张图片？此操作不可撤销。'))) return;
      onDelete(imageId);
    },
    [onDelete, confirm]
  );

  if (images.length === 0) return null;

  return (
    <>
      {dialog}
      <div className="flex flex-wrap gap-2 mt-2">
        {sorted.map((img, i) => (
          <div key={img.id} className="relative group">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="block"
              aria-label={`查看第 ${i + 1} 张图片`}
            >
              <img
                src={img.image_path}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border hover:opacity-90"
              />
            </button>
            {onDelete && (
              <button
                onClick={() => handleDelete(img.id)}
                aria-label={`删除第 ${i + 1} 张图片`}
                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white rounded-full w-3.5 h-3.5 hidden group-hover:flex items-center justify-center focus:flex"
              >
                <svg
                  viewBox="0 0 10 10"
                  className="w-2 h-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <ImageLightbox
        sources={sorted.map((img) => img.image_path)}
        index={lightboxIndex}
        onClose={close}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
