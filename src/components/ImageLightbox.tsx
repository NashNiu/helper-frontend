import { useEffect, useRef } from 'react';

interface Props {
  sources: string[];
  index: number | null; // null = 关闭
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * 通用图片预览弹窗：全屏遮罩 + 上一张/下一张/关闭，支持 Esc 关闭、左右方向键切换、打开时锁定 body 滚动。
 * 受控组件：由父级持有当前索引(index),null 表示关闭。
 */
export default function ImageLightbox({ sources, index, onClose, onNavigate }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const safeIndex =
    index !== null && sources.length > 0 ? Math.min(Math.max(index, 0), sources.length - 1) : null;
  const isOpen = safeIndex !== null;

  // 键盘可达性：Esc 关闭，左右切换。打开时锁定 body 滚动并将焦点放到对话框。
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNavigate(Math.max(0, (safeIndex ?? 0) - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNavigate(Math.min(sources.length - 1, (safeIndex ?? 0) + 1));
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, safeIndex, sources.length, onClose, onNavigate]);

  if (safeIndex === null) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center focus:outline-none"
      onClick={onClose}
    >
      <button
        aria-label="上一张"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(Math.max(0, safeIndex - 1));
        }}
        disabled={safeIndex === 0}
      >
        ‹
      </button>
      <img
        src={sources[safeIndex]}
        alt=""
        className="max-h-[85vh] max-w-[85vw] rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        aria-label="下一张"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl px-2 hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(Math.min(sources.length - 1, safeIndex + 1));
        }}
        disabled={safeIndex === sources.length - 1}
      >
        ›
      </button>
      <button
        aria-label="关闭预览"
        className="absolute top-4 right-4 text-white text-xl px-2 hover:opacity-80"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
