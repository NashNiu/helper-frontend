import { useState, useEffect, useCallback, useRef } from 'react';
import type { TodoImage } from '../api/todo';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  images: TodoImage[];
  onDelete?: (imageId: number) => void;
}

export default function ImageGallery({ images, onDelete }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isOpen = lightboxIndex !== null;
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const safeIndex = lightboxIndex !== null
    ? Math.min(lightboxIndex, sorted.length - 1)
    : null;

  const { confirm, dialog } = useConfirm();
  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1)), []);
  const next = useCallback(() => {
    setLightboxIndex(i => Math.min(sorted.length - 1, (i ?? 0) + 1));
  }, [sorted.length]);

  // 键盘可达性：Esc 关闭，左右切换。打开时锁定 body 滚动并将焦点放到对话框。
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, prev, next]);

  const handleDelete = useCallback(async (imageId: number) => {
    if (!onDelete) return;
    if (!await confirm('确认删除这张图片？此操作不可撤销。')) return;
    onDelete(imageId);
  }, [onDelete, confirm]);

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
                src={`/uploads/${img.image_path}`}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border hover:opacity-90"
              />
            </button>
            {onDelete && (
              <button
                onClick={() => handleDelete(img.id)}
                aria-label={`删除第 ${i + 1} 张图片`}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs hidden group-hover:flex items-center justify-center focus:flex"
              >×</button>
            )}
          </div>
        ))}
      </div>

      {safeIndex !== null && safeIndex >= 0 && sorted.length > 0 && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center focus:outline-none"
          onClick={close}
        >
          <button
            aria-label="上一张"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 hover:opacity-80"
            onClick={e => { e.stopPropagation(); prev(); }}
            disabled={safeIndex === 0}
          >‹</button>
          <img
            src={`/uploads/${sorted[safeIndex].image_path}`}
            alt=""
            className="max-h-[85vh] max-w-[85vw] rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            aria-label="下一张"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 hover:opacity-80"
            onClick={e => { e.stopPropagation(); next(); }}
            disabled={safeIndex === sorted.length - 1}
          >›</button>
          <button
            aria-label="关闭预览"
            className="absolute top-4 right-4 text-white text-xl px-2 hover:opacity-80"
            onClick={close}
          >✕</button>
        </div>
      )}
    </>
  );
}
