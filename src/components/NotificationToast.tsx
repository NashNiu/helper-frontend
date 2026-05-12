import { useEffect } from 'react';

interface Props {
  message: string;
  onClose: () => void;
}

export default function NotificationToast({ message, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
      <span className="text-xl">⏰</span>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto text-white/70 hover:text-white">✕</button>
    </div>
  );
}
