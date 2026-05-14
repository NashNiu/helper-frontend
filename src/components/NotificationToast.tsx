import { useEffect } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
      <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-auto text-white/70 hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
    </div>
  );
}
